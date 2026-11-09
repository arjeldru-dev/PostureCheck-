import { describe, it, expect } from 'vitest';
import {
  checkAchievements,
  ACHIEVEMENT_DEFINITIONS,
  PERFECT_DAY_MIN_CHECKS,
  type GameState,
} from '@posture-check/shared';

const base: GameState = {
  unlockedIds: [],
  totalChecks: 5,
  currentStreak: 1,
  currentLevel: 2,
  todayChecks: 5,
  todayAcknowledged: 2,
};

// Local-time dates (time-of-day rules must use local hours, not UTC)
const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);
const ids = (r: ReturnType<typeof checkAchievements>) => r.map((u) => u.achievement.id).sort();

describe('achievement definitions', () => {
  it('defines all 10 spec achievements with correct XP', () => {
    const xp = Object.fromEntries(ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a.xpReward]));
    expect(xp).toEqual({
      first_ribbit: 25,
      week_warrior: 50,
      month_master: 100,
      early_bird: 25,
      night_owl: 25,
      perfect_day: 50,
      phone_friend: 25,
      customizer: 10,
      centurion: 75,
      frog_whisperer: 100,
    });
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expect(a.hint.length).toBeGreaterThan(0);
      expect(['milestones', 'habits', 'actions']).toContain(a.category);
    }
  });
});

describe('checkAchievements', () => {
  it('unlocks First Ribbit on the first acknowledgment', () => {
    const r = checkAchievements(
      { ...base, totalChecks: 1 },
      { type: 'acknowledge', at: at(10) }
    );
    expect(ids(r)).toEqual(['first_ribbit']);
    expect(r[0].unlockedAt).toBe(at(10).toISOString());
  });

  it('does not unlock action-based badges on unrelated actions', () => {
    const r = checkAchievements({ ...base, totalChecks: 1 }, { type: 'sync', at: at(5) });
    expect(r).toEqual([]);
  });

  it('is idempotent: already-unlocked achievements are skipped', () => {
    const r = checkAchievements(
      { ...base, totalChecks: 1, unlockedIds: new Set(['first_ribbit']) },
      { type: 'acknowledge', at: at(10) }
    );
    expect(r).toEqual([]);
  });

  it('Early Bird only between 4:00 and 6:59 local', () => {
    const eb = (h: number, m = 0) =>
      ids(checkAchievements(base, { type: 'acknowledge', at: at(h, m) })).includes('early_bird');
    expect(eb(0, 30)).toBe(false); // still up after midnight — not "early"
    expect(eb(3, 59)).toBe(false);
    expect(eb(4, 0)).toBe(true);
    expect(eb(6, 59)).toBe(true);
    expect(eb(7, 0)).toBe(false);
  });

  it('Perfect Day hint explains the no-snooze rule', () => {
    const hint = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === 'perfect_day')!.hint;
    expect(hint).toMatch(/without snoozing/);
  });

  it('Night Owl at/after 11 PM local', () => {
    expect(ids(checkAchievements(base, { type: 'acknowledge', at: at(23, 5) }))).toContain(
      'night_owl'
    );
    expect(ids(checkAchievements(base, { type: 'acknowledge', at: at(22, 59) }))).not.toContain(
      'night_owl'
    );
  });

  it('Perfect Day needs every reminder acknowledged and a minimum count', () => {
    const n = PERFECT_DAY_MIN_CHECKS;
    expect(
      ids(
        checkAchievements(
          { ...base, todayChecks: n, todayAcknowledged: n },
          { type: 'acknowledge', at: at(15) }
        )
      )
    ).toContain('perfect_day');
    expect(
      ids(
        checkAchievements(
          { ...base, todayChecks: n + 1, todayAcknowledged: n },
          { type: 'acknowledge', at: at(15) }
        )
      )
    ).not.toContain('perfect_day');
    expect(
      ids(
        checkAchievements(
          { ...base, todayChecks: 1, todayAcknowledged: 1 },
          { type: 'acknowledge', at: at(9) }
        )
      )
    ).not.toContain('perfect_day');
  });

  it('streak thresholds: Week Warrior at 7, Month Master at 30', () => {
    expect(ids(checkAchievements({ ...base, currentStreak: 6 }, { type: 'streak_update' }))).toEqual(
      []
    );
    expect(ids(checkAchievements({ ...base, currentStreak: 7 }, { type: 'streak_update' }))).toEqual(
      ['week_warrior']
    );
    expect(
      ids(checkAchievements({ ...base, currentStreak: 30 }, { type: 'streak_update' }))
    ).toEqual(['month_master', 'week_warrior']);
  });

  it('Centurion at 100 total checks', () => {
    expect(
      ids(
        checkAchievements(
          { ...base, totalChecks: 100, unlockedIds: ['first_ribbit'] },
          { type: 'acknowledge', at: at(12) }
        )
      )
    ).toEqual(['centurion']);
  });

  it('Frog Whisperer at Level 10', () => {
    expect(ids(checkAchievements({ ...base, currentLevel: 9 }, { type: 'level_up' }))).toEqual([]);
    expect(ids(checkAchievements({ ...base, currentLevel: 10 }, { type: 'level_up' }))).toEqual([
      'frog_whisperer',
    ]);
  });

  it('Customizer only for intensity setting changes', () => {
    expect(
      ids(checkAchievements(base, { type: 'setting_change', setting: 'intensity' }))
    ).toEqual(['customizer']);
    expect(ids(checkAchievements(base, { type: 'setting_change', setting: 'theme' }))).toEqual([]);
  });

  it('Phone Friend on phone routing setup', () => {
    expect(ids(checkAchievements(base, { type: 'phone_routing_setup' }))).toEqual([
      'phone_friend',
    ]);
  });

  it('sync backfills state-based achievements only', () => {
    const r = checkAchievements(
      { ...base, totalChecks: 150, currentStreak: 8, currentLevel: 11 },
      { type: 'sync', at: at(6) }
    );
    expect(ids(r)).toEqual(['centurion', 'frog_whisperer', 'week_warrior']);
  });
});
