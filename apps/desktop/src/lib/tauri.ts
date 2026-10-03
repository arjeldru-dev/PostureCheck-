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

export interface NotificationAction {
  id: string;
  label: string;
}

export interface NotificationRecord {
  id: string;
  timestamp: string;
  level: number;
  title: string;
  body: string;
  status: 'shown' | 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';
  actions?: NotificationAction[];
}

export interface NotificationAcknowledgedPayload {
  id: string | null;
  xpEarned: number;
}

export interface NotificationSnoozedPayload {
  id: string | null;
  minutes: number;
}

export interface NotificationDismissedPayload {
  id: string | null;
  reason: string;
  level?: number;
}

export interface NotificationExpiredPayload {
  id: string;
  reason: string;
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

const mockShownListeners = new Set<(notif: NotificationRecord) => void>();
const mockAckListeners = new Set<(payload: NotificationAcknowledgedPayload) => void>();
const mockSnoozedListeners = new Set<(payload: NotificationSnoozedPayload) => void>();
const mockDismissedListeners = new Set<(payload: NotificationDismissedPayload) => void>();
const mockExpiredListeners = new Set<(payload: NotificationExpiredPayload) => void>();

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
    actions: [
      { id: 'sitting_up', label: '✓ Sitting up!' },
      { id: 'snooze', label: '💤 Snooze (5m)' },
    ],
  };
  mockNotificationHistory.push(notif);
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(notif.title, { body: notif.body });
  }
  mockShownListeners.forEach((cb) => {
    try {
      cb(notif);
    } catch {
      // Ignore listener dispatch errors
    }
  });
  return notif;
}

export interface NotificationActionResult {
  action: string;
  success: boolean;
  xpEarned?: number;
  notificationId?: string | null;
}

/**
 * Handle action clicked on a notification (e.g. "sitting_up", "snooze", "dismiss")
 */
export async function handleNotificationAction(
  action: 'sitting_up' | 'snooze' | 'dismiss' | string,
  notificationId?: string
): Promise<NotificationActionResult> {
  if (isTauriEnvironment()) {
    return await invoke<NotificationActionResult>('handle_notification_action', { action, notificationId });
  }
  if (notificationId) {
    const item = mockNotificationHistory.find((n) => n.id === notificationId);
    if (item) {
      if (action === 'sitting_up' || action === 'acknowledge') {
        item.status = 'acknowledged';
        mockAckListeners.forEach((cb) => {
          try {
            cb({ id: notificationId, xpEarned: 10 });
          } catch {
            // Ignore listener dispatch errors
          }
        });
      } else if (action === 'snooze') {
        item.status = 'snoozed';
        mockSnoozedListeners.forEach((cb) => {
          try {
            cb({ id: notificationId, minutes: 5 });
          } catch {
            // Ignore listener dispatch errors
          }
        });
      } else if (action === 'dismiss') {
        item.status = 'dismissed';
        mockDismissedListeners.forEach((cb) => {
          try {
            cb({ id: notificationId, reason: 'user_dismissed', level: item.level });
          } catch {
            // Ignore listener dispatch errors
          }
        });
      }
    }
  }
  return { action, success: true, notificationId };
}

/**
 * Check OS notification permissions
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (isTauriEnvironment()) {
    return await invoke<'granted' | 'denied' | 'prompt' | 'unknown'>('check_notification_permission');
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission as 'granted' | 'denied' | 'prompt';
  }
  return 'unknown';
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
  mockShownListeners.add(callback);
  return () => {
    mockShownListeners.delete(callback);
  };
}

/**
 * Subscribe to notification-acknowledged events from Rust backend
 */
export async function subscribeToNotificationAcknowledged(
  callback: (payload: NotificationAcknowledgedPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<NotificationAcknowledgedPayload>('notification-acknowledged', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  mockAckListeners.add(callback);
  return () => {
    mockAckListeners.delete(callback);
  };
}

/**
 * Subscribe to notification-snoozed events from Rust backend
 */
export async function subscribeToNotificationSnoozed(
  callback: (payload: NotificationSnoozedPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<NotificationSnoozedPayload>('notification-snoozed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  mockSnoozedListeners.add(callback);
  return () => {
    mockSnoozedListeners.delete(callback);
  };
}

/**
 * Subscribe to notification-dismissed events from Rust backend
 */
export async function subscribeToNotificationDismissed(
  callback: (payload: NotificationDismissedPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<NotificationDismissedPayload>('notification-dismissed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  mockDismissedListeners.add(callback);
  return () => {
    mockDismissedListeners.delete(callback);
  };
}

/**
 * Subscribe to notification-expired events from Rust backend
 */
export async function subscribeToNotificationExpired(
  callback: (payload: NotificationExpiredPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<NotificationExpiredPayload>('notification-expired', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  mockExpiredListeners.add(callback);
  return () => {
    mockExpiredListeners.delete(callback);
  };
}

export interface PostureSettingsPayload {
  id: string;
  profileName: string;
  intervalMinutes: number;
  intensityLevel: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeDays: string;
  routingMode: 'pc_only' | 'phone_only' | 'both';
  autoEscalation: boolean;
  dndEnabled: boolean;
  isActiveProfile: boolean;
  level5OptIn?: boolean;
  mascotTone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveSettingsPayload {
  id?: string;
  profileName?: string;
  intervalMinutes?: number;
  intensityLevel?: number;
  activeHoursStart?: string;
  activeHoursEnd?: string;
  activeDays?: string;
  routingMode?: 'pc_only' | 'phone_only' | 'both';
  autoEscalation?: boolean;
  dndEnabled?: boolean;
  isActiveProfile?: boolean;
  level5OptIn?: boolean;
  mascotTone?: string;
}

/**
 * Close any open overlay/fullscreen windows and stop alarm audio
 */
export async function closeOverlay(): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('close_overlay');
  }
}

/**
 * Re-focus fullscreen overlay if blurred
 */
export async function refocusFullscreenOverlay(): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('refocus_fullscreen_overlay');
  }
}

/**
 * Play alarm sound for a given intensity level
 */
export async function playAlarmSound(level: number): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('play_alarm_sound', { level });
  }
}

/**
 * Stop alarm sound immediately
 */
export async function stopAlarmSound(): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('stop_alarm_sound');
  }
}

export interface PersistedAppStatePayload {
  id: number;
  isPaused: boolean;
  isDnd: boolean;
  dndUntil: string | null;
  themeMode: string;
  launchOnStartup: boolean;
}

// In-memory mock profiles and settings for testing/browser environments
const mockProfiles: PostureSettingsPayload[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    profileName: 'Default',
    intervalMinutes: 30,
    intensityLevel: 2,
    activeHoursStart: '08:00',
    activeHoursEnd: '22:00',
    activeDays: '1,2,3,4,5,6,7',
    routingMode: 'pc_only',
    autoEscalation: false,
    dndEnabled: false,
    isActiveProfile: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    profileName: 'Work',
    intervalMinutes: 45,
    intensityLevel: 2,
    activeHoursStart: '09:00',
    activeHoursEnd: '18:00',
    activeDays: '1,2,3,4,5',
    routingMode: 'pc_only',
    autoEscalation: false,
    dndEnabled: false,
    isActiveProfile: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    profileName: 'Gaming',
    intervalMinutes: 30,
    intensityLevel: 3,
    activeHoursStart: '18:00',
    activeHoursEnd: '23:00',
    activeDays: '1,2,3,4,5,6,7',
    routingMode: 'phone_only',
    autoEscalation: true,
    dndEnabled: false,
    isActiveProfile: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockAppStatePayload: PersistedAppStatePayload = {
  id: 1,
  isPaused: false,
  isDnd: false,
  dndUntil: null,
  themeMode: 'system',
  launchOnStartup: false,
};

/**
 * Fetch active posture settings from SQLite (or mock)
 */
export async function getSettings(): Promise<PostureSettingsPayload> {
  if (isTauriEnvironment()) {
    return await invoke<PostureSettingsPayload>('get_settings');
  }
  const active = mockProfiles.find((p) => p.isActiveProfile) || mockProfiles[0];
  return { ...active };
}

/**
 * Save posture settings and update timer in SQLite (or mock)
 */
export async function saveSettings(
  input: SaveSettingsPayload
): Promise<PostureSettingsPayload> {
  if (isTauriEnvironment()) {
    return await invoke<PostureSettingsPayload>('save_settings', { settings: input });
  }

  const activeIdx = mockProfiles.findIndex((p) => p.isActiveProfile);
  const targetIdx = activeIdx >= 0 ? activeIdx : 0;
  const current = mockProfiles[targetIdx];

  const updated: PostureSettingsPayload = {
    ...current,
    profileName: input.profileName ?? current.profileName,
    intervalMinutes: input.intervalMinutes ?? current.intervalMinutes,
    intensityLevel: input.intensityLevel ?? current.intensityLevel,
    activeHoursStart: input.activeHoursStart ?? current.activeHoursStart,
    activeHoursEnd: input.activeHoursEnd ?? current.activeHoursEnd,
    activeDays: input.activeDays ?? current.activeDays,
    routingMode: input.routingMode ?? current.routingMode,
    autoEscalation: input.autoEscalation ?? current.autoEscalation,
    dndEnabled: input.dndEnabled ?? current.dndEnabled,
    updatedAt: new Date().toISOString(),
  };

  mockProfiles[targetIdx] = updated;
  if (input.intervalMinutes) {
    mockTimerState.intervalMinutes = input.intervalMinutes;
  }
  return { ...updated };
}

/**
 * Get all available quick profiles
 */
export async function getProfiles(): Promise<PostureSettingsPayload[]> {
  if (isTauriEnvironment()) {
    return await invoke<PostureSettingsPayload[]>('get_profiles');
  }
  return mockProfiles.map((p) => ({ ...p }));
}

/**
 * Switch active profile by ID
 */
export async function switchProfile(
  profileId: string
): Promise<PostureSettingsPayload> {
  if (isTauriEnvironment()) {
    return await invoke<PostureSettingsPayload>('switch_profile', { profileId });
  }

  mockProfiles.forEach((p) => {
    p.isActiveProfile = p.id === profileId;
  });

  const activated = mockProfiles.find((p) => p.id === profileId) || mockProfiles[0];
  mockTimerState.intervalMinutes = activated.intervalMinutes;
  mockTimerState.activeHoursStart = activated.activeHoursStart;
  mockTimerState.activeHoursEnd = activated.activeHoursEnd;
  return { ...activated };
}

/**
 * Create a new custom posture profile
 */
export async function createProfile(
  input: SaveSettingsPayload
): Promise<PostureSettingsPayload> {
  if (isTauriEnvironment()) {
    return await invoke<PostureSettingsPayload>('create_profile', { settings: input });
  }

  const newProfile: PostureSettingsPayload = {
    id: input.id ?? `profile-${Date.now()}`,
    profileName: input.profileName ?? 'Custom Profile',
    intervalMinutes: input.intervalMinutes ?? 30,
    intensityLevel: input.intensityLevel ?? 2,
    activeHoursStart: input.activeHoursStart ?? '08:00',
    activeHoursEnd: input.activeHoursEnd ?? '22:00',
    activeDays: input.activeDays ?? '1,2,3,4,5,6,7',
    routingMode: input.routingMode ?? 'pc_only',
    autoEscalation: input.autoEscalation ?? false,
    dndEnabled: input.dndEnabled ?? false,
    isActiveProfile: input.isActiveProfile ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (newProfile.isActiveProfile) {
    mockProfiles.forEach((p) => {
      p.isActiveProfile = false;
    });
  }

  mockProfiles.push(newProfile);
  return { ...newProfile };
}

/**
 * Delete a profile by ID
 */
export async function deleteProfile(profileId: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    return await invoke<boolean>('delete_profile', { profileId });
  }

  if (mockProfiles.length <= 1) {
    throw new Error('Cannot delete the only remaining profile');
  }

  const idx = mockProfiles.findIndex((p) => p.id === profileId);
  if (idx >= 0) {
    const wasActive = mockProfiles[idx].isActiveProfile;
    mockProfiles.splice(idx, 1);
    if (wasActive && mockProfiles.length > 0) {
      mockProfiles[0].isActiveProfile = true;
    }
    return true;
  }
  return false;
}

/**
 * Clear all posture check history from SQLite
 */
export async function clearPostureHistory(): Promise<number> {
  if (isTauriEnvironment()) {
    return await invoke<number>('clear_posture_history');
  }
  const cleared = mockNotificationHistory.length;
  mockNotificationHistory.length = 0;
  return cleared;
}

/**
 * Export complete app and posture check history as JSON
 */
export async function exportPostureData(): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('export_posture_data');
  }

  const exportObj = {
    exportDate: new Date().toISOString(),
    appName: 'Posture Check! Desktop (Web Preview)',
    version: '0.1.0',
    activeSettings: mockProfiles.find((p) => p.isActiveProfile) || mockProfiles[0],
    profiles: mockProfiles,
    postureChecks: mockNotificationHistory,
    appState: mockAppStatePayload,
  };
  return JSON.stringify(exportObj, null, 2);
}

/**
 * Set launch on startup preference
 */
export async function setLaunchOnStartup(enabled: boolean): Promise<boolean> {
  if (isTauriEnvironment()) {
    return await invoke<boolean>('set_launch_on_startup', { enabled });
  }
  mockAppStatePayload.launchOnStartup = enabled;
  return enabled;
}

/**
 * Get persisted app state
 */
export async function getPersistedAppState(): Promise<PersistedAppStatePayload> {
  if (isTauriEnvironment()) {
    return await invoke<PersistedAppStatePayload>('get_persisted_app_state');
  }
  return { ...mockAppStatePayload };
}

/**
 * Save persisted app state
 */
export async function saveAppState(
  state: Partial<PersistedAppStatePayload>
): Promise<PersistedAppStatePayload> {
  const merged = { ...mockAppStatePayload, ...state };
  if (isTauriEnvironment()) {
    return await invoke<PersistedAppStatePayload>('save_app_state', { state: merged });
  }
  Object.assign(mockAppStatePayload, merged);
  return { ...mockAppStatePayload };
}

/**
 * Subscribe to settings-changed events emitted by Tauri
 */
export async function subscribeToSettingsChanged(
  callback: (settings: PostureSettingsPayload) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const unlisten = await listen<PostureSettingsPayload>('settings-changed', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}
/**
 * Open external URL in system default browser safely
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.error('Failed to open external url via Tauri command:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export interface UserProgressPayload {
  id: number;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalChecks: number;
  streakFreezeAvailable: boolean;
  lastCheckDate?: string | null;
  updatedAt: string;
}

export interface TodayStatsPayload {
  totalChecksToday: number;
  acknowledgedToday: number;
  acknowledgmentRate: number;
  xpEarnedToday: number;
}

const mockUserProgress: UserProgressPayload = {
  id: 1,
  totalXp: 1250,
  currentLevel: 6,
  currentStreak: 5,
  longestStreak: 12,
  totalChecks: 42,
  streakFreezeAvailable: true,
  lastCheckDate: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTodayStats: TodayStatsPayload = {
  totalChecksToday: 8,
  acknowledgedToday: 7,
  acknowledgmentRate: 0.875,
  xpEarnedToday: 70,
};

/**
 * Fetch current user gamification progress
 */
export async function getProgress(): Promise<UserProgressPayload> {
  if (isTauriEnvironment()) {
    return await invoke<UserProgressPayload>('get_progress');
  }
  return { ...mockUserProgress };
}

/**
 * Fetch today's posture check statistics
 */
export async function getTodayStats(): Promise<TodayStatsPayload> {
  if (isTauriEnvironment()) {
    return await invoke<TodayStatsPayload>('get_today_stats');
  }
  return { ...mockTodayStats };
}

/**
 * Configure mascot tone in backend rotation engine
 */
export async function setMascotToneBackend(tone: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke('set_mascot_tone', { tone });
    } catch (err) {
      console.warn('Failed to sync mascot tone to backend:', err);
    }
  }
}

/**
 * Retrieve next mascot message from backend rotation engine
 */
export async function getNextMascotMessageBackend(
  level?: number,
  tone?: string,
  streakDays?: number
): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('get_next_mascot_message', {
        level,
        tone,
        streakDays,
      });
    } catch {
      // Fall through to fallback
    }
  }
  return 'Ribbit says: Time to sit up tall! 🐸';
}

/**
 * Retrieve positive acknowledgment message from backend rotation engine
 */
export async function getMascotAcknowledgmentMessageBackend(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('get_mascot_acknowledgment_message');
    } catch {
      // Fall through
    }
  }
  return 'Great job! Your back thanks you! 🐸';
}

/**
 * Retrieve streak celebration message from backend rotation engine
 */
export async function getMascotStreakMessageBackend(streakDays: number): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('get_mascot_streak_message', { streakDays });
    } catch {
      // Fall through
    }
  }
  return `🔥 ${streakDays}-day streak! Keep that posture flame burning! Ribbit! 🐸`;
}

