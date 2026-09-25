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

export interface TimerStatePayload {
  intervalMinutes: number;
  nextFireAt: string | null;
  isRunning: boolean;
  secondsRemaining: number | null;
  currentEscalationLevel: number;
  maxEscalationLevel: number;
  escalationEnabled: boolean;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeDays: number[];
  lastAcknowledgedAt: string | null;
  status: 'active' | 'paused' | 'dnd';
}

export interface AcknowledgePayload {
  success: boolean;
  xpEarned: number;
  acknowledgedAt: string;
  nextReminderAt: string | null;
  currentEscalationLevel: number;
  secondsRemaining: number | null;
}

export interface ReminderEventPayload {
  timestamp: string;
  level: number;
  intervalMinutes: number;
  message: string;
}

/**
 * Detect if running inside a Tauri webview
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// In-memory fallback state for browser testing
const mockTimerState: TimerStatePayload = {
  intervalMinutes: 30,
  nextFireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  isRunning: true,
  secondsRemaining: 30 * 60,
  currentEscalationLevel: 1,
  maxEscalationLevel: 3,
  escalationEnabled: true,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
  activeDays: [1, 2, 3, 4, 5, 6, 7],
  lastAcknowledgedAt: null,
  status: 'active',
};

const mockTrayState: TrayStatePayload = {
  isActive: true,
  isDnd: false,
  nextReminderAt: mockTimerState.nextFireAt,
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
 * Fetch rich timer state from Rust backend (or mock in browser)
 */
export async function getTimerState(): Promise<TimerStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('get_timer_state');
  }
  if (mockTimerState.nextFireAt && mockTimerState.isRunning) {
    const diff = Math.max(0, Math.floor((new Date(mockTimerState.nextFireAt).getTime() - Date.now()) / 1000));
    mockTimerState.secondsRemaining = diff;
  } else {
    mockTimerState.secondsRemaining = null;
  }
  return { ...mockTimerState };
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
  mockTimerState.isRunning = mockTrayState.isActive;
  mockTimerState.status = mockTrayState.status;
  mockTimerState.nextFireAt = mockTrayState.nextReminderAt;
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

  mockTimerState.isRunning = false;
  mockTimerState.status = 'dnd';
  mockTimerState.nextFireAt = null;
  mockTimerState.secondsRemaining = null;
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

  mockTimerState.isRunning = true;
  mockTimerState.status = 'active';
  mockTimerState.nextFireAt = mockTrayState.nextReminderAt;
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
 * Set timer interval in minutes (enforces 5-120 min bounds, allows 1 min for testing)
 */
export async function updateTimerInterval(minutes: number): Promise<TimerStatePayload> {
  if ((minutes < 5 && minutes !== 1) || minutes > 120) {
    throw new Error('Interval must be between 5 and 120 minutes');
  }
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('set_timer_interval', { interval: minutes });
  }
  mockTimerState.intervalMinutes = minutes;
  mockTrayState.intervalMinutes = minutes;
  if (mockTimerState.isRunning) {
    const next = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    mockTimerState.nextFireAt = next;
    mockTrayState.nextReminderAt = next;
    mockTimerState.secondsRemaining = minutes * 60;
  }
  return { ...mockTimerState };
}

/**
 * Acknowledge current reminder
 */
export async function acknowledgeReminder(): Promise<AcknowledgePayload> {
  if (isTauriEnvironment()) {
    return await invoke<AcknowledgePayload>('acknowledge_reminder');
  }
  const now = new Date().toISOString();
  mockTimerState.lastAcknowledgedAt = now;
  mockTimerState.currentEscalationLevel = 1;
  const next = new Date(Date.now() + mockTimerState.intervalMinutes * 60 * 1000).toISOString();
  mockTimerState.nextFireAt = next;
  mockTrayState.nextReminderAt = next;
  mockTimerState.secondsRemaining = mockTimerState.intervalMinutes * 60;

  return {
    success: true,
    xpEarned: 15,
    acknowledgedAt: now,
    nextReminderAt: next,
    currentEscalationLevel: 1,
    secondsRemaining: mockTimerState.secondsRemaining,
  };
}

/**
 * Snooze current reminder
 */
export async function snoozeReminder(minutes: number): Promise<TimerStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('snooze_reminder', { minutes });
  }
  const next = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  mockTimerState.nextFireAt = next;
  mockTrayState.nextReminderAt = next;
  mockTimerState.secondsRemaining = minutes * 60;
  return { ...mockTimerState };
}

/**
 * Set active hours window (HH:MM format)
 */
export async function setActiveHours(start: string, end: string): Promise<TimerStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('set_active_hours', { start, end });
  }
  mockTimerState.activeHoursStart = start;
  mockTimerState.activeHoursEnd = end;
  return { ...mockTimerState };
}

/**
 * Set active days (1=Mon..7=Sun)
 */
export async function setActiveDays(days: number[]): Promise<TimerStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('set_active_days', { days });
  }
  mockTimerState.activeDays = days;
  return { ...mockTimerState };
}

/**
 * Set auto-escalation settings
 */
export async function setEscalationSettings(
  enabled: boolean,
  maxLevel?: number
): Promise<TimerStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<TimerStatePayload>('set_escalation_settings', {
      enabled,
      maxLevel: maxLevel ?? null,
    });
  }
  mockTimerState.escalationEnabled = enabled;
  if (maxLevel) mockTimerState.maxEscalationLevel = maxLevel;
  return { ...mockTimerState };
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
 * Subscribe to realtime rich timer state updates emitted from Rust backend
 */
export async function subscribeToTimerState(
  callback: (state: TimerStatePayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<TimerStatePayload>('timer-state-changed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

/**
 * Subscribe to posture reminder trigger events
 */
export async function subscribeToPostureReminder(
  callback: (reminder: ReminderEventPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<ReminderEventPayload>('posture-reminder', (event) => {
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

export interface NotificationRecord {
  id: string;
  timestamp: string;
  level: number;
  title: string;
  body: string;
  status: 'shown' | 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';
}

const mockNotificationHistory: NotificationRecord[] = [];

/**
 * Set notification intensity level (1..=3 for Phase 1)
 */
export async function setIntensityLevel(level: number): Promise<number> {
  if (level < 1 || level > 5) {
    throw new Error('Intensity level must be between 1 and 5');
  }
  if (isTauriEnvironment()) {
    return await invoke<number>('set_intensity_level', { level });
  }
  return level;
}

/**
 * Fetch recent notification history from Rust backend
 */
export async function getNotificationHistory(limit = 50): Promise<NotificationRecord[]> {
  if (isTauriEnvironment()) {
    return await invoke<NotificationRecord[]>('get_notification_history', { limit });
  }
  return [...mockNotificationHistory].reverse().slice(0, limit);
}

/**
 * Send a level-specific test notification (1=Whisper, 2=Nudge, 3=Reminder)
 */
export async function testNotification(level: number): Promise<NotificationRecord> {
  if (isTauriEnvironment()) {
    return await invoke<NotificationRecord>('test_notification', { level });
  }
  const notif: NotificationRecord = {
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level,
    title:
      level === 1
        ? 'Posture Check! 🐸 (Whisper)'
        : level === 3
        ? 'Posture Check! 🐸 (Reminder)'
        : 'Posture Check! 🐸',
    body: 'Ribbit nudges: Time for a posture check! Straighten up and breathe deep.',
    status: 'shown',
  };
  mockNotificationHistory.push(notif);
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(notif.title, { body: notif.body });
  }
  return notif;
}

/**
 * Subscribe to notification-shown events from Rust backend
 */
export async function subscribeToNotificationShown(
  callback: (notif: NotificationRecord) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<NotificationRecord>('notification-shown', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

