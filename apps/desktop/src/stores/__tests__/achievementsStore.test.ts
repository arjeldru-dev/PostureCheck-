import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type StoreModule = typeof import('../gamificationStore');
type TauriModule = typeof import('@/lib/tauri');

// Fresh module graph per test: the mock "database" in lib/tauri and the
// store's subscription/queue state start clean every time.
let store: StoreModule['useGamificationStore'];
let tauri: TauriModule;
let dispatchSpy: ReturnType<typeof vi.fn>;

const unlockedEvents = () =>
  dispatchSpy.mock.calls
    .map(([e]) => e as CustomEvent)
    .filter((e) => e.type === 'achievement-unlocked')
    .map((e) => e.detail);

beforeEach(async () => {
  // Noon local time: keeps Early Bird / Night Owl out of unrelated tests
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));

  dispatchSpy = vi.fn();
  // Minimal window (no `document`, matching the other store tests)
  (globalThis as unknown as { window: unknown }).window = {
    dispatchEvent: dispatchSpy,
    addEventListener: () => undefined,
  };

  vi.resetModules();
  store = (await import('../gamificationStore')).useGamificationStore;
  tauri = await import('@/lib/tauri');
  store.getState().reset();
});

afterEach(() => {
  store.getState().reset();
  vi.useRealTimers();
});

describe('Gamification Store — achievements', () => {
  it('first acknowledgment unlocks First Ribbit, grants +25 XP and emits the event', async () => {
    const result = await store.getState().handleAcknowledge();
    const state = store.getState();

    expect(state.unlockedAchievements.first_ribbit).toMatch(/Z$|\+00:00$/);
    expect(state.totalXp).toBe(result.totalEarned + 25);

    const events = unlockedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ achievementId: 'first_ribbit', xpReward: 25 });
    expect(state.pendingCelebrations.map((c) => c.achievementId)).toEqual(['first_ribbit']);
  });

  it('does not unlock or grant XP twice', async () => {
    await store.getState().handleAcknowledge();
    const xpAfterFirst = store.getState().totalXp;

    const second = await store.getState().evaluateAchievements({ type: 'acknowledge' });

    expect(second).toEqual([]);
    expect(store.getState().totalXp).toBe(xpAfterFirst);
    expect(unlockedEvents()).toHaveLength(1);
  });

  it('records but does not re-grant XP for an unlock already in the database', async () => {
    // Another window already persisted the unlock; this store hasn't seen it yet
    await tauri.unlockAchievement('frog_whisperer');
    store.setState({ currentLevel: 10, unlockedAchievements: {} });

    const r = await store.getState().evaluateAchievements({ type: 'level_up' });

    expect(r).toEqual([]);
    expect(store.getState().totalXp).toBe(0);
    expect(store.getState().unlockedAchievements.frog_whisperer).toBeTruthy();
    expect(unlockedEvents()).toHaveLength(0);
  });

  it('concurrent evaluations grant each achievement once', async () => {
    store.setState({ currentStreak: 7 });
    const [a, b] = await Promise.all([
      store.getState().evaluateAchievements({ type: 'streak_update' }),
      store.getState().evaluateAchievements({ type: 'streak_update' }),
    ]);
    expect([...a, ...b].map((u) => u.achievement.id)).toEqual(['week_warrior']);
    expect(store.getState().totalXp).toBe(50);
  });

  it('achievement XP that crosses Level 10 chains into Frog Whisperer', async () => {
    const { LEVEL_THRESHOLDS } = await import('@posture-check/shared');
    const lvl10 = LEVEL_THRESHOLDS.find((t) => t.level === 10)!.xpRequired;
    await store.getState().addXp(lvl10 - 10, 'setup');
    store.setState({
      totalChecks: 100,
      unlockedAchievements: { first_ribbit: '2026-01-01T00:00:00.000Z' },
    });

    const r = await store.getState().evaluateAchievements({ type: 'sync' });

    expect(r.map((u) => u.achievement.id)).toEqual(['centurion', 'frog_whisperer']);
    expect(store.getState().totalXp).toBe(lvl10 - 10 + 75 + 100);
  });

  it('uses the authoritative backend total when the unlock returns progress', async () => {
    // Backend says the DB total is 500 after granting +25 (e.g. a Rust ack
    // landed meanwhile) — the store must adopt it, not add to its stale copy.
    vi.spyOn(tauri, 'unlockAchievement').mockResolvedValueOnce({
      achievementId: 'customizer',
      newlyUnlocked: true,
      unlockedAt: '2026-11-09T04:00:00+00:00',
      xpReward: 10,
      progress: {
        id: 1,
        totalXp: 500,
        currentLevel: 3,
        currentStreak: 0,
        longestStreak: 0,
        totalChecks: 0,
        streakFreezeAvailable: false,
        updatedAt: '2026-11-09T04:00:00+00:00',
      },
    });

    await store.getState().evaluateAchievements({ type: 'setting_change', setting: 'intensity' });

    expect(store.getState().totalXp).toBe(500);
    expect(store.getState().unlockedAchievements.customizer).toBe('2026-11-09T04:00:00+00:00');
  });
});

describe('Backend acknowledgment path (how the Tauri app delivers acknowledgments)', () => {
  it('a notification-acknowledged event refreshes counts and unlocks achievements', async () => {
    await store.getState().initialize();
    expect(store.getState().unlockedAchievements.first_ribbit).toBeUndefined();

    // Same path as a click on an in-app / OS notification
    const notif = await tauri.testNotification(2);
    await tauri.handleNotificationAction('sitting_up', notif.id);

    await vi.waitFor(() => {
      expect(store.getState().unlockedAchievements.first_ribbit).toBeTruthy();
    });
    const stats = await tauri.getTodayStats();
    expect(store.getState().todayChecksCount).toBe(stats.totalChecksToday);
    expect(store.getState().todayAcknowledgedCount).toBe(stats.acknowledgedToday);
  });

  it('initialize() twice subscribes only once (one fetch per acknowledgment)', async () => {
    await store.getState().initialize();
    await store.getState().initialize();
    const getProgressSpy = vi.spyOn(tauri, 'getProgress');

    const notif = await tauri.testNotification(2);
    await tauri.handleNotificationAction('sitting_up', notif.id);

    await vi.waitFor(() => expect(store.getState().unlockedAchievements.first_ribbit).toBeTruthy());
    // Two subscriptions would each refetch progress for the same event
    expect(getProgressSpy).toHaveBeenCalledTimes(1);
  });

  it('acknowledged test notifications never evaluate achievements', async () => {
    const getProgressSpy = vi.spyOn(tauri, 'getProgress');
    await store.getState().handleBackendAcknowledged({ id: 'x', xpEarned: 0, isTest: true });

    expect(getProgressSpy).not.toHaveBeenCalled();
    expect(store.getState().unlockedAchievements).toEqual({});
    expect(unlockedEvents()).toHaveLength(0);
  });

  it('Early Bird unlocks at 6:30 local but not at 3:30', async () => {
    store.setState({ totalChecks: 5, unlockedAchievements: { first_ribbit: 'x' } });

    vi.setSystemTime(new Date(2026, 10, 9, 3, 30));
    await store.getState().handleBackendAcknowledged({ id: 'a', xpEarned: 10 });
    expect(store.getState().unlockedAchievements.early_bird).toBeUndefined();

    vi.setSystemTime(new Date(2026, 10, 9, 6, 30));
    await store.getState().handleBackendAcknowledged({ id: 'b', xpEarned: 10 });
    expect(store.getState().unlockedAchievements.early_bird).toBeTruthy();
  });
});

describe('Customizer via the settings store', () => {
  it('changing intensity unlocks Customizer (+10 XP)', async () => {
    const { useSettingsStore } = await import('../settingsStore');
    const before = useSettingsStore.getState().intensityLevel;
    await useSettingsStore.getState().setIntensityLevel(before === 4 ? 3 : 4);

    await vi.waitFor(() => expect(store.getState().unlockedAchievements.customizer).toBeTruthy());
    expect(store.getState().totalXp).toBe(10);
  });

  it('re-selecting the same intensity does not unlock Customizer', async () => {
    const { useSettingsStore } = await import('../settingsStore');
    const same = useSettingsStore.getState().intensityLevel;
    await useSettingsStore.getState().setIntensityLevel(same);
    await store.getState().evaluateAchievements({ type: 'sync' }); // flush the queue

    expect(store.getState().unlockedAchievements.customizer).toBeUndefined();
  });
});

describe('loadAchievements', () => {
  it('merges instead of replacing, so an in-flight unlock never flickers to locked', async () => {
    store.setState({ unlockedAchievements: { customizer: '2026-11-09T00:00:00Z' } });
    vi.spyOn(tauri, 'getAchievements').mockResolvedValueOnce([]);

    expect(await store.getState().loadAchievements()).toBe(true);
    expect(store.getState().unlockedAchievements.customizer).toBe('2026-11-09T00:00:00Z');
  });

  it('exposes an error for the gallery and clears it after a successful retry', async () => {
    vi.spyOn(tauri, 'getAchievements').mockRejectedValueOnce(new Error('db locked'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await store.getState().loadAchievements()).toBe(false);
    expect(store.getState().achievementsError).toBe('db locked');

    expect(await store.getState().loadAchievements()).toBe(true);
    expect(store.getState().achievementsError).toBeNull();
  });
});

describe('celebration queue', () => {
  it('consumeCelebrations returns pending unlocks once', async () => {
    store.setState({ currentStreak: 30 });
    await store.getState().evaluateAchievements({ type: 'streak_update' });

    const batch = store.getState().consumeCelebrations();
    expect(batch.map((c) => c.achievementId).sort()).toEqual(['month_master', 'week_warrior']);
    expect(store.getState().consumeCelebrations()).toEqual([]);
  });
});
