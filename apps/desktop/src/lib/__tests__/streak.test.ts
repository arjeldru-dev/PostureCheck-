import { describe, it, expect } from 'vitest';
import {
  calculateDailyAcknowledgmentRate,
  isDayComplete,
  calculateStreak,
  shouldStreakBreak,
  getStreakMilestone,
  getStreakFlameVisual,
  isStreakFreezeUnlocked,
  parseDateToEpochDays,
  getYesterdayLocalDate,
  getIsoWeekKey,
  type DayRecord,
  type PostureCheck,
} from '@posture-check/shared';

describe('Streak Tracking Utilities', () => {
  const makeCheck = (response: 'acknowledged' | 'snoozed' | 'dismissed' | 'expired'): PostureCheck => ({
    id: 'test',
    user_id: null,
    device_id: 'test-device',
    fired_at: new Date().toISOString(),
    acknowledged_at: response === 'acknowledged' ? new Date().toISOString() : null,
    response,
    intensity_level: 2,
    xp_earned: response === 'acknowledged' ? 10 : 0,
  });

  describe('calculateDailyAcknowledgmentRate', () => {
    it('returns 0 for empty array', () => {
      expect(calculateDailyAcknowledgmentRate([])).toBe(0);
    });

    it('calculates exact 80% when 8 out of 10 acknowledged', () => {
      const checks: PostureCheck[] = [
        ...Array.from({ length: 8 }, () => makeCheck('acknowledged')),
        ...Array.from({ length: 2 }, () => makeCheck('dismissed')),
      ];
      expect(calculateDailyAcknowledgmentRate(checks)).toBe(80);
    });

    it('calculates 100% when all acknowledged', () => {
      const checks: PostureCheck[] = Array.from({ length: 5 }, () => makeCheck('acknowledged'));
      expect(calculateDailyAcknowledgmentRate(checks)).toBe(100);
    });

    it('calculates 50% when 1 out of 2 acknowledged', () => {
      const checks: PostureCheck[] = [
        makeCheck('acknowledged'),
        makeCheck('snoozed'),
      ];
      expect(calculateDailyAcknowledgmentRate(checks)).toBe(50);
    });
  });

  describe('isDayComplete', () => {
    it('returns false for empty checks', () => {
      expect(isDayComplete([])).toBe(false);
    });

    it('returns true when acknowledgment rate >= 80%', () => {
      const checks: PostureCheck[] = [
        ...Array.from({ length: 4 }, () => makeCheck('acknowledged')),
        makeCheck('dismissed'),
      ]; // 4/5 = 80%
      expect(isDayComplete(checks, 80)).toBe(true);
    });

    it('returns false when acknowledgment rate is below threshold', () => {
      const checks: PostureCheck[] = [
        ...Array.from({ length: 3 }, () => makeCheck('acknowledged')),
        ...Array.from({ length: 2 }, () => makeCheck('dismissed')),
      ]; // 3/5 = 60%
      expect(isDayComplete(checks, 80)).toBe(false);
    });
  });

  describe('calculateStreak', () => {
    it('returns 0 for empty history', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('counts consecutive completed days backward from today', () => {
      const history: DayRecord[] = [
        { date: '2026-10-09', isComplete: true },
        { date: '2026-10-08', isComplete: true },
        { date: '2026-10-07', isComplete: true },
        { date: '2026-10-06', isComplete: false },
        { date: '2026-10-05', isComplete: true },
      ];
      expect(calculateStreak(history, '2026-10-09')).toBe(3);
    });

    it('preserves active streak from yesterday if today is still in progress', () => {
      const history: DayRecord[] = [
        { date: '2026-10-09', isComplete: false }, // Today incomplete
        { date: '2026-10-08', isComplete: true },  // Yesterday complete
        { date: '2026-10-07', isComplete: true },
      ];
      expect(calculateStreak(history, '2026-10-09')).toBe(2);
    });

    it('returns 0 if yesterday was missed and today is not completed', () => {
      const history: DayRecord[] = [
        { date: '2026-10-09', isComplete: false },
        { date: '2026-10-08', isComplete: false },
        { date: '2026-10-07', isComplete: true },
      ];
      expect(calculateStreak(history, '2026-10-09')).toBe(0);
    });

    it('stops counting when there is a missing calendar day gap', () => {
      const history: DayRecord[] = [
        { date: '2026-10-09', isComplete: true },
        { date: '2026-10-08', isComplete: true },
        // 2026-10-07 is missing
        { date: '2026-10-06', isComplete: true },
      ];
      expect(calculateStreak(history, '2026-10-09')).toBe(2);
    });
  });

  describe('shouldStreakBreak', () => {
    it('returns broken: false if last complete was today', () => {
      const res = shouldStreakBreak('2026-10-09', '2026-10-09', false);
      expect(res).toEqual({ broken: false, freezeUsed: false });
    });

    it('returns broken: false if last complete was yesterday', () => {
      const res = shouldStreakBreak('2026-10-08', '2026-10-09', false);
      expect(res).toEqual({ broken: false, freezeUsed: false });
    });

    it('returns broken: false and freezeUsed: true if missed yesterday with freeze available', () => {
      const res = shouldStreakBreak('2026-10-07', '2026-10-09', true);
      expect(res).toEqual({ broken: false, freezeUsed: true });
    });

    it('returns broken: true if missed yesterday without freeze', () => {
      const res = shouldStreakBreak('2026-10-07', '2026-10-09', false);
      expect(res).toEqual({ broken: true, freezeUsed: false });
    });

    it('returns broken: true if missed 2 or more days even with freeze', () => {
      const res = shouldStreakBreak('2026-10-06', '2026-10-09', true);
      expect(res).toEqual({ broken: true, freezeUsed: false });
    });

    it('handles undefined or null lastCompleteDate safely', () => {
      const res = shouldStreakBreak(null, '2026-10-09', false);
      expect(res).toEqual({ broken: false, freezeUsed: false });
    });
  });

  describe('getStreakMilestone', () => {
    it('returns milestone for 7, 14, 30, 60, 100', () => {
      expect(getStreakMilestone(7)).toBe(7);
      expect(getStreakMilestone(14)).toBe(14);
      expect(getStreakMilestone(30)).toBe(30);
      expect(getStreakMilestone(60)).toBe(60);
      expect(getStreakMilestone(100)).toBe(100);
    });

    it('returns null for non-milestone numbers', () => {
      expect(getStreakMilestone(1)).toBeNull();
      expect(getStreakMilestone(6)).toBeNull();
      expect(getStreakMilestone(8)).toBeNull();
      expect(getStreakMilestone(29)).toBeNull();
      expect(getStreakMilestone(45)).toBeNull();
    });
  });

  describe('getStreakFlameVisual', () => {
    it('returns dimmed tier for 0 streak', () => {
      const visual = getStreakFlameVisual(0);
      expect(visual.tier).toBe('dimmed');
      expect(visual.label).toBe('Start your streak today!');
    });

    it('returns orange tier for 1-6 streak', () => {
      const visual = getStreakFlameVisual(5);
      expect(visual.tier).toBe('orange');
      expect(visual.colorHex).toBe('#FF9800');
      expect(visual.label).toBe('🔥 5-day streak!');
    });

    it('returns bright-orange-red tier for 7-29 streak', () => {
      const visual = getStreakFlameVisual(14);
      expect(visual.tier).toBe('bright-orange-red');
      expect(visual.colorHex).toBe('#FF5722');
      expect(visual.label).toBe('🔥 14-day streak!');
    });

    it('returns golden tier for 30+ streak', () => {
      const visual = getStreakFlameVisual(30);
      expect(visual.tier).toBe('golden');
      expect(visual.colorHex).toBe('#FFD54F');
      expect(visual.label).toBe('🔥 30-day streak!');
    });
  });

  describe('isStreakFreezeUnlocked', () => {
    it('unlocks only at Level 5 and above', () => {
      expect(isStreakFreezeUnlocked(1)).toBe(false);
      expect(isStreakFreezeUnlocked(4)).toBe(false);
      expect(isStreakFreezeUnlocked(5)).toBe(true);
      expect(isStreakFreezeUnlocked(10)).toBe(true);
    });
  });

  describe('Date and Week Helpers', () => {
    it('parseDateToEpochDays safely parses ISO timestamps with time/offset', () => {
      const fromPlain = parseDateToEpochDays('2026-10-09');
      const fromIso = parseDateToEpochDays('2026-10-09T14:30:00.000Z');
      expect(fromPlain).toBe(fromIso);
      expect(fromIso).not.toBeNaN();
    });

    it('parseDateToEpochDays returns NaN for invalid date strings', () => {
      expect(parseDateToEpochDays('')).toBeNaN();
      expect(parseDateToEpochDays('invalid-date')).toBeNaN();
    });

    it('getYesterdayLocalDate returns yesterday in local YYYY-MM-DD format', () => {
      const today = new Date(2026, 9, 9); // Oct 9, 2026
      const yesterday = getYesterdayLocalDate(today);
      expect(yesterday).toBe('2026-10-08');
    });

    it('getIsoWeekKey produces standard ISO week format YYYY-Www', () => {
      const date = new Date(2026, 9, 9); // Friday Oct 9, 2026
      const weekKey = getIsoWeekKey(date);
      expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    });
  });
});
