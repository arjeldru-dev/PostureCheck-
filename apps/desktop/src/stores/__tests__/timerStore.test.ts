import { describe, expect, it } from 'vitest';
import { useTimerStore } from '../timerStore';

describe('timerStore', () => {
  it('initializes with default values', () => {
    const state = useTimerStore.getState();
    expect(state.intervalMinutes).toBe(30);
    expect(state.isRunning).toBe(true);
    expect(state.currentEscalationLevel).toBe(1);
    expect(state.maxEscalationLevel).toBe(3);
    expect(state.escalationEnabled).toBe(true);
    expect(state.activeHoursStart).toBe('08:00');
    expect(state.activeHoursEnd).toBe('22:00');
    expect(state.activeDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('updates state via setIntervalMinutes', async () => {
    await useTimerStore.getState().setIntervalMinutes(15);
    expect(useTimerStore.getState().intervalMinutes).toBe(15);
  });

  it('snoozes reminder and updates fire target', async () => {
    await useTimerStore.getState().snooze(10);
    const nextFire = useTimerStore.getState().nextFireAt;
    expect(nextFire).not.toBeNull();
  });

  it('acknowledges reminder, resets escalation, and awards XP', async () => {
    useTimerStore.setState({ currentEscalationLevel: 3 });
    const res = await useTimerStore.getState().acknowledge();
    expect(res.success).toBe(true);
    expect(res.xpEarned).toBe(15);
    expect(useTimerStore.getState().currentEscalationLevel).toBe(1);
    expect(useTimerStore.getState().lastXpEarned).toBe(15);
  });

  it('ticks seconds correctly when running', () => {
    useTimerStore.setState({ isRunning: true, status: 'active', secondsRemaining: 60, nextFireAt: null });
    useTimerStore.getState().tickSecond();
    expect(useTimerStore.getState().secondsRemaining).toBe(59);
  });
});
