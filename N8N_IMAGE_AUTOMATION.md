# N8N Workflow: Automated Image Fetching for Deck Dash

## The Best Solution for AI-Powered Image Sourcing

### Overview

**n8n workflow that:**
1. Takes a topic (e.g., "One Piece Characters")
2. Uses Claude API to generate card list with search terms
3. Automatically fetches images from Unsplash/Pexels
4. Updates Google Sheets with image URLs

---

## Complete n8n Workflow

### Node 1: Manual Trigger or Webhook

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "generate-deck",
    "responseMode": "lastNode"
  },
  "type": "n8n-nodes-base.webhook",
  "name": "Trigger"
}
```

**Input:**
```json
{
  "topic_id": "onepiece_characters",
  "topic_name": "Characters of One Piece",
  "count": 30
}
```

---

### Node 2: Claude API - Generate Card List

```javascript
// Code Node: Build Claude Prompt
const { topic_id, topic_name, count } = $input.first().json;

const prompt = `Generate ${count} quiz cards for the topic: "${topic_name}".

For each item, provide:
1. The correct answer (name of character/object/place)
2. A good image search query for finding a clear photo

Return ONLY valid JSON:
{
  "cards": [
    {
      "correct_answer": "Roronoa Zoro",
      "image_search": "one piece roronoa zoro character official"
    }
  ]
}

Requirements:
- Answers should be well-known, visually distinct items
- Search queries should find high-quality, clear images
- For anime/characters: add "official" or "character design"
- For objects: add descriptive terms like "close up" or "isolated"`;

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
    "max_tokens": 4096,
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

// Extract JSON from response
const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);

// Output each card as separate item for parallel processing
return parsed.cards.map((card, index) => ({
  json: {
    topic_id,
    topic_name,
    card_id: `${topic_id}_${String(index + 1).padStart(3, '0')}`,
    correct_answer: card.correct_answer,
    image_search: card.image_search
  }
}));
```

---

### Node 4: Fetch Image from Unsplash

**Option A: Unsplash API (Best Quality)**

```json
{
  "method": "GET",
  "url": "=https://api.unsplash.com/search/photos?query={{encodeURIComponent($json.image_search)}}&per_page=1&orientation=landscape",
  "headers": {
    "Authorization": "Client-ID {{$env.UNSPLASH_ACCESS_KEY}}"
  }
}
```

**Parse Response:**
```javascript
const unsplashResponse = $input.first().json;
const cardData = $node['Parse Claude Response'].item($item.index).json;

let imageUrl = '';

if (unsplashResponse.results && unsplashResponse.results.length > 0) {
  // Get regular size image
  imageUrl = unsplashResponse.results[0].urls.regular;
} else {
  // Fallback: use Unsplash source URL
  const query = encodeURIComponent(cardData.image_search.replace(/\s+/g, '+'));
  imageUrl = `https://source.unsplash.com/800x600/?${query}`;
}

return {
  json: {
    ...cardData,
    image_url: imageUrl
  }
};
```

**Option B: Pexels API (Free Alternative)**

```json
{
  "method": "GET",
  "url": "=https://api.pexels.com/v1/search?query={{encodeURIComponent($json.image_search)}}&per_page=1&orientation=landscape",
  "headers": {
    "Authorization": "{{$env.PEXELS_API_KEY}}"
  }
}
```

**Parse Response:**
```javascript
const pexelsResponse = $input.first().json;
const cardData = $node['Parse Claude Response'].item($item.index).json;

let imageUrl = '';

if (pexelsResponse.photos && pexelsResponse.photos.length > 0) {
  imageUrl = pexelsResponse.photos[0].src.large;
} else {
  // Fallback to placeholder
  imageUrl = `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`;
}

return {
  json: {
    ...cardData,
    image_url: imageUrl
  }
};
```

---

### Node 5: Download Image (Optional - for Supabase Upload)

**Only if you want to re-host images:**

```javascript
// HTTP Request Node
{
  "method": "GET",
  "url": "={{$json.image_url}}",
  "options": {
    "response": {
      "response": {
        "fullResponse": false,
        "neverError": false,
        "responseFormat": "file"
      }
    }
  }
}
```

---

### Node 6A: Upload to Supabase (Recommended for Anime/Characters)

```javascript
// For character images that need permanent hosting
const imageData = $input.first().binary;
const { topic_id, card_id, correct_answer } = $json;

// Upload to Supabase
const formData = new FormData();
const filename = `${card_id}.jpg`;
formData.append('file', imageData.data, filename);

// HTTP Request to Supabase Storage
{
  "method": "POST",
  "url": "={{$env.SUPABASE_URL}}/storage/v1/object/decks/{{$json.topic_id}}/{{$json.card_id}}.jpg",
  "headers": {
    "Authorization": "Bearer {{$env.SUPABASE_KEY}}",
    "Content-Type": "multipart/form-data"
  },
  "body": formData
}

// Return public URL
return {
  json: {
    ...cardData,
    image_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/decks/${topic_id}/${card_id}.jpg`
  }
};
```

---

### Node 6B: Append to Google Sheets

```json
{
  "resource": "sheet",
  "operation": "append",
  "sheetId": "={{$env.GOOGLE_SHEETS_ID}}",
  "range": "deck_dash_cards!A:E",
  "options": {
    "valueInputMode": "USER_ENTERED"
  },
  "columns": {
    "mappings": [
      {
        "column": "topic_id",
        "value": "={{$json.topic_id}}"
      },
      {
        "column": "topic_name",
        "value": "={{$json.topic_name}}"
      },
      {
        "column": "card_id",
        "value": "={{$json.card_id}}"
      },
      {
        "column": "image_url",
        "value": "={{$json.image_url}}"
      },
      {
        "column": "correct_answer",
        "value": "={{$json.correct_answer}}"
      }
    ]
  }
}
```

---

## Recommended Approach by Content Type

### For General Topics (Animals, Places, Objects)
```
Claude → Unsplash API → Google Sheets
```
- Fast, free, high quality
- Images hosted by Unsplash permanently
- No download/upload needed

### For Anime/Game Characters
```
Claude → Google Custom Search API → Download → Supabase → Google Sheets
```
- More control over image selection
- Permanent hosting on your Supabase
- Better for copyrighted content

### For Mixed Content
```
Claude → Smart Router → (Unsplash OR Supabase) → Google Sheets
```

**Router Logic:**
```javascript
const { topic_id } = $json;

// Route to different image sources based on topic
if (topic_id.includes('anime') || topic_id.includes('character') || topic_id.includes('onepiece')) {
  // Route to Google Custom Search + Supabase
  return 'characterFlow';
} else {
  // Route to Unsplash
  return 'unsplashFlow';
}
```

---

## Google Custom Search API (For Characters)

**Best for anime/game characters:**

### Setup:
1. Go to https://developers.google.com/custom-search/v1/overview
2. Create Custom Search Engine
3. Get API Key

### Node Configuration:

```json
{
  "method": "GET",
  "url": "=https://www.googleapis.com/customsearch/v1?key={{$env.GOOGLE_SEARCH_API_KEY}}&cx={{$env.GOOGLE_SEARCH_ENGINE_ID}}&q={{encodeURIComponent($json.image_search)}}&searchType=image&imgSize=large&num=1",
}
```

**Parse Response:**
```javascript
const searchResponse = $input.first().json;

if (searchResponse.items && searchResponse.items.length > 0) {
  return {
    json: {
      ...$node['Parse Claude Response'].item($item.index).json,
      image_url: searchResponse.items[0].link
    }
  };
}
```

---

## Complete Workflow Summary

```
1. Webhook/Trigger
   ↓
2. Claude API: Generate card list with search queries
   ↓
3. Parse Response → Split into individual cards
   ↓
4. For each card (parallel):
   ├─ IF general topic → Unsplash API → Get URL
   └─ IF character → Google Search → Download → Supabase → Get URL
   ↓
5. Append to Google Sheets
```

---

## Environment Variables Needed

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Image Sources (pick one or both)
UNSPLASH_ACCESS_KEY=xxxxx
PEXELS_API_KEY=xxxxx
GOOGLE_SEARCH_API_KEY=xxxxx
GOOGLE_SEARCH_ENGINE_ID=xxxxx

# Storage (optional)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxxxx

# Google Sheets
GOOGLE_SHEETS_ID=xxxxx
```

---

## Cost Estimation

### Claude API:
- ~$0.02 per 30-card deck

### Unsplash:
- **FREE** (50 requests/hour)

### Pexels:
- **FREE** (unlimited)

### Google Custom Search:
- **FREE** tier: 100 queries/day
- Paid: $5 per 1000 queries

### Supabase Storage:
- **FREE** tier: 1GB
- ~30KB per image = ~33,000 images free

**Total: $0.02 per deck** (mostly Claude API)

---

## Test the Workflow

```bash
curl -X POST http://your-n8n-instance/webhook/generate-deck \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "onepiece_characters",
    "topic_name": "Characters of One Piece",
    "count": 5
  }'
```

**Expected Output:**
- Google Sheet updated with 5 new rows
- Each with proper image URL
- Ready to use in Deck Dash immediately

---

## Next Steps

1. **Set up n8n** (Docker or Cloud)
2. **Get API keys** (Unsplash or Pexels - both free)
3. **Import this workflow**
4. **Test with One Piece**
5. **Automate daily** or on-demand

Would you like me to create the actual n8n workflow JSON file you can import?
