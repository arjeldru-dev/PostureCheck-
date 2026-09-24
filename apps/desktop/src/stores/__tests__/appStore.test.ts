import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('useAppStore (Zustand)', () => {
  beforeEach(async () => {
    const store = useAppStore.getState();
    await store.cancelDnd();
    if (!useAppStore.getState().isActive) {
      await store.togglePause();
    }
  });

  it('initializes with default active state', () => {
    const state = useAppStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isDnd).toBe(false);
    expect(state.status).toBe('active');
    expect(state.intervalMinutes).toBe(30);
  });

  it('toggles pause state back and forth', async () => {
    const { togglePause } = useAppStore.getState();
    await togglePause();
    expect(useAppStore.getState().isActive).toBe(false);
    expect(useAppStore.getState().status).toBe('paused');

    await togglePause();
    expect(useAppStore.getState().isActive).toBe(true);
    expect(useAppStore.getState().status).toBe('active');
  });

  it('sets and cancels Do Not Disturb mode', async () => {
    const { setDnd, cancelDnd } = useAppStore.getState();

    await setDnd(60);
    let state = useAppStore.getState();
    expect(state.isDnd).toBe(true);
    expect(state.status).toBe('dnd');
    expect(state.dndUntil).not.toBeNull();

    await cancelDnd();
    state = useAppStore.getState();
    expect(state.isDnd).toBe(false);
    expect(state.status).toBe('active');
    expect(state.dndUntil).toBeNull();
  });

  it('supports extending DND duration and indefinite mode', async () => {
    const { setDnd, cancelDnd } = useAppStore.getState();

    // Set 30 min
    await setDnd(30);
    let state = useAppStore.getState();
    expect(state.isDnd).toBe(true);
    const initialUntil = state.dndUntil;
    expect(initialUntil).not.toBeNull();

    // Extend to 120 min
    await setDnd(120);
    state = useAppStore.getState();
    expect(state.isDnd).toBe(true);
    expect(state.dndUntil).not.toBeNull();
    expect(new Date(state.dndUntil!).getTime()).toBeGreaterThan(
      new Date(initialUntil!).getTime()
    );

    // Set indefinite DND
    await setDnd(null);
    state = useAppStore.getState();
    expect(state.isDnd).toBe(true);
    expect(state.dndUntil).toBeNull();

    await cancelDnd();
  });

  it('updates reminder interval and synchronizes', async () => {
    const { setIntervalMinutes } = useAppStore.getState();
    await setIntervalMinutes(45);
    expect(useAppStore.getState().intervalMinutes).toBe(45);
  });
});
