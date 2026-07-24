# Recent Changes - Dynamic Wrong Answers

## What Changed (Dec 28, 2025)

### Feature: Random Wrong Answer Generation

Wrong answers are now **automatically generated** by randomly selecting 3 correct answers from other cards in the same topic.

### Benefits

1. **Simpler Content Creation**: Only need to provide `correct_answer`, not 3 wrong answers
2. **More Variety**: Wrong answers are randomized each game session
3. **Better Replayability**: Same deck feels different each time
4. **Easier Maintenance**: Less data to manage in Google Sheets

### Updated Google Sheets Structure

**Before** (10 columns):
```csv
topic_id,topic_name,card_id,image_url,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,difficulty,created_at
```

**After** (5 required columns):
```csv
topic_id,topic_name,card_id,image_url,correct_answer
```

Optional columns (difficulty, created_at) still supported but not required.

### Minimum Requirements

- **At least 4 cards per topic** to generate 3 wrong answers
- All cards in a topic should have unique `correct_answer` values

### Example

If your topic has these cards:
- Sparrow
- Eagle
- Penguin
- Robin
- Owl

When showing "Sparrow", the app will randomly pick 3 from {Eagle, Penguin, Robin, Owl} as wrong answers.

### Code Changes

Files modified:
- `lib/googleSheets.ts` - Added `getRandomItems()` helper and updated `getCardsForTopic()`
- `lib/types.ts` - Made `wrong_answer_*` fields optional in `SheetRow`
- `GOOGLE_SHEETS_STRUCTURE.md` - Updated documentation
- `README.md` - Simplified setup instructions

### Migration Guide

If you already have data with static wrong answers:

**Option A**: Keep as-is (wrong answers will be ignored, random ones used)
**Option B**: Clean up your sheet to only include required columns

No action needed - the app will work with both formats!

---

**Your existing sheet will work immediately** - just refresh the app cache or clear localStorage.
