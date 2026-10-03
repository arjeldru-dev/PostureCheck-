import { describe, it, expect } from 'vitest';
import {
  calculateXpForAcknowledge,
  calculateStreakBonus,
  calculateDailyCompletionBonus,
  calculateLevelFromXp,
  getXpToNextLevel,
  isLevelUp,
  LEVEL_THRESHOLDS,
  XP_PER_ACKNOWLEDGE,
  XP_DAILY_COMPLETION_BONUS,
  XP_STREAK_BONUS_PER_DAY,
  XP_STREAK_BONUS_CAP,
} from '@posture-check/shared';

describe('XP & Level Progression System', () => {
  it('defines correct XP constants', () => {
    expect(XP_PER_ACKNOWLEDGE).toBe(10);
    expect(XP_DAILY_COMPLETION_BONUS).toBe(50);
    expect(XP_STREAK_BONUS_PER_DAY).toBe(5);
    expect(XP_STREAK_BONUS_CAP).toBe(100);
    expect(LEVEL_THRESHOLDS).toHaveLength(25);
  });

  it('calculateXpForAcknowledge returns 10 XP', () => {
    expect(calculateXpForAcknowledge()).toBe(10);
  });

  it('calculateStreakBonus calculates scaled bonus capped at 100', () => {
    expect(calculateStreakBonus(0)).toBe(0);
    expect(calculateStreakBonus(-5)).toBe(0);
    expect(calculateStreakBonus(1)).toBe(5);
    expect(calculateStreakBonus(5)).toBe(25);
    expect(calculateStreakBonus(20)).toBe(100);
    expect(calculateStreakBonus(30)).toBe(100);
  });

  it('calculateDailyCompletionBonus awards 50 only when all reminders acknowledged', () => {
    expect(calculateDailyCompletionBonus(0, 0)).toBe(0);
    expect(calculateDailyCompletionBonus(4, 5)).toBe(0);
    expect(calculateDailyCompletionBonus(5, 5)).toBe(50);
    expect(calculateDailyCompletionBonus(6, 5)).toBe(50);
  });

  it('calculateLevelFromXp computes correct levels across thresholds', () => {
    // 0 XP -> Level 1 Tadpole
    const lvl1 = calculateLevelFromXp(0);
    expect(lvl1.level).toBe(1);
    expect(lvl1.title).toBe('Tadpole');
    expect(lvl1.xpForCurrentLevel).toBe(0);
    expect(lvl1.xpForNextLevel).toBe(100);
    expect(lvl1.progressPercent).toBe(0);

    // 100 XP -> Level 2 Froglet
    const lvl2 = calculateLevelFromXp(100);
    expect(lvl2.level).toBe(2);
    expect(lvl2.title).toBe('Froglet');
    expect(lvl2.xpForCurrentLevel).toBe(100);
    expect(lvl2.xpForNextLevel).toBe(300);
    expect(lvl2.progressPercent).toBe(0);

    // 200 XP -> Level 2 Froglet (50% progress to 300)
    const midLvl2 = calculateLevelFromXp(200);
    expect(midLvl2.level).toBe(2);
    expect(midLvl2.progressPercent).toBe(50);

    // 50,000 XP -> Level 25 Zen Master
    const lvl25 = calculateLevelFromXp(50000);
    expect(lvl25.level).toBe(25);
    expect(lvl25.title).toBe('Zen Master');
    expect(lvl25.progressPercent).toBe(100);

    // Above max level stays Level 25
    const aboveMax = calculateLevelFromXp(99999);
    expect(aboveMax.level).toBe(25);
    expect(aboveMax.progressPercent).toBe(100);
  });

  it('getXpToNextLevel calculates remaining XP accurately', () => {
    expect(getXpToNextLevel(0)).toBe(100);
    expect(getXpToNextLevel(95)).toBe(5);
    expect(getXpToNextLevel(100)).toBe(200); // 300 - 100
    expect(getXpToNextLevel(50000)).toBe(0);
    expect(getXpToNextLevel(75000)).toBe(0);
  });

  it('isLevelUp accurately detects level threshold crossings', () => {
    // Crossing 95 -> 105 (crosses Level 2 boundary at 100)
    expect(isLevelUp(95, 105)).toBe(true);

    // Staying within Level 2 (105 -> 115)
    expect(isLevelUp(105, 115)).toBe(false);

    // Crossing 590 -> 610 (crosses Level 4 at 600)
    expect(isLevelUp(590, 610)).toBe(true);

    // No change or decrease
    expect(isLevelUp(100, 100)).toBe(false);
    expect(isLevelUp(200, 100)).toBe(false);
  });
});
