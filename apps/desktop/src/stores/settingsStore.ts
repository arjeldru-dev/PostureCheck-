import { create } from 'zustand';
import {
  getSettings as tauriGetSettings,
  saveSettings as tauriSaveSettings,
  getProfiles as tauriGetProfiles,
  switchProfile as tauriSwitchProfile,
  createProfile as tauriCreateProfile,
  deleteProfile as tauriDeleteProfile,
  clearPostureHistory as tauriClearPostureHistory,
  exportPostureData as tauriExportPostureData,
  setLaunchOnStartup as tauriSetLaunchOnStartup,
  getPersistedAppState as tauriGetPersistedAppState,
  saveAppState as tauriSaveAppState,
  updateTimerInterval,
  setIntensityLevel,
  setActiveHours as tauriSetActiveHours,
  setActiveDays as tauriSetActiveDays,
  setEscalationSettings as tauriSetEscalationSettings,
  setDnd as tauriSetDnd,
  cancelDnd as tauriCancelDnd,
  testNotification as tauriTestNotification,
  subscribeToTrayState,
  type PostureSettingsPayload,
  type SaveSettingsPayload,
} from '@/lib/tauri';
import { useThemeStore, type ThemeMode, type MascotTone } from '@posture-check/shared';

export interface QuickProfile {
  id: string;
  profileName: string;
  intervalMinutes: number;
  intensityLevel: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeDays: number[];
  routingMode: 'pc_only' | 'phone_only' | 'both';
  autoEscalation: boolean;
  dndEnabled: boolean;
  isActiveProfile: boolean;
}

export type NotificationSound = 'system' | 'chime' | 'silent';

export interface SettingsStoreState {
  // Current Active Settings
  id: string;
  profileName: string;
  intervalMinutes: number;
  intensityLevel: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeDays: number[];
  routingMode: 'pc_only' | 'phone_only' | 'both';
  autoEscalation: boolean;
  dndEnabled: boolean;
  isActiveProfile: boolean;

  // Profiles list
  profiles: QuickProfile[];

  // General & App State
  launchOnStartup: boolean;
  themeMode: ThemeMode;
  mascotTone: MascotTone;
  notificationSound: NotificationSound;
  scheduledDndEnabled: boolean;
  scheduledDndStart: string;
  scheduledDndEnd: string;
  autoDndFullscreen: boolean;

  // UI state
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setIntervalMinutes: (minutes: number) => Promise<void>;
  setIntensityLevel: (level: number) => Promise<void>;
  setActiveHours: (start: string, end: string) => Promise<void>;
  setActiveDays: (days: number[]) => Promise<void>;
  setRoutingMode: (mode: 'pc_only' | 'phone_only' | 'both') => Promise<void>;
  setAutoEscalation: (enabled: boolean) => Promise<void>;
  setDnd: (enabled: boolean, durationMinutes?: number | null) => Promise<void>;
  setLaunchOnStartup: (enabled: boolean) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setMascotTone: (tone: MascotTone) => void;
  setNotificationSound: (sound: NotificationSound) => void;
  setScheduledDnd: (enabled: boolean, start?: string, end?: string) => void;
  setAutoDndFullscreen: (enabled: boolean) => void;

  // Profiles Management
  switchProfile: (profileId: string) => Promise<void>;
  createProfile: (profile: Partial<QuickProfile> & { profileName: string }) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<QuickProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;

  // Data Management
  exportData: () => Promise<string>;
  clearHistory: () => Promise<number>;
  testNotification: (level: number) => Promise<void>;
}

function parseDaysString(daysStr?: string): number[] {
  if (!daysStr) return [1, 2, 3, 4, 5, 6, 7];
  const parsed = daysStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
  return parsed.length > 0 ? parsed : [1, 2, 3, 4, 5, 6, 7];
}

function formatDaysString(days: number[]): string {
  return days.sort((a, b) => a - b).join(',');
}

function mapPayloadToProfile(payload: PostureSettingsPayload): QuickProfile {
  return {
    id: payload.id,
    profileName: payload.profileName || 'Default',
    intervalMinutes: payload.intervalMinutes || 30,
    intensityLevel: payload.intensityLevel || 2,
    activeHoursStart: payload.activeHoursStart || '08:00',
    activeHoursEnd: payload.activeHoursEnd || '22:00',
    activeDays: parseDaysString(payload.activeDays),
    routingMode: payload.routingMode || 'pc_only',
    autoEscalation: !!payload.autoEscalation,
    dndEnabled: !!payload.dndEnabled,
    isActiveProfile: !!payload.isActiveProfile,
  };
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  id: '00000000-0000-0000-0000-000000000001',
  profileName: 'Default',
  intervalMinutes: 30,
  intensityLevel: 2,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
  activeDays: [1, 2, 3, 4, 5, 6, 7],
  routingMode: 'pc_only',
  autoEscalation: false,
  dndEnabled: false,
  isActiveProfile: true,

  profiles: [],

  launchOnStartup: false,
  themeMode: 'system',
  mascotTone: 'encouraging',
  notificationSound: 'system',
  scheduledDndEnabled: false,
  scheduledDndStart: '12:00',
  scheduledDndEnd: '13:00',
  autoDndFullscreen: false,

  loading: false,
  error: null,
  hasLoaded: false,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const [settingsPayload, profilesPayload, appStatePayload] = await Promise.all([
        tauriGetSettings(),
        tauriGetProfiles(),
        tauriGetPersistedAppState(),
      ]);

      const activeProfile = mapPayloadToProfile(settingsPayload);
      const profiles = profilesPayload.map(mapPayloadToProfile);

      // Load client-only preferences from localStorage if present
      let storedTone: MascotTone = 'encouraging';
      let storedSound: NotificationSound = 'system';
      let storedScheduledDnd = false;
      let storedScheduledStart = '12:00';
      let storedScheduledEnd = '13:00';

      if (typeof window !== 'undefined') {
        const tone = localStorage.getItem('posturecheck_mascot_tone');
        if (tone === 'encouraging' || tone === 'sassy' || tone === 'minimal') {
          storedTone = tone;
        }
        const sound = localStorage.getItem('posturecheck_notification_sound');
        if (sound === 'system' || sound === 'chime' || sound === 'silent') {
          storedSound = sound;
        }
        storedScheduledDnd = localStorage.getItem('posturecheck_scheduled_dnd') === 'true';
        const start = localStorage.getItem('posturecheck_scheduled_start');
        if (start) storedScheduledStart = start;
        const end = localStorage.getItem('posturecheck_scheduled_end');
        if (end) storedScheduledEnd = end;
      }

      const themeMode = (appStatePayload.themeMode as ThemeMode) || 'system';
      useThemeStore.getState().setMode(themeMode);

      set({
        ...activeProfile,
        profiles: profiles.length > 0 ? profiles : [activeProfile],
        launchOnStartup: appStatePayload.launchOnStartup,
        themeMode,
        mascotTone: storedTone,
        notificationSound: storedSound,
        scheduledDndEnabled: storedScheduledDnd,
        scheduledDndStart: storedScheduledStart,
        scheduledDndEnd: storedScheduledEnd,
        loading: false,
        hasLoaded: true,
      });

      // Subscribe to real-time tray state changes to keep DND in lockstep
      subscribeToTrayState((trayState) => {
        set({ dndEnabled: trayState.isDnd });
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  setIntervalMinutes: async (minutes: number) => {
    const clamped = Math.min(120, Math.max(5, minutes));
    // Optimistic update
    set({ intervalMinutes: clamped });

    try {
      await updateTimerInterval(clamped);
      await tauriSaveSettings({ intervalMinutes: clamped });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setIntensityLevel: async (level: number) => {
    const clamped = Math.min(5, Math.max(1, level));
    set({ intensityLevel: clamped });

    try {
      await setIntensityLevel(clamped);
      await tauriSaveSettings({ intensityLevel: clamped });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setActiveHours: async (start: string, end: string) => {
    set({ activeHoursStart: start, activeHoursEnd: end });

    try {
      await tauriSetActiveHours(start, end);
      await tauriSaveSettings({
        activeHoursStart: start,
        activeHoursEnd: end,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setActiveDays: async (days: number[]) => {
    const formatted = formatDaysString(days);
    set({ activeDays: days });

    try {
      await tauriSetActiveDays(days);
      await tauriSaveSettings({ activeDays: formatted });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setRoutingMode: async (mode: 'pc_only' | 'phone_only' | 'both') => {
    set({ routingMode: mode });

    try {
      await tauriSaveSettings({ routingMode: mode });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setAutoEscalation: async (enabled: boolean) => {
    set({ autoEscalation: enabled });

    try {
      await tauriSetEscalationSettings(enabled);
      await tauriSaveSettings({ autoEscalation: enabled });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setDnd: async (enabled: boolean, durationMinutes?: number | null) => {
    set({ dndEnabled: enabled });

    try {
      if (enabled) {
        await tauriSetDnd(durationMinutes ?? null);
      } else {
        await tauriCancelDnd();
      }
      await tauriSaveSettings({ dndEnabled: enabled });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setLaunchOnStartup: async (enabled: boolean) => {
    set({ launchOnStartup: enabled });

    try {
      await tauriSetLaunchOnStartup(enabled);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    useThemeStore.getState().setMode(mode);

    try {
      await tauriSaveAppState({ themeMode: mode });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setMascotTone: (tone: MascotTone) => {
    set({ mascotTone: tone });
    if (typeof window !== 'undefined') {
      localStorage.setItem('posturecheck_mascot_tone', tone);
    }
  },

  setNotificationSound: (sound: NotificationSound) => {
    set({ notificationSound: sound });
    if (typeof window !== 'undefined') {
      localStorage.setItem('posturecheck_notification_sound', sound);
    }
  },

  setScheduledDnd: (enabled: boolean, start?: string, end?: string) => {
    set((state) => ({
      scheduledDndEnabled: enabled,
      scheduledDndStart: start ?? state.scheduledDndStart,
      scheduledDndEnd: end ?? state.scheduledDndEnd,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('posturecheck_scheduled_dnd', String(enabled));
      if (start) localStorage.setItem('posturecheck_scheduled_start', start);
      if (end) localStorage.setItem('posturecheck_scheduled_end', end);
    }
  },

  setAutoDndFullscreen: (enabled: boolean) => {
    set({ autoDndFullscreen: enabled });
  },

  switchProfile: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const activePayload = await tauriSwitchProfile(profileId);
      const activeProfile = mapPayloadToProfile(activePayload);

      const allProfiles = await tauriGetProfiles();
      const mappedProfiles = allProfiles.map(mapPayloadToProfile);

      set({
        ...activeProfile,
        profiles: mappedProfiles,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  createProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const payload: SaveSettingsPayload = {
        profileName: profileData.profileName,
        intervalMinutes: profileData.intervalMinutes ?? 30,
        intensityLevel: profileData.intensityLevel ?? 2,
        activeHoursStart: profileData.activeHoursStart ?? '08:00',
        activeHoursEnd: profileData.activeHoursEnd ?? '22:00',
        activeDays: formatDaysString(profileData.activeDays ?? [1, 2, 3, 4, 5, 6, 7]),
        routingMode: profileData.routingMode ?? 'pc_only',
        autoEscalation: profileData.autoEscalation ?? false,
        dndEnabled: false,
        isActiveProfile: false,
      };

      await tauriCreateProfile(payload);
      const allProfiles = await tauriGetProfiles();
      set({
        profiles: allProfiles.map(mapPayloadToProfile),
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  updateProfile: async (profileId, updates) => {
    set({ loading: true, error: null });
    try {
      const payload: SaveSettingsPayload = {
        id: profileId,
        profileName: updates.profileName,
        intervalMinutes: updates.intervalMinutes,
        intensityLevel: updates.intensityLevel,
        activeHoursStart: updates.activeHoursStart,
        activeHoursEnd: updates.activeHoursEnd,
        activeDays: updates.activeDays ? formatDaysString(updates.activeDays) : undefined,
        routingMode: updates.routingMode,
        autoEscalation: updates.autoEscalation,
      };

      await tauriSaveSettings(payload);
      const [allProfiles, activePayload] = await Promise.all([
        tauriGetProfiles(),
        tauriGetSettings(),
      ]);
      const activeProfile = mapPayloadToProfile(activePayload);
      set({
        ...activeProfile,
        profiles: allProfiles.map(mapPayloadToProfile),
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  deleteProfile: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      await tauriDeleteProfile(profileId);
      const [allProfiles, activePayload] = await Promise.all([
        tauriGetProfiles(),
        tauriGetSettings(),
      ]);
      const activeProfile = mapPayloadToProfile(activePayload);
      set({
        ...activeProfile,
        profiles: allProfiles.map(mapPayloadToProfile),
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  exportData: async () => {
    try {
      const json = await tauriExportPostureData();
      if (typeof window !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `posturecheck_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return json;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  clearHistory: async () => {
    set({ loading: true, error: null });
    try {
      const count = await tauriClearPostureHistory();
      set({ loading: false });
      return count;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  testNotification: async (level: number) => {
    try {
      await tauriTestNotification(level);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },
}));
