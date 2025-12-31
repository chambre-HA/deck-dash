// Scoring Algorithm

export interface ScoreCalculation {
  basePoints: number;
  timeBonus: number;
  totalScore: number;
  averageTimePerCard: number;
}

const BASE_POINTS_PER_CORRECT = 100;
const MAX_TIME_BONUS_MULTIPLIER = 2.0; // Up to 2x bonus
const OPTIMAL_TIME_PER_CARD = 5; // 5 seconds = max bonus
const MAX_TIME_PER_CARD = 30; // 30 seconds = no bonus

/**
 * Calculate score based on correct answers and time taken
 *
 * Formula:
 * - Base Score = correctCount × 100
 * - Time Multiplier = 1.0 to 2.0 based on speed
 * - Final Score = Base Score × Time Multiplier
 *
 * Speed tiers:
 * - ≤5s per card: 2.0x multiplier (max bonus)
 * - 5-15s per card: 1.5-2.0x multiplier (sliding scale)
 * - 15-30s per card: 1.0-1.5x multiplier (sliding scale)
 * - >30s per card: 1.0x multiplier (no bonus)
 */
export function calculateScore(
  correctCount: number,
  totalCards: number,
  timeTakenSeconds: number
): ScoreCalculation {
  const basePoints = correctCount * BASE_POINTS_PER_CORRECT;

  if (correctCount === 0) {
    return {
      basePoints: 0,
      timeBonus: 0,
      totalScore: 0,
      averageTimePerCard: 0
    };
  }

  // Calculate average time per card
  const averageTimePerCard = timeTakenSeconds / totalCards;

  // Calculate time multiplier
  let timeMultiplier = 1.0;

  if (averageTimePerCard <= OPTIMAL_TIME_PER_CARD) {
    // Max bonus for very fast answers
    timeMultiplier = MAX_TIME_BONUS_MULTIPLIER;
  } else if (averageTimePerCard <= MAX_TIME_PER_CARD) {
    // Sliding scale between optimal and max time
    const timeRange = MAX_TIME_PER_CARD - OPTIMAL_TIME_PER_CARD;
    const timeOver = averageTimePerCard - OPTIMAL_TIME_PER_CARD;
    const bonusRange = MAX_TIME_BONUS_MULTIPLIER - 1.0;

    timeMultiplier = MAX_TIME_BONUS_MULTIPLIER - (timeOver / timeRange) * bonusRange;
  }

  const timeBonus = Math.round(basePoints * (timeMultiplier - 1.0));
  const totalScore = Math.round(basePoints * timeMultiplier);

  return {
    basePoints,
    timeBonus,
    totalScore,
    averageTimePerCard: Math.round(averageTimePerCard * 10) / 10
  };
}

/**
 * Format time in seconds to readable format
 * Examples:
 * - 45 -> "45s"
 * - 90 -> "1m 30s"
 * - 125 -> "2m 5s"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get performance rating based on score
 */
export function getPerformanceRating(
  correctCount: number,
  totalCards: number
): { rating: string; emoji: string; color: string } {
  const percentage = (correctCount / totalCards) * 100;

  if (percentage === 100) {
    return { rating: 'Perfect!', emoji: '🏆', color: 'text-yellow-500' };
  } else if (percentage >= 90) {
    return { rating: 'Excellent!', emoji: '⭐', color: 'text-green-500' };
  } else if (percentage >= 75) {
    return { rating: 'Great!', emoji: '👍', color: 'text-blue-500' };
  } else if (percentage >= 60) {
    return { rating: 'Good!', emoji: '👌', color: 'text-purple-500' };
  } else if (percentage >= 40) {
    return { rating: 'Keep Trying!', emoji: '💪', color: 'text-orange-500' };
  } else {
    return { rating: 'Practice More!', emoji: '📚', color: 'text-red-500' };
  }
}
