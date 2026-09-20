import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface AppStatePayload {
  status: 'active' | 'paused' | 'dnd';
  interval_minutes: number;
  is_paused: boolean;
}

/**
 * Detect if running inside a Tauri webview
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// In-memory fallback state for browser testing
const mockState: AppStatePayload = {
  status: 'active',
  interval_minutes: 30,
  is_paused: false,
};

/**
 * Fetch app state from Rust backend (or mock in browser)
 */
export async function fetchAppState(): Promise<AppStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<AppStatePayload>('get_app_state');
  }
  return { ...mockState };
}

/**
 * Set timer interval in minutes (enforces 5-120 min bounds)
 */
export async function updateTimerInterval(minutes: number): Promise<void> {
  if (minutes < 5 || minutes > 120) {
    throw new Error('Interval must be between 5 and 120 minutes');
  }
  if (isTauriEnvironment()) {
    await invoke('set_timer_interval', { interval: minutes });
    return;
  }
  mockState.interval_minutes = minutes;
}

/**
 * Toggle pause state of reminders
 */
export async function togglePauseState(): Promise<AppStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<AppStatePayload>('toggle_pause');
  }
  mockState.is_paused = !mockState.is_paused;
  mockState.status = mockState.is_paused ? 'paused' : 'active';
  return { ...mockState };
}

/**
 * Subscribe to realtime app-state updates emitted from Rust backend (e.g. system tray menu)
 */
export async function subscribeToAppState(
  callback: (state: AppStatePayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<AppStatePayload>('app-state-changed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

/**
 * Send a native test notification to verify OS capabilities
 */
export async function sendTestNotification(): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('send_test_notification');
    return;
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Posture Check! 🐸', {
        body: 'Ribbit says: Time to sit up tall and stretch! (Web Preview)',
      });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Posture Check! 🐸', {
          body: 'Ribbit says: Time to sit up tall and stretch! (Web Preview)',
        });
      }
    }
  }
}
