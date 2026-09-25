import { create } from 'zustand';
import {
  getTimerState,
  updateTimerInterval,
  acknowledgeReminder,
  snoozeReminder,
  setActiveHours as tauriSetActiveHours,
  setActiveDays as tauriSetActiveDays,
  setEscalationSettings as tauriSetEscalationSettings,
  type TimerStatePayload,
  type AcknowledgePayload,
  type ReminderEventPayload,
} from '@/lib/tauri';

export interface TimerStoreState {
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
  activeReminder: ReminderEventPayload | null;
  lastXpEarned: number | null;
  loading: boolean;
  error: string | null;

  // Actions
  setTimerState: (payload: Partial<TimerStatePayload>) => void;
  setActiveReminder: (reminder: ReminderEventPayload | null) => void;
  syncWithBackend: () => Promise<void>;
  setIntervalMinutes: (minutes: number) => Promise<void>;
  acknowledge: () => Promise<AcknowledgePayload>;
  snooze: (minutes: number) => Promise<void>;
  setActiveHours: (start: string, end: string) => Promise<void>;
  setActiveDays: (days: number[]) => Promise<void>;
  setEscalationSettings: (enabled: boolean, maxLevel?: number) => Promise<void>;
  tickSecond: () => void;
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  intervalMinutes: 30,
  nextFireAt: null,
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
  activeReminder: null,
  lastXpEarned: null,
  loading: false,
  error: null,

  setTimerState: (payload) => {
    set((state) => ({
      ...state,
      ...payload,
    }));
  },

  setActiveReminder: (reminder) => {
    set({ activeReminder: reminder });
  },

  syncWithBackend: async () => {
    set({ loading: true, error: null });
    try {
      const state = await getTimerState();
      set({
        intervalMinutes: state.intervalMinutes,
        nextFireAt: state.nextFireAt,
        isRunning: state.isRunning,
        secondsRemaining: state.secondsRemaining,
        currentEscalationLevel: state.currentEscalationLevel,
        maxEscalationLevel: state.maxEscalationLevel,
        escalationEnabled: state.escalationEnabled,
        activeHoursStart: state.activeHoursStart,
        activeHoursEnd: state.activeHoursEnd,
        activeDays: state.activeDays,
        lastAcknowledgedAt: state.lastAcknowledgedAt,
        status: state.status,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  setIntervalMinutes: async (minutes: number) => {
    try {
      const updated = await updateTimerInterval(minutes);
      set({
        intervalMinutes: updated.intervalMinutes,
        nextFireAt: updated.nextFireAt,
        secondsRemaining: updated.secondsRemaining,
        status: updated.status,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  acknowledge: async () => {
    try {
      const res = await acknowledgeReminder();
      set({
        activeReminder: null,
        lastXpEarned: res.xpEarned,
        currentEscalationLevel: res.currentEscalationLevel,
        nextFireAt: res.nextReminderAt,
        secondsRemaining: res.secondsRemaining,
        lastAcknowledgedAt: res.acknowledgedAt,
      });
      return res;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  snooze: async (minutes: number) => {
    try {
      const updated = await snoozeReminder(minutes);
      set({
        activeReminder: null,
        nextFireAt: updated.nextFireAt,
        secondsRemaining: updated.secondsRemaining,
        status: updated.status,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  setActiveHours: async (start: string, end: string) => {
    try {
      const updated = await tauriSetActiveHours(start, end);
      set({
        activeHoursStart: updated.activeHoursStart,
        activeHoursEnd: updated.activeHoursEnd,
        nextFireAt: updated.nextFireAt,
        secondsRemaining: updated.secondsRemaining,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  setActiveDays: async (days: number[]) => {
    try {
      const updated = await tauriSetActiveDays(days);
      set({
        activeDays: updated.activeDays,
        nextFireAt: updated.nextFireAt,
        secondsRemaining: updated.secondsRemaining,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  setEscalationSettings: async (enabled: boolean, maxLevel?: number) => {
    try {
      const updated = await tauriSetEscalationSettings(enabled, maxLevel);
      set({
        escalationEnabled: updated.escalationEnabled,
        maxEscalationLevel: updated.maxEscalationLevel,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  tickSecond: () => {
    set((state) => {
      if (!state.isRunning || state.status !== 'active') {
        return state;
      }

      // If nextFireAt exists, calculate exact difference to prevent drift
      if (state.nextFireAt) {
        const diff = Math.max(
          0,
          Math.floor((new Date(state.nextFireAt).getTime() - Date.now()) / 1000)
        );
        return { ...state, secondsRemaining: diff };
      }

      if (state.secondsRemaining === null || state.secondsRemaining <= 0) {
        return state;
      }
      return { ...state, secondsRemaining: state.secondsRemaining - 1 };
    });
  },
}));
