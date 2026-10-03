import {
  LEVEL_THRESHOLDS,
  XP_PER_ACKNOWLEDGE,
  XP_DAILY_COMPLETION_BONUS,
  XP_STREAK_BONUS_PER_DAY,
  XP_STREAK_BONUS_CAP,
} from '../constants/index';

export interface LevelInfo {
  level: number;
  title: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

/**
 * Returns base XP awarded for acknowledging a posture reminder.
 * Acknowledging a reminder always grants exactly +10 XP.
 */
export function calculateXpForAcknowledge(): number {
  return XP_PER_ACKNOWLEDGE;
}

/**
 * Calculates bonus XP for maintaining a streak.
 * Formula: min(streakDays * 5, 100).
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return Math.min(streakDays * XP_STREAK_BONUS_PER_DAY, XP_STREAK_BONUS_CAP);
}

/**
 * Calculates daily completion bonus.
 * Awards +50 XP if all reminders in a day are acknowledged.
 */
export function calculateDailyCompletionBonus(
  acknowledgedCount: number,
  totalCount: number
): number {
  if (totalCount > 0 && acknowledgedCount >= totalCount) {
    return XP_DAILY_COMPLETION_BONUS;
  }
  return 0;
}

/**
 * Calculates current level, title, XP threshold bounds, and percentage completion.
 */
export function calculateLevelFromXp(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp);

  let currentTier = LEVEL_THRESHOLDS[0];
  let nextTier: (typeof LEVEL_THRESHOLDS)[number] | null = LEVEL_THRESHOLDS[1] || null;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentTier = LEVEL_THRESHOLDS[i];
      nextTier = i + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[i + 1] : null;
    } else {
      break;
    }
  }

  if (!nextTier) {
    // Reached max level (Zen Master, Level 25)
    return {
      level: currentTier.level,
      title: currentTier.title,
      xpForCurrentLevel: currentTier.xpRequired,
      xpForNextLevel: currentTier.xpRequired,
      progressPercent: 100,
    };
  }

  const xpIntoLevel = safeXp - currentTier.xpRequired;
  const xpSpan = nextTier.xpRequired - currentTier.xpRequired;
  const progressPercent =
    xpSpan > 0
      ? Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpSpan) * 100)))
      : 100;

  return {
    level: currentTier.level,
    title: currentTier.title,
    xpForCurrentLevel: currentTier.xpRequired,
    xpForNextLevel: nextTier.xpRequired,
    progressPercent,
  };
}

/**
 * Returns XP remaining until the next level threshold.
 */
export function getXpToNextLevel(totalXp: number): number {
  const safeXp = Math.max(0, totalXp);
  const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xpRequired;
  if (safeXp >= maxThreshold) {
    return 0;
  }

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp < LEVEL_THRESHOLDS[i].xpRequired) {
      return LEVEL_THRESHOLDS[i].xpRequired - safeXp;
    }
  }
  return 0;
}

/**
 * Checks if XP crossed a level boundary from previousXp to newXp.
 */
export function isLevelUp(previousXp: number, newXp: number): boolean {
  if (newXp <= previousXp) return false;
  const prevLevel = calculateLevelFromXp(previousXp).level;
  const newLevel = calculateLevelFromXp(newXp).level;
  return newLevel > prevLevel;
}
