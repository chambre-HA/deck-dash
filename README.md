# Deck Dash

A fast-paced picture quiz game where you see an image and pick the correct answer from 4 choices. Cards swipe right for correct answers and left for wrong ones. Race against time for bonus points!

## Features

- **Visual Quiz Cards**: See a picture, choose the right answer
- **Swipe Mechanics**: Cards animate right (correct) or left (wrong)
- **Time-Based Scoring**: Base points + time bonus for faster answers
- **Progress Tracking**: Real-time progress bar and timer
- **Results Dashboard**: View correct/wrong stacks with detailed breakdown
- **Multiple Topics**: Choose from various card decks
- **Automated Content**: n8n + Claude API for daily card generation

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Framer Motion** - Animations
- **Google Sheets API** - Card data storage
- **n8n** - Workflow automation
- **Claude API** - AI-generated content

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Sheets

1. Create a new Google Sheet named "Deck Dash Cards"
2. Add header row: `topic_id | topic_name | card_id | image_url | correct_answer`
   - Optional columns: `wrong_answer_1 | wrong_answer_2 | wrong_answer_3 | difficulty | created_at`
   - **Note**: Wrong answers are auto-generated from other cards in the same topic!
3. Add your card data (see sample below)
4. **Publish to web**: File > Share > Publish to web
   - Select "deck_dash_cards" sheet (or "Entire Document")
   - Choose "Comma-separated values (.csv)"
   - Click "Publish"
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Sheet ID:
```env
NEXT_PUBLIC_GOOGLE_SHEETS_ID=your_sheet_id_here
```

**No API key needed!** The app uses the published CSV URL directly.

### 4. Add Sample Data

Add a few rows to your Google Sheet following this **simplified format** (wrong answers auto-generated):

```csv
topic_id,topic_name,card_id,image_url,correct_answer
animals_birds,Birds of the World,bird_001,https://images.unsplash.com/photo-1444464666168-49d633b86797,Sparrow
animals_birds,Birds of the World,bird_002,https://images.unsplash.com/photo-1552728089-57bdde30beb3,Eagle
animals_birds,Birds of the World,bird_003,https://images.unsplash.com/penguin.jpg,Penguin
animals_birds,Birds of the World,bird_004,https://images.unsplash.com/robin.jpg,Robin
```

**Note**: Each topic needs at least 4 cards to generate 3 wrong answers for each question!

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
deck-dash/
├── app/
│   ├── page.tsx                    # Home page with topic selection
│   ├── play/[topicId]/page.tsx    # Game play page
│   └── results/[topicId]/page.tsx # Results page
├── lib/
│   ├── types.ts                    # TypeScript interfaces
│   ├── googleSheets.ts             # Google Sheets API integration
│   └── scoring.ts                  # Scoring algorithm
├── GOOGLE_SHEETS_STRUCTURE.md      # Data structure documentation
└── N8N_DECK_DASH_WORKFLOW.md       # Automation workflow guide
```

## How It Works

### Game Flow

1. **Topic Selection**: User picks a deck from available topics
2. **Play Mode**: 30 cards are loaded and shuffled
3. **Answer Selection**: User picks from 4 randomized choices
4. **Card Animation**: Card swipes right (correct) or left (wrong)
5. **Progress Tracking**: Timer runs, progress bar updates
6. **Results**: Score calculated with time bonus, stacks displayed

### Scoring Algorithm

```
Base Score = Correct Answers × 100
Time Multiplier = 1.0x to 2.0x based on speed
Final Score = Base Score × Time Multiplier

Speed Tiers:
- ≤5s per card: 2.0x multiplier (max bonus)
- 5-15s per card: 1.5-2.0x sliding scale
- 15-30s per card: 1.0-1.5x sliding scale
- >30s per card: 1.0x (no bonus)
```

## Google Sheets Setup

See `GOOGLE_SHEETS_STRUCTURE.md` for detailed structure.

### Publishing Your Sheet

The app uses "Publish to web" which means:
- **No API key required** - simpler setup
- **No authentication** - faster loading
- **No quota limits** - unlimited requests
- **Private sheet** - people can't see your Google Sheet URL, only the published CSV data

The sheet must be named `deck_dash_cards` (or update `SHEET_NAME` in `lib/googleSheets.ts`).

## n8n Automation

See `N8N_DECK_DASH_WORKFLOW.md` for complete setup guide.

### Features

- Daily automated card generation
- Claude API for content creation
- Unsplash/Pexels for images
- Automatic Google Sheets updates
- Configurable topics and schedules

### Quick n8n Setup

1. Install n8n (Docker or Cloud)
2. Import workflow from documentation
3. Set environment variables:
   - `ANTHROPIC_API_KEY`
   - `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY`
   - `GOOGLE_SHEETS_ID`
4. Test manually, then enable cron schedule

## Future Enhancements

- [ ] User-created custom decks via AI prompts
- [ ] Multiplayer race mode
- [ ] Leaderboards (Supabase integration)
- [ ] Daily challenges
- [ ] Achievement system
- [ ] Social sharing of results
- [ ] Offline PWA support
- [ ] Multi-language support

## Contributing

This is a personal project. Feel free to fork and customize!

## License

MIT

---

Built with Next.js, powered by Claude AI
