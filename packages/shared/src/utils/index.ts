import {
  LEVEL_THRESHOLDS,
  STREAK_ACKNOWLEDGMENT_THRESHOLD,
  XP_STREAK_BASE_MULTIPLIER,
  XP_STREAK_BONUS_CAP,
} from '../constants/index.js';
import type { LevelCalculationResult } from '../types/index.js';

/**
 * Calculates current level, title, XP in current level, and percentage to next level.
 */
export function calculateLevel(totalXp: number): LevelCalculationResult {
  const safeXp = Math.max(0, totalXp);

  let currentLevelIdx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentLevelIdx = i;
    } else {
      break;
    }
  }

  const currentTier = LEVEL_THRESHOLDS[currentLevelIdx];
  const nextTier =
    currentLevelIdx + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[currentLevelIdx + 1] : null;

  if (!nextTier) {
    // Max level reached
    return {
      level: currentTier.level,
      title: currentTier.title,
      currentLevelXp: safeXp - currentTier.xpRequired,
      nextLevelXp: null,
      progressPercent: 100,
    };
  }

  const xpIntoLevel = safeXp - currentTier.xpRequired;
  const xpSpan = nextTier.xpRequired - currentTier.xpRequired;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpSpan) * 100)));

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentLevelXp: xpIntoLevel,
    nextLevelXp: nextTier.xpRequired,
    progressPercent,
  };
}

/**
 * Calculates bonus XP awarded for maintaining a consecutive daily streak.
 * Formula: +5 XP * streak days, capped at +100 XP.
 */
export function calculateXpForStreak(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return Math.min(streakDays * XP_STREAK_BASE_MULTIPLIER, XP_STREAK_BONUS_CAP);
}

/**
 * Calculates posture score (0 to 100) based on acknowledgment rate.
 */
export function calculatePostureScore(acknowledgedCount: number, totalChecksCount: number): number {
  if (totalChecksCount <= 0) return 100;
  const score = Math.round((acknowledgedCount / totalChecksCount) * 100);
  return Math.max(0, Math.min(100, score));
}

/**
 * Checks if the daily posture score qualifies for maintaining a streak (>= 80%).
 */
export function isStreakMaintained(acknowledgedCount: number, totalChecksCount: number): boolean {
  if (totalChecksCount <= 0) return true;
  return acknowledgedCount / totalChecksCount >= STREAK_ACKNOWLEDGMENT_THRESHOLD;
}

/**
 * Helper to parse 'HH:MM' string into minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Checks if a given timestamp falls within active hours and active days.
 */
export function isWithinActiveHours(
  date: Date,
  startTime: string,
  endTime: string,
  activeDays: number[]
): boolean {
  const day = date.getDay();
  if (!activeDays.includes(day)) {
    return false;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight active hours (e.g. 22:00 to 04:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Calculates the next reminder Date based on interval and active schedule.
 */
export function getNextReminderTime(
  fromTime: Date,
  intervalMinutes: number,
  startTime: string,
  endTime: string,
  activeDays: number[]
): Date {
  const candidate = new Date(fromTime.getTime() + intervalMinutes * 60 * 1000);

  // If candidate is already in active hours, return it
  if (isWithinActiveHours(candidate, startTime, endTime, activeDays)) {
    return candidate;
  }

  // Otherwise, find the next active window start
  const cursor = new Date(candidate);
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const dayOfWeek = cursor.getDay();
    if (activeDays.includes(dayOfWeek)) {
      const [startH, startM] = startTime.split(':').map(Number);
      const windowStart = new Date(cursor);
      windowStart.setHours(startH, startM, 0, 0);

      if (windowStart.getTime() > fromTime.getTime()) {
        return windowStart;
      }
    }
    // Advance to next day at midnight
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return candidate;
}
