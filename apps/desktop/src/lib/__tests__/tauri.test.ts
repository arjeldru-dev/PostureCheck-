import { describe, expect, it } from 'vitest';
import {
  fetchAppState,
  getTrayState,
  isTauriEnvironment,
  togglePause,
  updateTimerInterval,
  setDnd,
  cancelDnd,
  openExternalUrl,
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

  it('fetches tray state with camelCase fields', async () => {
    const trayState = await getTrayState();
    expect(trayState).toBeDefined();
    expect(typeof trayState.isActive).toBe('boolean');
    expect(typeof trayState.isDnd).toBe('boolean');
    expect(typeof trayState.intervalMinutes).toBe('number');
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

  it('toggles pause state correctly with togglePause', async () => {
    const initial = await getTrayState();
    const toggled = await togglePause();

    expect(toggled.isActive).toBe(!initial.isActive);
    expect(toggled.status).toBe(toggled.isActive ? 'active' : 'paused');

    // Toggle back
    const restored = await togglePause();
    expect(restored.isActive).toBe(initial.isActive);
  });

  it('handles setDnd and cancelDnd in mock mode', async () => {
    const dndState = await setDnd(30);
    expect(dndState.isDnd).toBe(true);
    expect(dndState.status).toBe('dnd');
    expect(dndState.dndUntil).not.toBeNull();

    const normalState = await cancelDnd();
    expect(normalState.isDnd).toBe(false);
    expect(normalState.isActive).toBe(true);
    expect(normalState.status).toBe('active');
  });

  it('handles openExternalUrl safely in web mode', async () => {
    let openedUrl = '';
    const mockWindow = {
      open: (url: string) => {
        openedUrl = url;
        return null;
      },
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;

    try {
      await openExternalUrl('https://github.com/arjeldru-dev/PostureCheck-');
      expect(openedUrl).toBe('https://github.com/arjeldru-dev/PostureCheck-');
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });
});

