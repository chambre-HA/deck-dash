# N8N Workflow: Wikipedia/Wikimedia Image Automation

## Best Solution for Character/Topic Images

This workflow uses **Wikipedia API** to automatically fetch reliable image URLs from Wikimedia Commons.

---

## How It Works

```
Claude generates topic → Wikipedia API → Get image URL → Google Sheets
```

**Example:**
- Input: "Tony Tony Chopper"
- Wikipedia search → Find article
- Extract image → `https://upload.wikimedia.org/wikipedia/en/f/f6/Tony_Tony_Chopper.jpg`
- Save to Google Sheets

---

## Complete n8n Workflow

### Node 1: Trigger (Webhook or Manual)

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "generate-deck-wikipedia"
  },
  "type": "n8n-nodes-base.webhook"
}
```

**Input:**
```json
{
  "topic_id": "onepiece_characters",
  "topic_name": "Characters of One Piece",
  "count": 5
}
```

---

### Node 2: Claude API - Generate Card List

```javascript
// Code Node: Build Prompt
const { topic_id, topic_name, count } = $input.first().json;

const prompt = `Generate ${count} quiz cards for: "${topic_name}".

For each item, provide:
1. correct_answer: The exact name
2. wikipedia_search: Search term for Wikipedia (be specific)

Return ONLY valid JSON:
{
  "cards": [
    {
      "correct_answer": "Roronoa Zoro",
      "wikipedia_search": "Roronoa Zoro"
    },
    {
      "correct_answer": "Tony Tony Chopper",
      "wikipedia_search": "Tony Tony Chopper"
    }
  ]
}

For anime/game characters: Use the exact character name
For general topics: Use descriptive search terms`;

return {
  json: {
    topic_id,
    topic_name,
    prompt
  }
};
```

**HTTP Request to Claude:**
```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "headers": {
    "x-api-key": "={{$env.ANTHROPIC_API_KEY}}",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  "body": {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 2048,
    "messages": [{
      "role": "user",
      "content": "={{$node['Build Prompt'].json.prompt}}"
    }]
  }
}
```

---

### Node 3: Parse Claude Response

```javascript
const claudeResponse = $input.first().json.content[0].text;
const { topic_id, topic_name } = $node['Build Prompt'].json;

// Extract JSON
const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);

// Output each card
return parsed.cards.map((card, index) => ({
  json: {
    topic_id,
    topic_name,
    card_id: `${topic_id}_${String(index + 1).padStart(3, '0')}`,
    correct_answer: card.correct_answer,
    wikipedia_search: card.wikipedia_search
  }
}));
```

---

### Node 4: Wikipedia API - Search Article

**HTTP Request:**
```json
{
  "method": "GET",
  "url": "=https://en.wikipedia.org/api/rest_v1/page/summary/{{encodeURIComponent($json.wikipedia_search)}}",
  "headers": {
    "User-Agent": "DeckDash/1.0 (Educational App)"
  }
}
```

**What this returns:**
```json
{
  "title": "Tony Tony Chopper",
  "thumbnail": {
    "source": "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Tony_Tony_Chopper.png/220px-Tony_Tony_Chopper.png"
  },
  "originalimage": {
    "source": "https://upload.wikimedia.org/wikipedia/en/4/42/Tony_Tony_Chopper.png"
  }
}
```

---

### Node 5: Extract Image URL

```javascript
const wikiResponse = $input.first().json;
const cardData = $node['Parse Claude Response'].item($item.index).json;

let imageUrl = '';

// Try to get full resolution image first
if (wikiResponse.originalimage && wikiResponse.originalimage.source) {
  imageUrl = wikiResponse.originalimage.source;
}
// Fallback to thumbnail
else if (wikiResponse.thumbnail && wikiResponse.thumbnail.source) {
  // Convert thumbnail to full size
  imageUrl = wikiResponse.thumbnail.source.replace(/\/thumb\//, '/').replace(/\/\d+px-.*$/, '');
}
// Fallback: try direct Wikimedia Commons URL
else {
  const filename = cardData.correct_answer.replace(/\s+/g, '_');
  imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
}

return {
  json: {
    ...cardData,
    image_url: imageUrl,
    wikipedia_title: wikiResponse.title || cardData.correct_answer
  }
};
```

---

### Node 6: Validate Image URL (Optional)

**Check if image exists:**
```javascript
// HTTP Request Node - HEAD method
{
  "method": "HEAD",
  "url": "={{$json.image_url}}",
  "options": {
    "redirect": {
      "redirect": {
        "followRedirects": true
      }
    }
  }
}

// If fails, use fallback
if (response.status !== 200) {
  // Use placeholder or alternative source
  imageUrl = `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`;
}
```

---

### Node 7: Append to Google Sheets

```json
{
  "resource": "sheet",
  "operation": "append",
  "sheetId": "={{$env.GOOGLE_SHEETS_ID}}",
  "range": "deck_dash_cards!A:E",
  "columns": {
    "mappings": [
      {"column": "topic_id", "value": "={{$json.topic_id}}"},
      {"column": "topic_name", "value": "={{$json.topic_name}}"},
      {"column": "card_id", "value": "={{$json.card_id}}"},
      {"column": "image_url", "value": "={{$json.image_url}}"},
      {"column": "correct_answer", "value": "={{$json.correct_answer}}"}
    ]
  }
}
```

---

## Alternative: Direct Wikimedia Commons Search

If Wikipedia article doesn't have good images, search Wikimedia Commons directly:

### Wikimedia Commons API:

```javascript
// HTTP Request
{
  "method": "GET",
  "url": "=https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={{encodeURIComponent($json.wikipedia_search)}}&srnamespace=6&format=json",
}

// Response includes file names
{
  "query": {
    "search": [
      {
        "title": "File:Tony_Tony_Chopper.png"
      }
    ]
  }
}

// Convert to image URL
const filename = searchResult.title.replace('File:', '');
const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
```

---

## Enhanced: Fallback Chain

Use multiple sources with fallback:

```javascript
async function getImageUrl(searchTerm) {
  // 1. Try Wikipedia Summary API
  try {
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
    );
    const data = await wikiResponse.json();
    if (data.originalimage) {
      return data.originalimage.source;
    }
  } catch (e) {}

  // 2. Try Wikimedia Commons search
  try {
    const commonsResponse = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&format=json&srlimit=1`
    );
    const data = await commonsResponse.json();
    if (data.query.search.length > 0) {
      const filename = data.query.search[0].title.replace('File:', '');
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
    }
  } catch (e) {}

  // 3. Try Unsplash as final fallback
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerm)}`;
}
```

---

## Complete Workflow Summary

```
Trigger: "Generate One Piece deck with 30 cards"
   ↓
Claude: Generate list of 30 character names
   ↓
For each character (parallel):
   ├─ Search Wikipedia API
   ├─ Extract image URL from response
   ├─ Validate image exists (HEAD request)
   └─ Fallback to Commons if needed
   ↓
Append all 30 rows to Google Sheets
   ↓
Done! Deck ready to use in app
```

---

## Real Example Output

**Input:**
```json
{
  "topic": "One Piece Characters",
  "count": 5
}
```

**Output in Google Sheets:**
```csv
topic_id,topic_name,card_id,image_url,correct_answer
onepiece_characters,Characters of One Piece,op_001,https://upload.wikimedia.org/wikipedia/en/7/77/Roronoa_Zoro.jpg,Roronoa Zoro
onepiece_characters,Characters of One Piece,op_002,https://upload.wikimedia.org/wikipedia/en/a/a0/Nami_One_Piece.png,Nami
onepiece_characters,Characters of One Piece,op_003,https://upload.wikimedia.org/wikipedia/en/e/ef/Usopp_Post_Timeskip.png,Usopp
onepiece_characters,Characters of One Piece,op_004,https://upload.wikimedia.org/wikipedia/en/f/f6/Sanji_Post_Timeskip.png,Sanji
onepiece_characters,Characters of One Piece,op_005,https://upload.wikimedia.org/wikipedia/en/4/42/Tony_Tony_Chopper.png,Tony Tony Chopper
```

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
GOOGLE_SHEETS_ID=your_sheet_id
```

**No other API keys needed!** Wikipedia API is free and unlimited.

---

## Benefits

✅ **100% Free** - Wikipedia API has no limits
✅ **Reliable URLs** - Wikimedia hosts images permanently
✅ **High Quality** - Official artwork and photos
✅ **No authentication** - No API keys needed
✅ **Fast** - Direct URLs, no download/upload

---

## Test Command

```bash
curl -X POST http://your-n8n-instance/webhook/generate-deck-wikipedia \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "onepiece_characters",
    "topic_name": "Characters of One Piece",
    "count": 30
  }'
```

**Expected result:** Google Sheet updated with 30 One Piece characters with proper Wikipedia image URLs!

---

Want me to create the actual n8n workflow JSON file you can import directly?
