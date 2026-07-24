# CLAUDE.md - Deck Dash

## Overview
A fast-paced, time-based picture quiz game. Users view images and select correct answers from multiple choices, racing against time to earn bonus points. Features animated card swipes and comprehensive results tracking.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Image Export**: dom-to-image-more
- **Database**: Supabase (for future leaderboards)

## Key Features
- Image-based multiple choice questions (4 options)
- Animated card swipes (right=correct, left=wrong)
- Time-based scoring with bonuses/penalties
- Performance ratings and results breakdown
- Automated content generation via n8n + Claude
- Data stored in Google Sheets

## Project Structure
```
app/
├── page.tsx                    # Home page with topic selection
├── layout.tsx
├── [topicId]/page.tsx          # Topic selection route
├── play/[topicId]/page.tsx     # Main game play (30 cards)
├── results/[topicId]/page.tsx  # Results dashboard
├── request/page.tsx            # Request new deck form (async job pattern)
├── components/
│   ├── VibeUncleHeader.tsx
│   └── ProcessingScreen.tsx    # Shared async job waiting UI
└── api/
    ├── image-proxy/route.ts    # CORS bypass for images
    └── request-deck/
        ├── route.ts            # POST: submit deck request to n8n (returns jobId)
        └── status/route.ts     # GET: poll R2 for job completion
lib/
├── types.ts                    # TypeScript interfaces
├── googleSheets.ts             # Google Sheets CSV fetching
├── scoring.ts                  # Scoring algorithm
└── async-job/                  # Async job pattern (submit → poll → complete)
    ├── types.ts                # JobStatus, JobSubmitResponse, etc.
    ├── use-async-job.ts        # useAsyncJob() React hook
    └── index.ts                # Barrel exports
```

## Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/image-proxy?url=` | GET | Proxy images to bypass CORS/hotlinking |
| `/api/request-deck` | POST | Submit deck request to n8n, returns `{ jobId }` |
| `/api/request-deck/status?jobId=` | GET | Poll R2 for async job result |

## Scoring Algorithm
- **Base Score**: `correctCount × 100` points
- **Target Time**: `totalCards × 8 seconds`
- **Time Bonus**: `+10 points per second saved`
- **Time Penalty**: `-5 points per second over` (capped at base score)

## Environment Variables
```
# Required
NEXT_PUBLIC_GOOGLE_SHEETS_ID=your_google_sheet_id
N8N_WEBHOOK_URL=https://api.vibeuncle.com/webhook/generate-deck
R2_PUBLIC_URL=https://deck-dash-assets.vibeuncle.com

# Optional
NEXT_PUBLIC_GOOGLE_SHEETS_PUBLISHED_URL=custom_csv_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Async Job Pattern
Deck generation uses the standard VibeUncle async job pattern (see `/ASYNC_JOB_GUIDE.md`):
1. Client POSTs to `/api/request-deck` → n8n returns `{ jobId }` immediately
2. n8n processes AI request in background, writes result to R2 at `jobs/{jobId}.json`
3. Client polls `/api/request-deck/status?jobId=xxx` every 5 seconds
4. On completion, redirects to the new deck page

## Data Source
Uses Google Sheets "Publish to web" CSV export feature (no API key needed). Each row contains: topic_id, topic_name, question, correct_answer, wrong answers, image_url.
