import { useState, useEffect, useCallback } from 'react';
import {
  getNotificationHistory,
  setIntensityLevel,
  testNotification,
  subscribeToNotificationShown,
  type NotificationRecord,
} from '@/lib/tauri';

export interface UseNotificationsOptions {
  onNotificationShown?: (record: NotificationRecord) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [latestNotification, setLatestNotification] = useState<NotificationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getNotificationHistory(30);
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

  useEffect(() => {
    refreshHistory();

    let unlisten: (() => void) | undefined;
    subscribeToNotificationShown((record) => {
      setLatestNotification(record);
      setHistory((prev) => [record, ...prev.slice(0, 49)]);
      options.onNotificationShown?.(record);
    })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to notification-shown:', err);
      });

    return () => {
      unlisten?.();
    };
  }, [options.onNotificationShown, refreshHistory]);

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

  return {
    history,
    latestNotification,
    loading,
    error,
    refreshHistory,
    testNotification: triggerTestNotification,
    setIntensityLevel: updateIntensity,
  };
}
