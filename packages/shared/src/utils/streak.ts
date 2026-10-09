import type { PostureCheck } from '../types/index';
import {
  STREAK_ACKNOWLEDGMENT_THRESHOLD,
  STREAK_FREEZE_UNLOCK_LEVEL,
} from '../constants/index';

export interface DayRecord {
  date: string; // ISO date 'YYYY-MM-DD'
  checks?: PostureCheck[];
  acknowledgmentRate?: number;
  isComplete?: boolean;
}

export interface StreakBreakCheckResult {
  broken: boolean;
  freezeUsed: boolean;
}

export type StreakFlameTier = 'dimmed' | 'orange' | 'bright-orange-red' | 'golden';

export interface StreakFlameVisual {
  tier: StreakFlameTier;
  colorHex: string;
  label: string;
  glowClass: string;
}

/**
 * Calculates percentage of acknowledged checks for a given day (0–100).
 * Returns 0 if no checks are provided.
 */
export function calculateDailyAcknowledgmentRate(checks: PostureCheck[]): number {
  if (!checks || checks.length === 0) {
    return 0;
  }
  const acknowledged = checks.filter((c) => c.response === 'acknowledged').length;
  return Math.round((acknowledged / checks.length) * 100);
}

/**
 * Checks if a day qualifies as complete for streak tracking (>= threshold %).
 * Defaults to 80% per spec.
 */
export function isDayComplete(checks: PostureCheck[], threshold: number = 80): boolean {
  if (!checks || checks.length === 0) {
    return false;
  }
  return calculateDailyAcknowledgmentRate(checks) >= threshold;
}

/**
 * Helper to convert 'YYYY-MM-DD' or ISO timestamp string to UTC epoch day number.
 * Handles both plain date strings and full ISO timestamps safely.
 */
export function parseDateToEpochDays(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  const datePortion = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePortion.trim().split('-');
  if (parts.length < 3) return NaN;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return NaN;
  return Math.floor(Date.UTC(year, month, day) / 86400000);
}

/**
 * Helper to format a Date as local 'YYYY-MM-DD' string.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the local date string for yesterday ('YYYY-MM-DD').
 */
export function getYesterdayLocalDate(today: Date = new Date()): string {
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return formatLocalDate(yesterday);
}

/**
 * Returns the ISO 8601 week key (e.g. '2026-W41') for reliable weekly reset evaluation.
 * Starts on Monday, ensuring consistent resets regardless of which day the user opens the app.
 */
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Counts consecutive complete days backward from today.
 * If today is completed, streak includes today.
 * If today is in progress / not completed, streak is calculated from yesterday backward.
 * If daily records are missing or a day fails the >=80% threshold, streak ceases counting.
 */
export function calculateStreak(
  dailyHistory: DayRecord[],
  referenceDateStr?: string
): number {
  if (!dailyHistory || dailyHistory.length === 0) {
    return 0;
  }

  const todayStr = referenceDateStr ?? formatLocalDate();
  const todayDays = parseDateToEpochDays(todayStr);

  // Map records by epoch day to their completion status
  const completeMap = new Map<number, boolean>();

  for (const record of dailyHistory) {
    const epochDays = parseDateToEpochDays(record.date);
    if (isNaN(epochDays)) continue;

    let isComplete = false;
    if (record.isComplete !== undefined) {
      isComplete = record.isComplete;
    } else if (record.checks && record.checks.length > 0) {
      isComplete = isDayComplete(record.checks, STREAK_ACKNOWLEDGMENT_THRESHOLD * 100);
    } else if (record.acknowledgmentRate !== undefined) {
      isComplete = record.acknowledgmentRate >= STREAK_ACKNOWLEDGMENT_THRESHOLD * 100;
    }

    completeMap.set(epochDays, isComplete);
  }

  // Check if today is completed
  const todayCompleted = completeMap.get(todayDays) === true;

  // If today is completed, start streak counting from today
  // Otherwise, start checking backward from yesterday (today is still underway)
  const startDays = todayCompleted ? todayDays : todayDays - 1;

  let streak = 0;
  let cursor = startDays;

  while (completeMap.get(cursor) === true) {
    streak++;
    cursor--;
  }

  return streak;
}

/**
 * Evaluates whether a streak breaks based on the last complete date, today, and streak freeze availability.
 *
 * Rules:
 * - Difference 0 (same day) or 1 (yesterday complete): streak continues safely ({ broken: false, freezeUsed: false }).
 * - Difference 2 (missed yesterday):
 *   - If freeze available: freeze consumed, streak preserved ({ broken: false, freezeUsed: true }).
 *   - If no freeze: streak breaks ({ broken: true, freezeUsed: false }).
 * - Difference > 2 (missed 2 or more days):
 *   - Streak breaks regardless ({ broken: true, freezeUsed: false }).
 */
export function shouldStreakBreak(
  lastCompleteDate: string | null | undefined,
  today: string,
  hasFreeze: boolean
): StreakBreakCheckResult {
  if (!lastCompleteDate) {
    return { broken: false, freezeUsed: false };
  }

  const lastDays = parseDateToEpochDays(lastCompleteDate);
  const todayDays = parseDateToEpochDays(today);

  if (isNaN(lastDays) || isNaN(todayDays)) {
    return { broken: false, freezeUsed: false };
  }

  const diffDays = todayDays - lastDays;

  if (diffDays <= 1) {
    // Completed today or yesterday
    return { broken: false, freezeUsed: false };
  } else if (diffDays === 2) {
    // Missed exactly 1 day
    if (hasFreeze) {
      return { broken: false, freezeUsed: true };
    }
    return { broken: true, freezeUsed: false };
  } else {
    // Missed 2 or more days
    return { broken: true, freezeUsed: false };
  }
}

/**
 * Returns milestone if streak is 7, 14, 30, 60, or 100; null otherwise.
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones = [7, 14, 30, 60, 100] as const;
  if (milestones.includes(streak as (typeof milestones)[number])) {
    return streak;
  }
  return null;
}

/**
 * Returns visual tier and color styling for streak counter flame.
 * - 0 days: dimmed
 * - 1–6 days: orange (#FF9800)
 * - 7–29 days: bright orange-red (#FF5722)
 * - 30+ days: golden (#FFD54F)
 */
export function getStreakFlameVisual(streak: number): StreakFlameVisual {
  if (streak <= 0) {
    return {
      tier: 'dimmed',
      colorHex: '#8A9BB5',
      label: 'Start your streak today!',
      glowClass: 'opacity-40 text-theme-muted',
    };
  }
  if (streak < 7) {
    return {
      tier: 'orange',
      colorHex: '#FF9800',
      label: `🔥 ${streak}-day streak!`,
      glowClass: 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    };
  }
  if (streak < 30) {
    return {
      tier: 'bright-orange-red',
      colorHex: '#FF5722',
      label: `🔥 ${streak}-day streak!`,
      glowClass: 'text-coral-alert drop-shadow-[0_0_12px_rgba(255,112,67,0.7)]',
    };
  }
  return {
    tier: 'golden',
    colorHex: '#FFD54F',
    label: `🔥 ${streak}-day streak!`,
    glowClass: 'text-golden-xp drop-shadow-[0_0_16px_rgba(255,213,79,0.9)]',
  };
}

/**
 * Checks if streak freeze mechanic is unlocked for the user's level (Level 5+).
 */
export function isStreakFreezeUnlocked(level: number): boolean {
  return level >= STREAK_FREEZE_UNLOCK_LEVEL;
}
