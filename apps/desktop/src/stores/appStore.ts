import { create } from 'zustand';
import {
  getTrayState,
  togglePause as tauriTogglePause,
  setDnd as tauriSetDnd,
  cancelDnd as tauriCancelDnd,
  updateTimerInterval,
  type TrayStatePayload,
} from '@/lib/tauri';

export interface AppStoreState {
  isActive: boolean;
  isDnd: boolean;
  nextReminderAt: string | null;
  dndUntil: string | null;
  intervalMinutes: number;
  status: 'active' | 'paused' | 'dnd';
  loading: boolean;
  error: string | null;

  // Actions
  setTrayState: (payload: Partial<TrayStatePayload>) => void;
  syncWithBackend: () => Promise<void>;
  togglePause: () => Promise<void>;
  setDnd: (durationMinutes?: number | null) => Promise<void>;
  cancelDnd: () => Promise<void>;
  setIntervalMinutes: (minutes: number) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  isActive: true,
  isDnd: false,
  nextReminderAt: null,
  dndUntil: null,
  intervalMinutes: 30,
  status: 'active',
  loading: false,
  error: null,

  setTrayState: (payload) => {
    set((state) => ({
      ...state,
      ...payload,
      status: payload.status ?? (payload.isDnd ? 'dnd' : payload.isActive ? 'active' : 'paused'),
    }));
  },

  syncWithBackend: async () => {
    set({ loading: true, error: null });
    try {
      const state = await getTrayState();
      set({
        isActive: state.isActive,
        isDnd: state.isDnd,
        nextReminderAt: state.nextReminderAt,
        dndUntil: state.dndUntil,
        intervalMinutes: state.intervalMinutes,
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

  togglePause: async () => {
    try {
      const updated = await tauriTogglePause();
      set({
        isActive: updated.isActive,
        isDnd: updated.isDnd,
        nextReminderAt: updated.nextReminderAt,
        dndUntil: updated.dndUntil,
        status: updated.status,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  setDnd: async (durationMinutes?: number | null) => {
    try {
      const updated = await tauriSetDnd(durationMinutes);
      set({
        isActive: updated.isActive,
        isDnd: updated.isDnd,
        nextReminderAt: updated.nextReminderAt,
        dndUntil: updated.dndUntil,
        status: updated.status,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  cancelDnd: async () => {
    try {
      const updated = await tauriCancelDnd();
      set({
        isActive: updated.isActive,
        isDnd: updated.isDnd,
        nextReminderAt: updated.nextReminderAt,
        dndUntil: updated.dndUntil,
        status: updated.status,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  setIntervalMinutes: async (minutes: number) => {
    try {
      await updateTimerInterval(minutes);
      set({ intervalMinutes: minutes });
      await get().syncWithBackend();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },
}));
