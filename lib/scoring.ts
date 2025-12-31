// Scoring Algorithm

export interface ScoreCalculation {
  basePoints: number;
  timeBonus: number;
  totalScore: number;
  averageTimePerCard: number;
}

const BASE_POINTS_PER_CORRECT = 100;
const TIME_BONUS_PER_SECOND_SAVED = 10; // 10 points per second saved
const TARGET_TIME_PER_CARD = 8; // Target: 8 seconds per card
const MAX_PENALTY_PER_SECOND = 5; // -5 points per second over target

/**
 * Calculate score based on correct answers and time taken
 *
 * NEW FORMULA - Every Second Counts:
 * - Base Score = correctCount × 100 points
 * - Time Bonus/Penalty based on TOTAL time vs target time:
 *   - Target Time = totalCards × 8 seconds
 *   - If faster: +10 points per second saved
 *   - If slower: -5 points per second over (capped at base score)
 * - Final Score = Base Score + Time Bonus (minimum 0)
 *
 * Examples (for 20 cards):
 * - 20 correct in 100s (target 160s): 2000 + (60s × 10) = 2,600 points
 * - 20 correct in 160s (on target): 2000 + 0 = 2,000 points
 * - 20 correct in 200s (40s over): 2000 - (40s × 5) = 1,800 points
 * - 15 correct in 120s (vs 160s): 1500 + (40s × 10) = 1,900 points
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

  // Calculate target time and time difference
  const targetTime = totalCards * TARGET_TIME_PER_CARD;
  const timeDifference = targetTime - timeTakenSeconds; // Positive = faster, Negative = slower

  // Calculate time bonus/penalty
  let timeBonus = 0;
  if (timeDifference > 0) {
    // Faster than target: bonus points
    timeBonus = Math.round(timeDifference * TIME_BONUS_PER_SECOND_SAVED);
  } else {
    // Slower than target: penalty points
    const penalty = Math.round(Math.abs(timeDifference) * MAX_PENALTY_PER_SECOND);
    // Cap penalty at base points (can't go below 0)
    timeBonus = -Math.min(penalty, basePoints);
  }

  const totalScore = Math.max(0, basePoints + timeBonus);
  const averageTimePerCard = timeTakenSeconds / totalCards;

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
