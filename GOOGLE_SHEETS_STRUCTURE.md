# Deck Dash - Google Sheets Data Structure

## Overview
Cards are stored in Google Sheets with n8n + Claude API generating daily content.

---

## Google Sheet Structure

### Sheet Name: `deck_dash_cards`

| Column | Field Name | Type | Required | Description | Example |
|--------|-----------|------|----------|-------------|---------|
| A | topic_id | string | ✅ Yes | Unique topic identifier | `animals_birds` |
| B | topic_name | string | ✅ Yes | Display name for topic stack | `Birds of the World` |
| C | card_id | string | ✅ Yes | Unique card identifier | `bird_001` |
| D | image_url | string | ✅ Yes | Direct URL to card image | `https://example.com/sparrow.jpg` |
| E | correct_answer | string | ✅ Yes | The correct answer text | `Sparrow` |
| F | wrong_answer_1 | string | ❌ No | Optional: Static wrong answer 1 | `Robin` |
| G | wrong_answer_2 | string | ❌ No | Optional: Static wrong answer 2 | `Eagle` |
| H | wrong_answer_3 | string | ❌ No | Optional: Static wrong answer 3 | `Penguin` |
| I | difficulty | string | ❌ No | easy/medium/hard (default: medium) | `medium` |
| J | created_at | timestamp | ❌ No | Generation timestamp | `2025-12-28T10:00:00Z` |

### Wrong Answer Generation

**Wrong answers are automatically generated!** The app picks 3 random correct answers from other cards in the same topic.

- **Columns F, G, H are optional** - you can leave them blank
- If provided, they're ignored in favor of random generation
- This means you only need: **topic_id, topic_name, card_id, image_url, correct_answer**

---

## Simplified Example Data (Recommended)

```csv
topic_id,topic_name,card_id,image_url,correct_answer
animals_birds,Birds of the World,bird_001,https://images.unsplash.com/sparrow.jpg,Sparrow
animals_birds,Birds of the World,bird_002,https://images.unsplash.com/eagle.jpg,Eagle
animals_birds,Birds of the World,bird_003,https://images.unsplash.com/penguin.jpg,Penguin
animals_birds,Birds of the World,bird_004,https://images.unsplash.com/robin.jpg,Robin
animals_birds,Birds of the World,bird_005,https://images.unsplash.com/owl.jpg,Owl
science_space,Space Exploration,space_001,https://images.unsplash.com/saturn.jpg,Saturn
science_space,Space Exploration,space_002,https://images.unsplash.com/mars.jpg,Mars
science_space,Space Exploration,space_003,https://images.unsplash.com/jupiter.jpg,Jupiter
science_space,Space Exploration,space_004,https://images.unsplash.com/venus.jpg,Venus
food_cuisine,World Cuisine,food_001,https://images.unsplash.com/sushi.jpg,Sushi,Sashimi,Ramen,Tempura,easy,2025-12-28T10:00:00Z
landmarks,Famous Landmarks,land_001,https://images.unsplash.com/eiffel.jpg,Eiffel Tower,Big Ben,Statue of Liberty,Colosseum,easy,2025-12-28T10:00:00Z
```

---

## Topic Categories

Suggested topics for initial launch (30 cards each):

1. **Animals & Nature**
   - `animals_birds` - Birds of the World
   - `animals_mammals` - Mammals
   - `animals_marine` - Ocean Creatures
   - `plants_flowers` - Flowers & Plants

2. **Science & Tech**
   - `science_space` - Space & Planets
   - `science_elements` - Chemical Elements
   - `tech_gadgets` - Technology & Gadgets

3. **Geography**
   - `landmarks` - Famous Landmarks
   - `flags` - World Flags
   - `cities` - World Cities

4. **Food & Culture**
   - `food_cuisine` - World Cuisine
   - `food_fruits` - Fruits
   - `food_desserts` - Desserts

5. **Sports & Entertainment**
   - `sports_equipment` - Sports Equipment
   - `music_instruments` - Musical Instruments
   - `movies_characters` - Movie Characters

---

## Google Sheets Access (Publish to Web)

### Setup Instructions:

1. **Create Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create new spreadsheet named "Deck Dash Cards"
   - Add sheet tab named exactly `deck_dash_cards`
   - Set up columns as per structure above

2. **Publish to Web**
   - Go to File > Share > Publish to web
   - Select sheet: `deck_dash_cards` (or "Entire Document")
   - Format: **Comma-separated values (.csv)**
   - Click "Publish"
   - Copy the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

3. **Configure App**
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_GOOGLE_SHEETS_ID=your_sheet_id_here
     ```
   - **No API key needed!**

### Why "Publish to Web"?

- **No API Key Required** - Simpler setup, no Google Cloud Console needed
- **No Authentication** - Faster, no auth overhead
- **No Quota Limits** - Unlimited requests
- **Private Sheet** - Your Google Sheet remains private, only the CSV data is public
- **Automatic Updates** - Changes appear within minutes

### CSV Endpoint:

```
GET https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=deck_dash_cards
```

---

## Data Fetching Strategy

### Client-Side (App)
```typescript
// Fetch CSV data (no API key needed)
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=deck_dash_cards`;
const response = await fetch(url);
const csvText = await response.text();

// Parse CSV to array
const rows = parseCSV(csvText);

// Filter by topic_id
const topicCards = rows
  .slice(1) // Skip header row
  .filter(row => row[0] === topicId)
  .slice(0, 30); // Get 30 cards
```

### Caching
- Cache fetched data in localStorage for 24 hours
- Reduce API calls and improve performance
- Refresh on user request or daily

---

## Alternative: Supabase Storage

For better performance and control:

1. **N8N Workflow:**
   - Generate cards with Claude API
   - Format as JSON
   - Upload to Supabase Storage: `/decks/{topic_id}.json`

2. **App Fetching:**
   ```typescript
   const response = await fetch(
     `${SUPABASE_URL}/storage/v1/object/public/decks/${topicId}.json`
   );
   const cards = await response.json();
   ```

3. **Benefits:**
   - Faster loading (JSON vs CSV parsing)
   - Better caching control
   - Version control for decks
   - No Google API limits

---

## N8N Daily Generation Workflow

See `N8N_DECK_DASH_WORKFLOW.md` for:
- Automated daily topic generation
- Claude API prompt templates
- Image sourcing (Unsplash API)
- Wrong answer generation logic
- Google Sheets update automation
