# N8N Workflow: Wikipedia Image Scraper

## The Real Solution: Scrape Wikipedia Pages

Since Wikipedia image URLs vary, we need to **scrape the actual Wikipedia page** and extract the infobox image.

---

## Complete n8n Workflow

### Node 1: Trigger

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "generate-deck-scraper"
  },
  "type": "n8n-nodes-base.webhook"
}
```

**Input:**
```json
{
  "topic_id": "onepiece_characters",
  "topic_name": "Characters of One Piece",
  "items": [
    "Monkey D. Luffy",
    "Roronoa Zoro",
    "Nami",
    "Usopp",
    "Sanji",
    "Tony Tony Chopper"
  ]
}
```

---

### Node 2: Claude API - Generate Character List

```javascript
// Code Node: Build Prompt
const { topic_id, topic_name, count } = $input.first().json;

const prompt = `Generate ${count || 30} quiz cards for: "${topic_name}".

For each item, provide:
1. correct_answer: The exact name
2. wikipedia_slug: URL-friendly version for Wikipedia
   - Replace spaces with underscores
   - Add disambiguation if needed (e.g., "Sanji_(One_Piece)")

Return ONLY valid JSON:
{
  "cards": [
    {
      "correct_answer": "Monkey D. Luffy",
      "wikipedia_slug": "Monkey_D._Luffy"
    },
    {
      "correct_answer": "Sanji",
      "wikipedia_slug": "Sanji_(One_Piece)"
    }
  ]
}`;

return {
  json: {
    topic_id,
    topic_name,
    prompt
  }
};
```

---

### Node 3: HTTP Request - Fetch Wikipedia HTML

```json
{
  "method": "GET",
  "url": "=https://en.wikipedia.org/wiki/{{$json.wikipedia_slug}}",
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  },
  "options": {
    "response": {
      "response": {
        "fullResponse": false,
        "responseFormat": "text"
      }
    }
  }
}
```

---

### Node 4: Extract Image from HTML (Code Node)

```javascript
const html = $input.first().body;
const cardData = $node['Parse Claude Response'].item($item.index).json;

function extractWikipediaImage(html) {
  // Strategy 1: Look for infobox image (most reliable)
  const infoboxMatch = html.match(/class="infobox-image"[^>]*>\s*<a[^>]*href="([^"]+)"/);
  if (infoboxMatch) {
    const imagePageUrl = 'https://en.wikipedia.org' + infoboxMatch[1];
    // Extract direct image URL from the File: page link
    const fileMatch = infoboxMatch[1].match(/\/wiki\/File:([^"]+)/);
    if (fileMatch) {
      const filename = decodeURIComponent(fileMatch[1]);
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
    }
  }

  // Strategy 2: Look for image in infobox directly
  const infoboxImgMatch = html.match(/class="infobox[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/);
  if (infoboxImgMatch) {
    let imgUrl = infoboxImgMatch[1];
    if (imgUrl.startsWith('//')) {
      imgUrl = 'https:' + imgUrl;
    }
    // Convert thumbnail to full resolution
    imgUrl = imgUrl.replace(/\/thumb\//, '/').replace(/\/\d+px-[^/]+$/, '');
    return imgUrl;
  }

  // Strategy 3: Look for og:image meta tag
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (ogImageMatch) {
    let imgUrl = ogImageMatch[1];
    if (imgUrl.startsWith('//')) {
      imgUrl = 'https:' + imgUrl;
    }
    return imgUrl;
  }

  // Strategy 4: First image in article
  const firstImageMatch = html.match(/<img[^>]*src="(\/\/upload\.wikimedia\.org[^"]+)"/);
  if (firstImageMatch) {
    let imgUrl = 'https:' + firstImageMatch[1];
    imgUrl = imgUrl.replace(/\/thumb\//, '/').replace(/\/\d+px-[^/]+$/, '');
    return imgUrl;
  }

  // Fallback
  return null;
}

const imageUrl = extractWikipediaImage(html);

return {
  json: {
    ...cardData,
    image_url: imageUrl || `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`
  }
};
```

---

### Node 5: Alternative - Use Wikipedia API with Page Parse

**More reliable method using Wikipedia's parse API:**

```json
{
  "method": "GET",
  "url": "=https://en.wikipedia.org/w/api.php?action=parse&page={{encodeURIComponent($json.wikipedia_slug)}}&prop=text&format=json&formatversion=2",
  "headers": {
    "User-Agent": "DeckDash/1.0"
  }
}
```

**Extract image from parsed HTML:**

```javascript
const response = $input.first().json;
const cardData = $node['Parse Claude Response'].item($item.index).json;

if (!response.parse || !response.parse.text) {
  return {
    json: {
      ...cardData,
      image_url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`
    }
  };
}

const html = response.parse.text;

// Extract infobox image
const infoboxMatch = html.match(/<td class="infobox-image">[\s\S]*?<img[^>]*src="([^"]+)"/);

let imageUrl = '';

if (infoboxMatch) {
  imageUrl = infoboxMatch[1];
  if (imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  }
  // Convert thumbnail to full size
  imageUrl = imageUrl.replace(/\/thumb\//, '/');
  // Remove size suffix (e.g., /220px-Filename.jpg)
  imageUrl = imageUrl.replace(/\/\d+px-[^/]+$/, '');
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

### Node 6: Clean Image URL (Code Node)

```javascript
const { image_url, ...rest } = $json;

// Clean and normalize the image URL
let cleanUrl = image_url;

// Remove thumbnail path
cleanUrl = cleanUrl.replace(/\/thumb\//, '/');

// Remove size specifications
cleanUrl = cleanUrl.replace(/\/\d+px-[^/]*$/, '');

// Extract just the filename if it's a complex URL
const filenameMatch = cleanUrl.match(/\/([^/]+\.(jpg|jpeg|png|gif|webp))$/i);
if (filenameMatch) {
  const filename = filenameMatch[1];
  cleanUrl = `https://upload.wikimedia.org/wikipedia/en/${filename.charAt(0)}/${filename.charAt(0)}${filename.charAt(1)}/${filename}`;
}

return {
  json: {
    ...rest,
    image_url: cleanUrl
  }
};
```

---

## Better Alternative: Use MediaWiki API Query

**Most reliable method:**

### Node 3 Alternative: MediaWiki API - Get Page Images

```json
{
  "method": "GET",
  "url": "=https://en.wikipedia.org/w/api.php?action=query&titles={{encodeURIComponent($json.wikipedia_slug)}}&prop=pageimages|pageterms&piprop=original&format=json&formatversion=2",
  "headers": {
    "User-Agent": "DeckDash/1.0"
  }
}
```

**Parse Response:**

```javascript
const response = $input.first().json;
const cardData = $node['Parse Claude Response'].item($item.index).json;

let imageUrl = '';

if (response.query && response.query.pages && response.query.pages.length > 0) {
  const page = response.query.pages[0];

  if (page.original && page.original.source) {
    imageUrl = page.original.source;
  }
}

// Fallback: Try to get from thumbnail
if (!imageUrl && page.thumbnail && page.thumbnail.source) {
  imageUrl = page.thumbnail.source;
  // Convert thumbnail to larger size
  imageUrl = imageUrl.replace(/\/\d+px-/, '/800px-');
}

// Ultimate fallback
if (!imageUrl) {
  imageUrl = `https://via.placeholder.com/800x600?text=${encodeURIComponent(cardData.correct_answer)}`;
}

return {
  json: {
    ...cardData,
    image_url: imageUrl,
    wikipedia_title: page.title || cardData.correct_answer
  }
};
```

---

## Complete Workflow - Best Approach

```
1. Trigger with topic
   ↓
2. Claude API: Generate character names + Wikipedia slugs
   ↓
3. For each character (parallel):
   ├─ Call MediaWiki API with pageimages prop
   ├─ Extract original image URL
   └─ Fallback to placeholder if not found
   ↓
4. Append to Google Sheets
```

---

## Example MediaWiki API Call

**Test manually:**

```bash
# For Monkey D. Luffy
curl "https://en.wikipedia.org/w/api.php?action=query&titles=Monkey_D._Luffy&prop=pageimages&piprop=original&format=json&formatversion=2"

# Response:
{
  "query": {
    "pages": [{
      "pageid": 123456,
      "title": "Monkey D. Luffy",
      "original": {
        "source": "https://upload.wikimedia.org/wikipedia/en/4/4e/Monkey_D_Luffy.png",
        "width": 250,
        "height": 300
      }
    }]
  }
}
```

---

## Enhanced: Multiple Fallback Sources

```javascript
async function getImageWithFallbacks(characterName, wikipediaSlug) {
  // 1. Try MediaWiki pageimages API
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikipediaSlug)}&prop=pageimages&piprop=original&format=json&formatversion=2`
    );
    const data = await response.json();
    const page = data.query.pages[0];
    if (page.original) {
      return page.original.source;
    }
  } catch (e) {}

  // 2. Try direct Wikimedia Commons
  const filename = characterName.replace(/\s+/g, '_');
  try {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
  } catch (e) {}

  // 3. Try searching Wikimedia Commons
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(characterName)}&srnamespace=6&format=json&srlimit=1`
    );
    const data = await response.json();
    if (data.query.search.length > 0) {
      const filename = data.query.search[0].title.replace('File:', '');
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
    }
  } catch (e) {}

  // 4. Fallback to Unsplash
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(characterName)}`;
}
```

---

## Recommended Setup

### For One Piece Characters:

**Use MediaWiki API** (simplest and most reliable):

```
Claude generates names + slugs
  ↓
MediaWiki API: pageimages prop
  ↓
Get original image URL
  ↓
Save to Google Sheets
```

**Expected output:**
```csv
onepiece_characters,Characters of One Piece,op_001,https://upload.wikimedia.org/wikipedia/en/4/4e/Monkey_D_Luffy.png,Monkey D. Luffy
onepiece_characters,Characters of One Piece,op_002,https://upload.wikimedia.org/wikipedia/en/7/77/Roronoa_Zoro.jpg,Roronoa Zoro
```

---

## Test Command

```bash
# Test MediaWiki API for all your characters
curl "https://en.wikipedia.org/w/api.php?action=query&titles=Monkey_D._Luffy|Roronoa_Zoro|Nami_(One_Piece)|Usopp|Sanji_(One_Piece)|Tony_Tony_Chopper&prop=pageimages&piprop=original&format=json&formatversion=2"
```

This returns all images in one API call!

---

**Want me to create the complete n8n workflow JSON using the MediaWiki API method?** It's the most reliable for Wikipedia images.
