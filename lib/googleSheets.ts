// Google Sheets API Integration

import { Card, Topic, SheetRow } from './types';

const SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || '';
const PUBLISHED_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_PUBLISHED_URL || '';
const SHEET_NAME = 'deck_dash_cards';

const CACHE_KEY = 'deck_dash_sheets_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  timestamp: number;
  data: string[][];
}

async function fetchSheetData(): Promise<string[][]> {
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const cacheData: CacheData = JSON.parse(cached);
      const isValid = Date.now() - cacheData.timestamp < CACHE_DURATION;
      if (isValid) {
        console.log('Using cached sheet data');
        return cacheData.data;
      }
    }
  }

  // Use published URL (CSV format) - no API key needed!
  const url = PUBLISHED_URL || `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }

  const csvText = await response.text();
  const data = parseCSV(csvText);

  // Cache the data
  if (typeof window !== 'undefined') {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  }

  return data;
}

// Simple CSV parser
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Handle quoted fields properly
    const row: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    row.push(currentField.trim());
    result.push(row);
  }

  return result;
}

function parseSheetRow(row: string[]): SheetRow | null {
  // Minimum: topic_id, topic_name, card_id, image_url, correct_answer
  if (row.length < 5) return null;

  const imageUrl = row[3]?.trim();

  // Skip cards without a valid image URL
  if (!imageUrl || imageUrl === '' || imageUrl === 'null' || imageUrl === 'undefined') {
    return null;
  }

  return {
    topic_id: row[0],
    topic_name: row[1],
    card_id: row[2],
    image_url: imageUrl,
    correct_answer: row[4],
    wrong_answer_1: row[5] || undefined,
    wrong_answer_2: row[6] || undefined,
    wrong_answer_3: row[7] || undefined,
    difficulty: (row[8] as 'easy' | 'medium' | 'hard') || 'medium',
    created_at: row[9] || new Date().toISOString()
  };
}

function sheetRowToCard(row: SheetRow): Card {
  return {
    id: row.card_id,
    imageUrl: row.image_url,
    correctAnswer: row.correct_answer,
    wrongAnswers: [
      row.wrong_answer_1,
      row.wrong_answer_2,
      row.wrong_answer_3
    ],
    difficulty: row.difficulty
  };
}

export async function getAvailableTopics(): Promise<Topic[]> {
  const data = await fetchSheetData();

  // Skip header row
  const rows = data.slice(1);

  // Group by topic_id
  const topicsMap = new Map<string, { name: string; cards: SheetRow[] }>();

  for (const row of rows) {
    const parsed = parseSheetRow(row);
    if (!parsed) continue;

    if (!topicsMap.has(parsed.topic_id)) {
      topicsMap.set(parsed.topic_id, {
        name: parsed.topic_name,
        cards: []
      });
    }

    topicsMap.get(parsed.topic_id)!.cards.push(parsed);
  }

  // Convert to Topic array
  const topics: Topic[] = [];

  for (const [id, data] of topicsMap.entries()) {
    topics.push({
      id,
      name: data.name,
      cardCount: data.cards.length,
      previewImage: data.cards[0]?.image_url
    });
  }

  return topics;
}

export async function getCardsForTopic(topicId: string, limit: number = 30): Promise<Card[]> {
  const data = await fetchSheetData();

  // Skip header row
  const rows = data.slice(1);

  const allCardsInTopic: SheetRow[] = [];

  // Collect all cards in this topic
  for (const row of rows) {
    const parsed = parseSheetRow(row);
    if (!parsed || parsed.topic_id !== topicId) continue;

    allCardsInTopic.push(parsed);
  }

  // Select cards (up to limit)
  const selectedCards = allCardsInTopic.slice(0, limit);

  // Generate cards with random wrong answers from the same topic
  const cards: Card[] = selectedCards.map(cardRow => {
    // Get all other correct answers in this topic (excluding current card)
    const otherAnswers = allCardsInTopic
      .filter(c => c.card_id !== cardRow.card_id)
      .map(c => c.correct_answer);

    // Randomly pick 3 wrong answers from other cards
    const wrongAnswers = getRandomItems(otherAnswers, 3);

    return {
      id: cardRow.card_id,
      imageUrl: cardRow.image_url,
      correctAnswer: cardRow.correct_answer,
      wrongAnswers: wrongAnswers,
      difficulty: cardRow.difficulty
    };
  });

  // Shuffle the cards for variety
  return shuffleArray(cards);
}

// Helper function to get N random items from an array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

export function clearCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
  }
}

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
