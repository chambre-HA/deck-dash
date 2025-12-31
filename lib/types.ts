// Deck Dash Type Definitions

export interface Card {
  id: string;
  imageUrl: string;
  correctAnswer: string;
  wrongAnswers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
  previewImage?: string;
}

export interface GameSession {
  topicId: string;
  topicName: string;
  cards: Card[];
  currentCardIndex: number;
  correctCards: Card[];
  wrongCards: Card[];
  startTime: number;
  endTime?: number;
}

export interface GameResult {
  topicName: string;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  timeTaken: number; // in seconds
  score: number;
  correctCards: Card[];
  wrongCards: Card[];
}

export interface SheetRow {
  topic_id: string;
  topic_name: string;
  card_id: string;
  image_url: string;
  correct_answer: string;
  wrong_answer_1?: string; // Optional: wrong answers auto-generated if not provided
  wrong_answer_2?: string;
  wrong_answer_3?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}
