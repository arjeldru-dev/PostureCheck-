import { describe, expect, it } from 'vitest';
import {
  fetchAppState,
  isTauriEnvironment,
  subscribeToAppState,
  togglePauseState,
  updateTimerInterval,
} from '../tauri';

describe('Tauri Frontend IPC Wrapper (Browser Mode)', () => {
  it('detects browser environment when not running inside Tauri webview', () => {
    expect(isTauriEnvironment()).toBe(false);
  });

  it('fetches mock state in browser environment', async () => {
    const state = await fetchAppState();
    expect(state).toBeDefined();
    expect(typeof state.interval_minutes).toBe('number');
    expect(['active', 'paused', 'dnd']).toContain(state.status);
  });

  it('enforces bounds on timer interval updates', async () => {
    // Should reject intervals below 5
    await expect(updateTimerInterval(4)).rejects.toThrow(
      'Interval must be between 5 and 120 minutes'
    );
    await expect(updateTimerInterval(0)).rejects.toThrow(
      'Interval must be between 5 and 120 minutes'
    );

    // Should reject intervals above 120
    await expect(updateTimerInterval(121)).rejects.toThrow(
      'Interval must be between 5 and 120 minutes'
    );

    // Should succeed on valid interval
    await expect(updateTimerInterval(45)).resolves.not.toThrow();
    const updated = await fetchAppState();
    expect(updated.interval_minutes).toBe(45);
  });

  it('toggles pause state correctly', async () => {
    const initial = await fetchAppState();
    const toggled = await togglePauseState();

    expect(toggled.is_paused).toBe(!initial.is_paused);
    expect(toggled.status).toBe(toggled.is_paused ? 'paused' : 'active');

    // Toggle back
    const restored = await togglePauseState();
    expect(restored.is_paused).toBe(initial.is_paused);
  });

  it('returns clean unlisten function when subscribing to app state in web mode', async () => {
    const callback = () => {};
    const unlisten = await subscribeToAppState(callback);
    expect(typeof unlisten).toBe('function');
    expect(() => unlisten()).not.toThrow();
  });
});
