import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotificationHistory,
  setIntensityLevel,
  testNotification,
  handleNotificationAction,
  checkNotificationPermission,
  subscribeToNotificationShown,
  subscribeToNotificationAcknowledged,
  subscribeToNotificationSnoozed,
  subscribeToNotificationDismissed,
  subscribeToNotificationExpired,
  type NotificationRecord,
  type NotificationAcknowledgedPayload,
  type NotificationSnoozedPayload,
  type NotificationDismissedPayload,
  type NotificationExpiredPayload,
} from '@/lib/tauri';

import { useGamificationStore } from '@/stores/gamificationStore';

export interface UseNotificationsOptions {
  onNotificationShown?: (record: NotificationRecord) => void;
  onNotificationAcknowledged?: (payload: NotificationAcknowledgedPayload) => void;
  onNotificationSnoozed?: (payload: NotificationSnoozedPayload) => void;
  onNotificationDismissed?: (payload: NotificationDismissedPayload) => void;
  onNotificationExpired?: (payload: NotificationExpiredPayload) => void;
}

function playNotificationChime(level: number) {
  // Only Level 3 (Reminder) plays the gentle chime audio
  // Level 2 (Nudge) uses the system default notification sound
  // Level 1 (Whisper) is completely silent
  if (typeof window !== 'undefined' && level === 3) {
    try {
      const audio = new Audio('/sounds/notification-chime.wav');
      audio.volume = 0.85;
      audio.play().catch(() => {
        // Autoplay policy or no user interaction yet, ignore
      });
    } catch {
      // Audio not supported in environment
    }
  }
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [latestNotification, setLatestNotification] = useState<NotificationRecord | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getNotificationHistory(50);
      setHistory(records);
      if (records.length > 0) {
        setLatestNotification(records[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPermission = useCallback(async () => {
    try {
      const perm = await checkNotificationPermission();
      setPermissionState(perm);
    } catch (err) {
      console.warn('Failed to query notification permission:', err);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
    refreshPermission();

    // Re-check permission whenever window gains focus (e.g. returning from Windows Settings)
    const handleFocus = () => {
      refreshPermission();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic check every 2.5 seconds to detect OS setting changes
    const permissionInterval = setInterval(() => {
      refreshPermission();
    }, 2500);

    const cleanups: (() => void)[] = [
      () => window.removeEventListener('focus', handleFocus),
      () => clearInterval(permissionInterval),
    ];

    // 1. Notification shown event
    subscribeToNotificationShown((record) => {
      setLatestNotification(record);
      setHistory((prev) => {
        // Update superseded items and insert new record at top
        const filtered = prev.filter((r) => r.id !== record.id);
        return [record, ...filtered.slice(0, 49)];
      });
      playNotificationChime(record.level);
      optionsRef.current.onNotificationShown?.(record);
    }).then((unlisten) => cleanups.push(unlisten));

    // 2. Notification acknowledged event
    subscribeToNotificationAcknowledged((payload) => {
      setHistory((prev) =>
        prev.map((r) => {
          if (!payload.id || r.id === payload.id) {
            return { ...r, status: 'acknowledged' };
          }
          return r;
        })
      );
      setLatestNotification((current) => {
        if (!current) return null;
        if (!payload.id || current.id === payload.id) {
          return { ...current, status: 'acknowledged' };
        }
        return current;
      });
      optionsRef.current.onNotificationAcknowledged?.(payload);
    }).then((unlisten) => cleanups.push(unlisten));

    // 3. Notification snoozed event
    subscribeToNotificationSnoozed((payload) => {
      setHistory((prev) =>
        prev.map((r) => {
          if (!payload.id || r.id === payload.id) {
            return { ...r, status: 'snoozed' };
          }
          return r;
        })
      );
      setLatestNotification((current) => {
        if (!current) return null;
        if (!payload.id || current.id === payload.id) {
          return { ...current, status: 'snoozed' };
        }
        return current;
      });
      optionsRef.current.onNotificationSnoozed?.(payload);
    }).then((unlisten) => cleanups.push(unlisten));

    // 4. Notification dismissed event
    subscribeToNotificationDismissed((payload) => {
      setHistory((prev) =>
        prev.map((r) => {
          if (!payload.id || r.id === payload.id) {
            return { ...r, status: 'dismissed' };
          }
          return r;
        })
      );
      setLatestNotification((current) => {
        if (!current) return null;
        if (!payload.id || current.id === payload.id) {
          return { ...current, status: 'dismissed' };
        }
        return current;
      });
      optionsRef.current.onNotificationDismissed?.(payload);
    }).then((unlisten) => cleanups.push(unlisten));

    // 5. Notification expired event
    subscribeToNotificationExpired((payload) => {
      setHistory((prev) =>
        prev.map((r) => {
          if (r.id === payload.id) {
            return { ...r, status: 'expired' };
          }
          return r;
        })
      );
      setLatestNotification((current) => {
        if (!current) return null;
        if (current.id === payload.id) {
          return { ...current, status: 'expired' };
        }
        return current;
      });
      optionsRef.current.onNotificationExpired?.(payload);
    }).then((unlisten) => cleanups.push(unlisten));

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [refreshHistory, refreshPermission]);

  const triggerTestNotification = async (level: number) => {
    try {
      const record = await testNotification(level);
      setLatestNotification(record);
      setHistory((prev) => [record, ...prev.slice(0, 49)]);
      return record;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const updateIntensity = async (level: number) => {
    try {
      return await setIntensityLevel(level);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const executeAction = async (action: 'sitting_up' | 'snooze' | 'dismiss' | string, notificationId?: string) => {
    try {
      const notifId = notificationId || latestNotification?.id;
      return await handleNotificationAction(action, notifId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const acknowledge = async (notificationId?: string) => {
    try {
      const notifId = notificationId || latestNotification?.id;
      const actionResult = await executeAction('sitting_up', notifId);
      await useGamificationStore.getState().initialize().catch(() => null);
      const state = useGamificationStore.getState();
      return {
        ...actionResult,
        xpEarned: (actionResult as { xpEarned?: number })?.xpEarned ?? 10,
        currentLevel: state.currentLevel,
        levelTitle: state.levelTitle,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };
  const snooze = (_minutes = 5, notificationId?: string) => executeAction('snooze', notificationId);
  const dismiss = (notificationId?: string) => executeAction('dismiss', notificationId);

  return {
    history,
    latestNotification,
    permissionState,
    isPermissionDenied: permissionState === 'denied',
    loading,
    error,
    refreshHistory,
    refreshPermission,
    testNotification: triggerTestNotification,
    setIntensityLevel: updateIntensity,
    handleAction: executeAction,
    acknowledge,
    snooze,
    dismiss,
  };
}
