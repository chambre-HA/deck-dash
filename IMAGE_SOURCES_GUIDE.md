# Image Sources Guide for Deck Dash

## The Challenge

Getting reliable image URLs for quiz cards, especially from:
- Wikipedia (complex URLs, licensing)
- Fandom wikis (hotlinking protection)
- Other wikis (access restrictions)

---

## Solutions

### Option 1: Free Stock Photo APIs (Recommended)

#### A. Unsplash API
**Best for**: General topics (animals, nature, landmarks, objects)

**How to get URLs:**
```
https://source.unsplash.com/800x600/?{search_term}

Examples:
https://source.unsplash.com/800x600/?sparrow
https://source.unsplash.com/800x600/?eiffel+tower
https://source.unsplash.com/800x600/?sushi
```

**Pros:**
- No API key needed for simple URLs
- High quality images
- Free and unlimited
- Direct hotlinking allowed

**Cons:**
- Random image each time (use specific photo IDs for consistency)

**For consistent images:**
1. Search on https://unsplash.com
2. Copy photo ID from URL: `https://unsplash.com/photos/{PHOTO_ID}`
3. Use: `https://images.unsplash.com/photo-{PHOTO_ID}?w=800`

#### B. Pexels API
**Best for**: Same as Unsplash, alternative source

**Setup:**
1. Sign up at https://www.pexels.com/api/
2. Get free API key
3. Use in n8n workflow (see N8N_DECK_DASH_WORKFLOW.md)

**Direct URLs:**
```
# Search via API
GET https://api.pexels.com/v1/search?query=sparrow&per_page=1
Authorization: YOUR_API_KEY

# Response includes:
{
  "photos": [{
    "src": {
      "large": "https://images.pexels.com/photos/123/pexels-photo-123.jpeg"
    }
  }]
}
```

#### C. Pixabay
**Best for**: Illustrations, vectors, photos

**Free API:** https://pixabay.com/api/docs/

---

### Option 2: Wikipedia Images (Proper Method)

Instead of using direct Wikipedia URLs, use **Wikimedia Commons API**:

#### Get Image from Wikipedia Article:

```javascript
// 1. Get Wikipedia page
const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/Sparrow`;

// 2. Response includes thumbnail
{
  "thumbnail": {
    "source": "https://upload.wikimedia.org/wikipedia/commons/thumb/..."
  }
}
```

#### Direct Wikimedia Commons URLs:

```
Format:
https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=800

Example:
https://commons.wikimedia.org/wiki/Special:FilePath/House_Sparrow.jpg?width=800
```

**License:** Most are free to use, but check licensing.

---

### Option 3: Fandom Wiki Images (Workaround)

Fandom wikis often block hotlinking. Solutions:

#### A. Use Fandom's Static Image CDN
```
Original: https://static.wikia.nocookie.net/onepiece/images/...
Better: Use image proxy or download and host yourself
```

#### B. Download and Re-host (Recommended)
1. Download images from Fandom
2. Upload to:
   - **Imgur** (free hosting)
   - **Cloudinary** (free tier: 25GB)
   - **Supabase Storage** (you already have it!)
   - **GitHub** (as static assets)

#### C. Use Image Proxy Service
```
# Via Cloudinary fetch
https://res.cloudinary.com/demo/image/fetch/https://static.wikia.nocookie.net/...

# Or self-hosted proxy in Next.js
/api/image-proxy?url=...
```

---

### Option 4: Use Next.js API Route as Image Proxy

Create an image proxy to handle tricky sources:

**Create:** `app/api/image-proxy/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeckDash/1.0)',
        'Referer': 'https://www.google.com'
      }
    });

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
```

**Usage in Google Sheets:**
```
/api/image-proxy?url=https://static.wikia.nocookie.net/onepiece/images/...
```

---

### Option 5: Supabase Storage (Best for Production)

**Setup:**

1. **Upload Images to Supabase:**
   ```bash
   # Via Supabase Dashboard or CLI
   supabase storage create decks
   ```

2. **Upload via n8n workflow:**
   - Download image from any source
   - Upload to Supabase Storage
   - Get public URL

3. **URL Format:**
   ```
   https://your-project.supabase.co/storage/v1/object/public/decks/onepiece/roronoa_zoro.png
   ```

**Pros:**
- Full control
- No hotlinking issues
- Fast CDN
- Free tier: 1GB storage

---

### Option 6: GitHub as Static Image Host

**Free and reliable:**

1. Create repo: `deck-dash-images`
2. Upload images: `/topics/onepiece/zoro.png`
3. Use raw URL:
   ```
   https://raw.githubusercontent.com/yourusername/deck-dash-images/main/topics/onepiece/zoro.png
   ```

**Pros:**
- Free unlimited
- Git version control
- Reliable CDN

---

## Recommended Workflow

### For General Topics (Animals, Objects, Places):
1. **First choice:** Unsplash source URLs
2. **Backup:** Pexels API via n8n

### For Specific Characters (One Piece, Anime, etc):
1. **Download from Fandom**
2. **Upload to Supabase Storage** or GitHub
3. **Use stable URLs** in Google Sheets

### For Wikipedia Topics:
1. **Use Wikipedia API** to get thumbnail
2. **Or Wikimedia Commons** direct URL
3. **Or Unsplash** for generic images

---

## Quick Image Tools

### Bulk Download from Fandom Wiki:
```bash
# Use wget with custom user agent
wget --user-agent="Mozilla/5.0" \
     --referer="https://onepiece.fandom.com" \
     -i image_urls.txt
```

### Batch Upload to Supabase:
```bash
# Via Supabase CLI
supabase storage upload decks/onepiece zoro.png
```

### Generate Unsplash URLs (Claude/n8n):
```javascript
// For each card in n8n
const imageUrl = `https://source.unsplash.com/800x600/?${card.correct_answer.toLowerCase().replace(' ', '+')}`;
```

---

## Image URL Template

Create a helper in your n8n workflow:

```javascript
function getImageUrl(topic, answer) {
  // For anime/game characters: use Supabase
  if (topic.includes('onepiece') || topic.includes('anime')) {
    const filename = answer.toLowerCase().replace(/\s+/g, '_');
    return `https://your-project.supabase.co/storage/v1/object/public/decks/${topic}/${filename}.png`;
  }

  // For general topics: use Unsplash
  const query = answer.toLowerCase().replace(/\s+/g, '+');
  return `https://source.unsplash.com/800x600/?${query}`;
}
```

---

## Next Steps

1. **For your current One Piece deck:**
   - Download images from Fandom
   - Upload to Supabase Storage or GitHub
   - Update Google Sheets with stable URLs

2. **For future automation:**
   - Use n8n to fetch images via Unsplash/Pexels
   - Or upload to Supabase as part of workflow

3. **Create image proxy** if needed for tricky sources

---

Would you like me to:
1. Set up the image proxy API route?
2. Create a Supabase storage setup guide?
3. Build an n8n workflow for image handling?
