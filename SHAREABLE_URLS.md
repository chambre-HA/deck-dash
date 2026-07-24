# Shareable URLs & Deck Requests

## Overview

Deck Dash now supports:
1. **Shareable topic URLs** - Direct links to specific decks
2. **Deck request page** - Users can request new AI-generated decks
3. **Social sharing** - Native share API integration

---

## Shareable Topic URLs

### Format

Every deck has its own shareable URL:

```
https://deck-dash.vibeuncle.com/{topic_id}
```

### Examples

```
https://deck-dash.vibeuncle.com/onepiece_characters
https://deck-dash.vibeuncle.com/jujutsu_kaisen
https://deck-dash.vibeuncle.com/pokemon_gen1
https://deck-dash.vibeuncle.com/world_capitals
```

### Features

- **Direct Access**: Links go straight to a beautiful landing page for that deck
- **Deck Preview**: Shows card count, how to play, and deck stats
- **Social Sharing**: Built-in share button with native Web Share API
- **Play Button**: One-click to start the quiz
- **Fallback**: If deck doesn't exist, shows "Request This Deck" button

### Implementation

The shareable page is located at:
```
app/[topicId]/page.tsx
```

It:
1. Loads the topic from Google Sheets
2. Displays deck information
3. Provides play and share buttons
4. Handles missing decks gracefully

---

## Deck Request Page

### URL

```
https://deck-dash.vibeuncle.com/request
```

### Features

Users can submit requests for new AI-generated decks with:

- **Topic Name**: Display name (e.g., "Characters of One Piece")
- **Topic ID**: URL slug (auto-generated from name)
- **Card Count**: 10-50 cards (default: 30)
- **Real-time Preview**: Shows what the shareable URL will be
- **Examples**: Helpful topic suggestions

### User Flow

1. User visits `/request`
2. Fills out form:
   - Topic Name: "Jujutsu Kaisen Characters"
   - Topic ID: `jujutsu_kaisen` (auto-generated)
   - Card Count: 30
3. Clicks "Submit Request"
4. Request sent to n8n webhook
5. Success message shown
6. User waits 2-5 minutes
7. Deck appears on home page

### Implementation

```
app/request/page.tsx           # Request form UI
app/api/request-deck/route.ts  # API endpoint that forwards to n8n
```

---

## n8n Integration

### Webhook Endpoint

The request form calls:
```
POST /api/request-deck
```

Which forwards to:
```
POST {N8N_WEBHOOK_URL}
```

### Request Body

```json
{
  "topic_id": "jujutsu_kaisen",
  "topic_name": "Jujutsu Kaisen Characters",
  "count": 30
}
```

### Workflow Process

1. **Receive Request** → n8n webhook triggered
2. **Generate Cards** → Claude API creates 30 character names + Wikipedia slugs
3. **Fetch Images** → Wikipedia API finds image URLs
4. **Resolve URLs** → Get direct upload.wikimedia.org links
5. **Update Sheet** → Append all 30 cards to Google Sheets
6. **Auto-Refresh** → Deck appears on site (cache expires after 24h)

### Configuration

Set in `.env.local`:
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/generate-deck
```

Or for local testing:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-deck
```

---

## Social Sharing

### Web Share API

When users click "Share This Deck" on a topic page:

```javascript
await navigator.share({
  title: `Deck Dash - ${topic.name}`,
  text: `Can you recognize all ${topic.cardCount} cards? Try this quiz!`,
  url: shareUrl,
});
```

### Fallback

For browsers without Web Share API:
- Copies URL to clipboard
- Shows "Link copied!" alert

### Platforms

Shares work on:
- Mobile: Native share sheet (WhatsApp, Twitter, etc.)
- Desktop: Copy to clipboard fallback

---

## URL Routing Structure

```
/                              → Home (all decks)
/request                       → Request new deck form
/[topicId]                     → Shareable topic landing page
/play/[topicId]                → Start quiz for topic
/results/[topicId]             → Results after quiz
```

---

## Example User Journey

### Sharing a Deck

1. User plays "One Piece Characters" quiz
2. Gets great score
3. Clicks share button from results
4. Shares: `deck-dash.vibeuncle.com/onepiece_characters`
5. Friend clicks link → lands on topic page → clicks play

### Requesting a Deck

1. User wants "Attack on Titan Titans" deck
2. Visits `/request`
3. Fills form:
   ```
   Topic Name: Attack on Titan Titans
   Topic ID: attack_on_titan (auto-generated)
   Card Count: 25
   ```
4. Submits → n8n workflow runs
5. 3 minutes later, deck is ready
6. User refreshes home page → sees new deck
7. Shares URL: `deck-dash.vibeuncle.com/attack_on_titan`

---

## Benefits

### For Users
- Easy sharing with friends
- Request custom topics
- No account needed
- Clean, memorable URLs

### For Growth
- Viral sharing potential
- SEO-friendly URLs
- Direct topic landing pages
- User-generated content

### For Content
- Automated deck generation
- Scales to unlimited topics
- AI-powered content creation
- Wikipedia-sourced images

---

## Testing

### Test Shareable URL

```bash
# Visit a topic page directly
open http://localhost:3000/onepiece_characters
```

### Test Request Flow

```bash
# Visit request page
open http://localhost:3000/request

# Or test API directly
curl -X POST http://localhost:3000/api/request-deck \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "test_deck",
    "topic_name": "Test Deck",
    "count": 10
  }'
```

### Test Share Button

1. Open any topic page
2. Click "Share This Deck"
3. On mobile: Should show native share sheet
4. On desktop: Should copy URL to clipboard

---

## Production Deployment

### Update Environment Variables

```env
# Production n8n webhook
N8N_WEBHOOK_URL=https://n8n.yourcompany.com/webhook/generate-deck
```

### Update Share URLs

The app automatically detects the domain:
```javascript
const shareUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/${topicId}`
  : `https://deck-dash.vibeuncle.com/${topicId}`;
```

On production, it will use `deck-dash.vibeuncle.com` automatically.

---

## SEO Considerations

### Meta Tags (Future Enhancement)

Add to `app/[topicId]/page.tsx`:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const topic = await getTopicById(params.topicId);

  return {
    title: `${topic.name} - Deck Dash Quiz`,
    description: `Can you recognize all ${topic.cardCount} cards? Test your knowledge!`,
    openGraph: {
      images: [topic.previewImage],
    },
  };
}
```

### Sitemap (Future Enhancement)

Generate sitemap with all topic URLs:
```xml
<url>
  <loc>https://deck-dash.vibeuncle.com/onepiece_characters</loc>
  <changefreq>weekly</changefreq>
</url>
```

---

## Analytics Tracking

Track these events:
- Topic page views
- Share button clicks
- Deck requests submitted
- Play button clicks from topic pages

Example:
```javascript
// Track share
gtag('event', 'share', {
  content_type: 'deck',
  item_id: topicId,
});

// Track request
gtag('event', 'deck_request', {
  topic_name: topicName,
  card_count: count,
});
```

---

## Future Enhancements

### 1. QR Code Generation
Generate QR codes for each deck URL for easy mobile sharing

### 2. Deck Stats
Show popularity, completion rate, average scores on topic page

### 3. Custom Deck Builder
Let users build custom decks with their own images

### 4. Topic Categories
Group topics: Anime, Geography, Science, etc.

### 5. Search & Browse
Search for specific topics, filter by difficulty

---

Ready to share! 🚀
