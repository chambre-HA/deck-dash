# N8N + Claude API Workflow for Deck Dash

## Overview
Automated daily generation of quiz cards using n8n workflow automation and Claude API. The workflow generates 30 cards for a specific topic with images and answer choices.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────┐
│  N8N Workflow (Runs Daily at Midnight)             │
└─────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  1. Cron Trigger (Daily 00:00)                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  2. Select Today's Topic                             │
│     - From topics CSV or rotation schedule          │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  3. Generate Cards with Claude API                   │
│     - Create 30 cards with images and answers       │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  4. Fetch Images from Unsplash API                   │
│     - Get high-quality images for each card         │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  5. Append to Google Sheets                          │
│     - Add new cards to deck_dash_cards sheet        │
└──────────────────────────────────────────────────────┘
```

---

## N8N Workflow Nodes

### Node 1: Cron Schedule Trigger
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 0 * * *"
        }
      ]
    },
    "timezone": "America/Los_Angeles"
  },
  "type": "n8n-nodes-base.cron"
}
```

### Node 2: Get Today's Topic (Code Node)
```javascript
const topics = [
  { id: 'animals_birds', name: 'Birds of the World', keywords: 'bird species' },
  { id: 'animals_mammals', name: 'Mammals', keywords: 'mammal species' },
  { id: 'science_space', name: 'Space & Planets', keywords: 'planets, stars, space objects' },
  { id: 'landmarks', name: 'Famous Landmarks', keywords: 'famous buildings, monuments' },
  { id: 'food_cuisine', name: 'World Cuisine', keywords: 'food dishes, cuisine' },
  { id: 'flags', name: 'World Flags', keywords: 'country flags' },
  { id: 'sports_equipment', name: 'Sports Equipment', keywords: 'sports gear, equipment' }
];

// Rotate topics based on day of year
const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const topicIndex = dayOfYear % topics.length;
const selectedTopic = topics[topicIndex];

return {
  json: {
    topic_id: selectedTopic.id,
    topic_name: selectedTopic.name,
    keywords: selectedTopic.keywords,
    date: new Date().toISOString().split('T')[0]
  }
};
```

### Node 3: Build Claude Prompt (Code Node)
```javascript
const { topic_id, topic_name, keywords } = $input.first().json;

const prompt = `You are generating quiz cards for a mobile game called "Deck Dash".

**Topic**: ${topic_name}
**Goal**: Create 30 visual quiz cards where users see a picture and choose the correct answer from 4 options.

**Instructions**:
1. Generate exactly 30 items related to: ${keywords}
2. Each item should be visually distinct and easily recognizable in photos
3. For each item, provide:
   - The correct answer (name of the thing in the image)
   - 3 wrong answers (similar items that could be confused with it)

**Example for "Birds":**
{
  "items": [
    {
      "correct_answer": "Bald Eagle",
      "wrong_answers": ["Golden Eagle", "Hawk", "Falcon"],
      "search_query": "bald eagle in flight"
    },
    {
      "correct_answer": "Penguin",
      "wrong_answers": ["Puffin", "Tern", "Albatross"],
      "search_query": "penguin standing"
    }
  ]
}

**Rules**:
- Wrong answers should be plausible but clearly different
- Search queries should help find clear, unambiguous images
- Answers should be 1-3 words max
- Avoid obscure or overly similar items
- Mix difficulty levels (easy, medium, hard)

Return ONLY valid JSON with this structure:
{
  "items": [
    {
      "correct_answer": "Item Name",
      "wrong_answers": ["Wrong 1", "Wrong 2", "Wrong 3"],
      "search_query": "search terms for image",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

return { json: { prompt } };
```

### Node 4: Call Claude API (HTTP Request)
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "headerAuth",
    "headerParameters": {
      "parameters": [
        {
          "name": "x-api-key",
          "value": "={{$env.ANTHROPIC_API_KEY}}"
        },
        {
          "name": "anthropic-version",
          "value": "2023-06-01"
        },
        {
          "name": "content-type",
          "value": "application/json"
        }
      ]
    },
    "jsonParameters": true,
    "bodyParametersJson": "={{ JSON.stringify({\n  model: 'claude-3-5-sonnet-20241022',\n  max_tokens: 4096,\n  messages: [{\n    role: 'user',\n    content: $node['Build Claude Prompt'].json.prompt\n  }]\n}) }}"
  },
  "type": "n8n-nodes-base.httpRequest"
}
```

### Node 5: Parse Claude Response (Code Node)
```javascript
const claudeResponse = $input.first().json.content[0].text;
const { topic_id, topic_name, date } = $node['Get Today\'s Topic'].json;

// Extract JSON from Claude's response
const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('Failed to parse Claude response');
}

const parsedContent = JSON.parse(jsonMatch[0]);

// Transform to format ready for next steps
const items = parsedContent.items.map((item, index) => ({
  topic_id,
  topic_name,
  card_id: `${topic_id}_${date}_${String(index + 1).padStart(3, '0')}`,
  correct_answer: item.correct_answer,
  wrong_answer_1: item.wrong_answers[0],
  wrong_answer_2: item.wrong_answers[1],
  wrong_answer_3: item.wrong_answers[2],
  search_query: item.search_query,
  difficulty: item.difficulty || 'medium',
  created_at: new Date().toISOString()
}));

return items.map(item => ({ json: item }));
```

### Node 6: Fetch Images from Unsplash (HTTP Request - Loop)
```json
{
  "parameters": {
    "method": "GET",
    "url": "=https://api.unsplash.com/search/photos?query={{$json.search_query}}&per_page=1&orientation=landscape",
    "authentication": "headerAuth",
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Client-ID {{$env.UNSPLASH_ACCESS_KEY}}"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.httpRequest"
}
```

### Node 7: Attach Image URLs (Code Node)
```javascript
const cardData = $input.first().json;
const unsplashResponse = $input.all()[1]?.json;

let imageUrl = '';

if (unsplashResponse?.results && unsplashResponse.results.length > 0) {
  imageUrl = unsplashResponse.results[0].urls.regular;
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

### Node 8: Append to Google Sheets (Google Sheets Node)
```json
{
  "parameters": {
    "operation": "append",
    "sheetId": "={{$env.GOOGLE_SHEETS_ID}}",
    "range": "deck_dash_cards!A:J",
    "options": {
      "valueInputMode": "USER_ENTERED"
    }
  },
  "type": "n8n-nodes-base.googleSheets"
}
```

**Mapping** (for Google Sheets append):
- Column A: `topic_id`
- Column B: `topic_name`
- Column C: `card_id`
- Column D: `image_url`
- Column E: `correct_answer`
- Column F: `wrong_answer_1`
- Column G: `wrong_answer_2`
- Column H: `wrong_answer_3`
- Column I: `difficulty`
- Column J: `created_at`

---

## Environment Variables

Add these to your n8n environment:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
GOOGLE_SHEETS_ID=your_google_sheet_id
```

---

## Alternative: Use Pexels API (Free)

If you prefer free stock photos without API limits:

### Pexels Search (HTTP Request)
```json
{
  "parameters": {
    "method": "GET",
    "url": "=https://api.pexels.com/v1/search?query={{$json.search_query}}&per_page=1&orientation=landscape",
    "authentication": "headerAuth",
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "={{$env.PEXELS_API_KEY}}"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.httpRequest"
}
```

Parse Pexels response:
```javascript
const cardData = $input.first().json;
const pexelsResponse = $input.all()[1]?.json;

let imageUrl = '';

if (pexelsResponse?.photos && pexelsResponse.photos.length > 0) {
  imageUrl = pexelsResponse.photos[0].src.large;
} else {
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

## Claude Prompt Examples

### For "World Flags" Topic
```
Topic: World Flags
Goal: Create 30 flag quiz cards

Generate 30 country flags with:
- Correct answer: Country name
- Wrong answers: 3 other countries with similar flag colors
- Search query: "{country} flag"

Return JSON with items array.
```

### For "Musical Instruments" Topic
```
Topic: Musical Instruments
Goal: Create 30 instrument quiz cards

Generate 30 musical instruments with:
- Correct answer: Instrument name
- Wrong answers: 3 similar instruments
- Search query: "{instrument} instrument"

Return JSON with items array.
```

---

## Testing the Workflow

### Manual Test Trigger
Add webhook trigger for manual testing:

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "deck-dash-generate",
    "responseMode": "lastNode"
  },
  "type": "n8n-nodes-base.webhook"
}
```

Test with:
```bash
curl -X POST http://your-n8n-instance/webhook/deck-dash-generate \
  -H "Content-Type: application/json" \
  -d '{"topic_id": "animals_birds", "topic_name": "Birds of the World"}'
```

---

## Cost Estimation

### Claude API Costs
- Model: Claude 3.5 Sonnet
- Input tokens: ~500 (prompt)
- Output tokens: ~2,500 (30 items with JSON)
- Cost per run: ~$0.02
- Monthly cost (30 days): ~$0.60

### Unsplash API
- Free tier: 50 requests/hour
- 30 cards/day fits easily within free tier

### Pexels API
- Completely free (no API limits)
- Recommended for production

### Google Sheets API
- Free (within quota: 100 requests/100 seconds)

**Total Monthly Cost**: ~$0.60 (mostly Claude API)

---

## Error Handling

### Retry Logic for Image Fetching
```javascript
// If Unsplash/Pexels fails, use fallback sources
const fallbackSources = [
  `https://source.unsplash.com/800x600/?${encodeURIComponent(cardData.search_query)}`,
  `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`
];

let imageUrl = fallbackSources[0];

return { json: { ...cardData, image_url: imageUrl } };
```

### Validate Claude Output
```javascript
const parsed = JSON.parse(jsonMatch[0]);

if (!parsed.items || parsed.items.length < 30) {
  throw new Error(`Expected 30 items, got ${parsed.items?.length || 0}`);
}

for (const item of parsed.items) {
  if (!item.correct_answer || !item.wrong_answers || item.wrong_answers.length !== 3) {
    throw new Error('Invalid item structure');
  }
}
```

---

## Future Enhancements

1. **User-Requested Topics**
   - Add webhook endpoint where users can request custom topics
   - Claude generates cards on-demand
   - Store in separate "user_decks" sheet

2. **Difficulty Adjustment**
   - Track user performance
   - Generate more cards at appropriate difficulty level

3. **Multi-Language Support**
   - Generate cards in different languages
   - Claude can translate answers

4. **Image Quality Check**
   - Use Claude Vision API to verify image matches answer
   - Regenerate if mismatch detected

5. **Batch Generation**
   - Generate full week's content at once
   - More cost-efficient for Claude API

---

This workflow provides a fully automated pipeline for generating high-quality quiz cards daily with minimal manual intervention.
