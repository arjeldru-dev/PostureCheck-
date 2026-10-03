import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGamificationStore } from '../gamificationStore';

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
    useGamificationStore.setState({ currentStreak: 4 });

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
    });

    const result = await useGamificationStore.getState().handleAcknowledge();

    expect(result.baseEarned).toBe(10);
    expect(result.streakBonus).toBe(0);
    expect(result.dailyBonus).toBe(50);
    expect(result.totalEarned).toBe(60);

    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(60);
  });
});
