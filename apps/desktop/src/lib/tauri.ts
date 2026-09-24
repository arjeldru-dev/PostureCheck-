import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface TrayStatePayload {
  isActive: boolean;
  isDnd: boolean;
  nextReminderAt: string | null;
  status: 'active' | 'paused' | 'dnd';
  dndUntil: string | null;
  intervalMinutes: number;
}

export interface AppStatePayload {
  status: 'active' | 'paused' | 'dnd';
  interval_minutes: number;
  is_paused: boolean;
  is_dnd?: boolean;
  next_reminder_at?: string | null;
}

/**
 * Detect if running inside a Tauri webview
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// In-memory fallback state for browser testing
const mockTrayState: TrayStatePayload = {
  isActive: true,
  isDnd: false,
  nextReminderAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  status: 'active',
  dndUntil: null,
  intervalMinutes: 30,
};

/**
 * Fetch tray state from Rust backend (or mock in browser)
 */
export async function getTrayState(): Promise<TrayStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TrayStatePayload>('get_tray_state');
  }
  return { ...mockTrayState };
}

/**
 * Toggle pause state of reminders
 */
export async function togglePause(): Promise<TrayStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TrayStatePayload>('toggle_pause');
  }
  mockTrayState.isActive = !mockTrayState.isActive;
  mockTrayState.status = mockTrayState.isActive ? 'active' : 'paused';
  mockTrayState.nextReminderAt = mockTrayState.isActive
    ? new Date(Date.now() + mockTrayState.intervalMinutes * 60 * 1000).toISOString()
    : null;
  return { ...mockTrayState };
}

/**
 * Set Do Not Disturb mode with optional duration in minutes
 */
export async function setDnd(durationMinutes?: number | null): Promise<TrayStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TrayStatePayload>('set_dnd', {
      durationMinutes: durationMinutes ?? null,
    });
  }
  mockTrayState.isDnd = true;
  mockTrayState.isActive = false;
  mockTrayState.status = 'dnd';
  mockTrayState.dndUntil = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    : null;
  mockTrayState.nextReminderAt = null;
  return { ...mockTrayState };
}

/**
 * Cancel Do Not Disturb mode
 */
export async function cancelDnd(): Promise<TrayStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TrayStatePayload>('cancel_dnd');
  }
  mockTrayState.isDnd = false;
  mockTrayState.isActive = true;
  mockTrayState.status = 'active';
  mockTrayState.dndUntil = null;
  mockTrayState.nextReminderAt = new Date(
    Date.now() + mockTrayState.intervalMinutes * 60 * 1000
  ).toISOString();
  return { ...mockTrayState };
}

/**
 * Legacy alias for togglePause
 */
export async function togglePauseState(): Promise<AppStatePayload> {
  const trayState = await togglePause();
  return {
    status: trayState.status,
    interval_minutes: trayState.intervalMinutes,
    is_paused: !trayState.isActive,
    is_dnd: trayState.isDnd,
    next_reminder_at: trayState.nextReminderAt,
  };
}

/**
 * Fetch legacy app state from Rust backend
 */
export async function fetchAppState(): Promise<AppStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<AppStatePayload>('get_app_state');
  }
  return {
    status: mockTrayState.status,
    interval_minutes: mockTrayState.intervalMinutes,
    is_paused: !mockTrayState.isActive,
    is_dnd: mockTrayState.isDnd,
    next_reminder_at: mockTrayState.nextReminderAt,
  };
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
  mockTrayState.intervalMinutes = minutes;
  if (mockTrayState.isActive) {
    mockTrayState.nextReminderAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }
}

/**
 * Subscribe to realtime tray state updates emitted from Rust backend
 */
export async function subscribeToTrayState(
  callback: (state: TrayStatePayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<TrayStatePayload>('tray-state-changed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

/**
 * Subscribe to realtime legacy app-state updates
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
 * Subscribe to menu navigation events (e.g. Settings or Dashboard clicked in tray)
 */
export async function subscribeToTrayNavigation(
  onNavigate: (destination: 'dashboard' | 'settings') => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlistenDashboard = await listen('navigate-to-dashboard', () => {
      onNavigate('dashboard');
    });
    const unlistenSettings = await listen('navigate-to-settings', () => {
      onNavigate('settings');
    });
    return () => {
      unlistenDashboard();
      unlistenSettings();
    };
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
