import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  subscribeToTrayState,
  subscribeToAppState,
  subscribeToTrayNavigation,
  type TrayStatePayload,
} from '@/lib/tauri';

export interface UseTrayStateOptions {
  onNavigate?: (destination: 'dashboard' | 'settings') => void;
  onStateChange?: (state: TrayStatePayload) => void;
}

export function useTrayState(options: UseTrayStateOptions = {}) {
  const {
    isActive,
    isDnd,
    nextReminderAt,
    dndUntil,
    intervalMinutes,
    status,
    loading,
    error,
    setTrayState,
    syncWithBackend,
    togglePause,
    setDnd,
    cancelDnd,
    setIntervalMinutes,
  } = useAppStore();

  const onNavigateRef = useRef(options.onNavigate);
  const onStateChangeRef = useRef(options.onStateChange);

  useEffect(() => {
    onNavigateRef.current = options.onNavigate;
    onStateChangeRef.current = options.onStateChange;
  });

  useEffect(() => {
    // Initial sync
    syncWithBackend();

    let unlistenTray: (() => void) | undefined;
    let unlistenApp: (() => void) | undefined;
    let unlistenNav: (() => void) | undefined;

    // Listen to tray-specific events
    subscribeToTrayState((payload) => {
      setTrayState(payload);
      onStateChangeRef.current?.(payload);
    })
      .then((cleanup) => {
        unlistenTray = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to tray state changes:', err);
      });

    // Listen to legacy app-state events as backup
    subscribeToAppState((payload) => {
      setTrayState({
        isActive: !payload.is_paused && !payload.is_dnd,
        isDnd: payload.is_dnd ?? false,
        intervalMinutes: payload.interval_minutes,
        nextReminderAt: payload.next_reminder_at ?? null,
        status: payload.status,
      });
    })
      .then((cleanup) => {
        unlistenApp = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to app state changes:', err);
      });

    // Listen to navigation events from tray context menu (Dashboard / Settings)
    subscribeToTrayNavigation((destination) => {
      onNavigateRef.current?.(destination);
    })
      .then((cleanup) => {
        unlistenNav = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to tray navigation:', err);
      });

    return () => {
      unlistenTray?.();
      unlistenApp?.();
      unlistenNav?.();
    };
  }, [setTrayState, syncWithBackend]);

  return {
    isActive,
    isDnd,
    nextReminderAt,
    dndUntil,
    intervalMinutes,
    status,
    loading,
    error,
    togglePause,
    setDnd,
    cancelDnd,
    setIntervalMinutes,
    syncWithBackend,
  };
}
