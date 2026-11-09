import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGamificationStore } from '../gamificationStore';
import { ACHIEVEMENT_DEFINITIONS, formatLocalDate, getIsoWeekKey } from '@posture-check/shared';

// Pretend every badge is already earned so XP-formula tests aren't affected by rewards
const ALL_UNLOCKED = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, '2026-01-01T00:00:00.000Z'])
);

describe('Gamification Store', () => {
  let dispatchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatchSpy = vi.fn();
    (globalThis as unknown as { window: unknown }).window = {
      dispatchEvent: dispatchSpy,
    };
    useGamificationStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default values', () => {
    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(0);
    expect(state.currentLevel).toBe(1);
    expect(state.levelTitle).toBe('Tadpole');
    expect(state.progressPercent).toBe(0);
    expect(state.xpToNextLevel).toBe(100);
    expect(state.currentStreak).toBe(0);
    expect(state.streakFreezeAvailable).toBe(false);
  });

  it('initializes from SQLite/mock getProgress', async () => {
    await useGamificationStore.getState().initialize();
    const state = useGamificationStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.totalXp).toBeGreaterThanOrEqual(0);
    expect(state.currentLevel).toBeGreaterThanOrEqual(1);
  });

  it('adds XP and updates level progress correctly', async () => {
    const result = await useGamificationStore.getState().addXp(50, 'manual_test');

    expect(result.previousXp).toBe(0);
    expect(result.newXp).toBe(50);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);

    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(50);
    expect(state.progressPercent).toBe(50);
    expect(state.xpToNextLevel).toBe(50);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'xp-gained',
      })
    );
  });

  it('detects level up and emits level-up event', async () => {
    // Add 100 XP to reach Level 2 (Froglet)
    const result = await useGamificationStore.getState().addXp(100, 'test_levelup');

    expect(result.leveledUp).toBe(true);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.newTitle).toBe('Froglet');

    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(100);
    expect(state.currentLevel).toBe(2);
    expect(state.levelTitle).toBe('Froglet');

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'level-up',
      })
    );
  });

  it('handleAcknowledge grants exactly 10 XP base + streak bonus', async () => {
    useGamificationStore.setState({ currentStreak: 4, unlockedAchievements: ALL_UNLOCKED });

    const result = await useGamificationStore.getState().handleAcknowledge();

    expect(result.baseEarned).toBe(10);
    expect(result.streakBonus).toBe(20); // 4 days * 5 XP = 20 XP
    expect(result.totalEarned).toBe(30);

    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(30);
    expect(state.totalChecks).toBe(1);
  });

  it('handleAcknowledge grants daily completion bonus when goal reached', async () => {
    useGamificationStore.setState({
      currentStreak: 0,
      todayChecksCount: 5,
      todayAcknowledgedCount: 4, // 4 already acknowledged, this 5th completes the day
      unlockedAchievements: ALL_UNLOCKED, // isolate XP formula from achievement rewards
    });

    const result = await useGamificationStore.getState().handleAcknowledge();

    expect(result.baseEarned).toBe(10);
    expect(result.streakBonus).toBe(0);
    expect(result.dailyBonus).toBe(50);
    expect(result.totalEarned).toBe(60);

    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(60);
  });

  it('checkStreakStatus resets streak to 0 and emits streak-broken when gap exceeds 1 day without freeze', async () => {
    useGamificationStore.setState({
      currentStreak: 6,
      streakFreezeAvailable: false,
      lastCheckDate: '2020-01-01', // long past date
    });

    const res = await useGamificationStore.getState().checkStreakStatus();

    expect(res.broken).toBe(true);
    expect(res.streak).toBe(0);
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streak-broken',
      })
    );
  });

  it('checkStreakStatus consumes freeze and preserves streak when exactly 1 day was missed', async () => {
    // Compute date 2 days ago
    const now = new Date();
    const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    const twoDaysAgoStr = formatLocalDate(twoDaysAgo);

    useGamificationStore.setState({
      currentStreak: 10,
      streakFreezeAvailable: true,
      freezeUsedThisWeek: false,
      lastCheckDate: twoDaysAgoStr,
    });

    const res = await useGamificationStore.getState().checkStreakStatus();

    expect(res.broken).toBe(false);
    expect(res.freezeUsed).toBe(true);
    expect(res.streak).toBe(10);
    expect(useGamificationStore.getState().streakFreezeAvailable).toBe(false);
    expect(useGamificationStore.getState().freezeUsedThisWeek).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streak-freeze-used',
      })
    );
  });

  it('handleAcknowledge emits streak-milestone on milestone 7-day streak', async () => {
    // Current streak 6, yesterday was checked in, today this check will reach >= 80%
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);

    useGamificationStore.setState({
      currentStreak: 6,
      longestStreak: 6,
      lastCheckDate: yesterdayStr,
      todayChecksCount: 1,
      todayAcknowledgedCount: 0,
    });

    const result = await useGamificationStore.getState().handleAcknowledge();

    expect(result.streak).toBe(7);
    expect(result.streakMilestone).toBe(7);
    expect(useGamificationStore.getState().currentStreak).toBe(7);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streak-milestone',
        detail: { streak: 7 },
      })
    );
  });

  it('checkStreakStatus advances lastCheckDate on freeze so subsequent checks on the same day do not break streak', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    const twoDaysAgoStr = formatLocalDate(twoDaysAgo);

    useGamificationStore.setState({
      currentStreak: 10,
      streakFreezeAvailable: true,
      freezeUsedThisWeek: false,
      lastCheckDate: twoDaysAgoStr,
    });

    // First check: freeze consumed
    const firstCheck = await useGamificationStore.getState().checkStreakStatus();
    expect(firstCheck.freezeUsed).toBe(true);
    expect(firstCheck.broken).toBe(false);
    expect(firstCheck.streak).toBe(10);
    expect(useGamificationStore.getState().streakFreezeAvailable).toBe(false);

    // Second check on the same day: MUST NOT break the streak!
    const secondCheck = await useGamificationStore.getState().checkStreakStatus();
    expect(secondCheck.broken).toBe(false);
    expect(secondCheck.streak).toBe(10);
    expect(useGamificationStore.getState().currentStreak).toBe(10);
  });

  it('resets weekly freeze in a new ISO week regardless of login day', async () => {
    useGamificationStore.setState({
      currentLevel: 5,
      streakFreezeAvailable: false,
      freezeUsedThisWeek: true,
      lastFreezeWeek: '2020-W01', // old week
    });

    await useGamificationStore.getState().checkStreakStatus();

    expect(useGamificationStore.getState().streakFreezeAvailable).toBe(true);
    expect(useGamificationStore.getState().freezeUsedThisWeek).toBe(false);
  });

  it('reconcileSleepWakeRollover resets counts and checks streak after date rolls over during sleep', async () => {
    useGamificationStore.setState({
      lastEvaluatedDate: '2026-10-01', // Date in the past (as if computer was suspended)
      todayChecksCount: 5,
      todayAcknowledgedCount: 5,
      todayChecks: 5,
      todayAcknowledged: 5,
    });

    await useGamificationStore.getState().reconcileSleepWakeRollover();

    const state = useGamificationStore.getState();
    expect(state.lastEvaluatedDate).toBe(formatLocalDate());
    expect(state.todayChecksCount).toBe(0);
    expect(state.todayAcknowledgedCount).toBe(0);
  });

  it('useStreakFreeze consumes active freeze and persists', async () => {
    useGamificationStore.setState({
      streakFreezeAvailable: true,
      freezeUsedThisWeek: false,
    });

    const used = await useGamificationStore.getState().useStreakFreeze();
    expect(used).toBe(true);
    expect(useGamificationStore.getState().streakFreezeAvailable).toBe(false);
    expect(useGamificationStore.getState().freezeUsedThisWeek).toBe(true);

    const usedAgain = await useGamificationStore.getState().useStreakFreeze();
    expect(usedAgain).toBe(false);
  });

  it('resetWeeklyFreeze restores freeze for users Level 5 and above', async () => {
    useGamificationStore.setState({
      currentLevel: 5,
      streakFreezeAvailable: false,
      freezeUsedThisWeek: true,
    });

    await useGamificationStore.getState().resetWeeklyFreeze();

    expect(useGamificationStore.getState().streakFreezeAvailable).toBe(true);
    expect(useGamificationStore.getState().freezeUsedThisWeek).toBe(false);
  });

  describe('weekly streak freeze (persisted)', () => {
    const progress = (overrides: Record<string, unknown>) => ({
      id: 1,
      totalXp: 1000, // Level 5
      currentLevel: 5,
      currentStreak: 3,
      longestStreak: 3,
      totalChecks: 10,
      streakFreezeAvailable: true, // ignored by the store: availability is derived
      lastCheckDate: formatLocalDate(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });

    it('a freeze used this week stays used after a sync, even at Level 5+', () => {
      useGamificationStore
        .getState()
        .syncWithProgress(progress({ lastFreezeWeek: getIsoWeekKey() }));
      const s = useGamificationStore.getState();
      expect(s.streakFreezeAvailable).toBe(false);
      expect(s.freezeUsedThisWeek).toBe(true);
    });

    it('gaining XP does not re-grant a freeze already used this week', async () => {
      useGamificationStore.setState({
        unlockedAchievements: ALL_UNLOCKED,
        lastFreezeWeek: getIsoWeekKey(),
      });
      await useGamificationStore.getState().addXp(1000, 'test'); // reaches Level 5
      expect(useGamificationStore.getState().currentLevel).toBeGreaterThanOrEqual(5);
      expect(useGamificationStore.getState().streakFreezeAvailable).toBe(false);
    });

    it('a freeze used in a previous week is available again', () => {
      useGamificationStore.getState().syncWithProgress(progress({ lastFreezeWeek: '2020-W01' }));
      expect(useGamificationStore.getState().streakFreezeAvailable).toBe(true);
    });

    it('below Level 5 there is no freeze regardless of week', () => {
      useGamificationStore
        .getState()
        .syncWithProgress(progress({ totalXp: 50, currentLevel: 1, lastFreezeWeek: null }));
      expect(useGamificationStore.getState().streakFreezeAvailable).toBe(false);
    });
  });
});
