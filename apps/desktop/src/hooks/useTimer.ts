import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import {
  subscribeToTimerState,
  subscribeToPostureReminder,
  type ReminderEventPayload,
  type TimerStatePayload,
} from '@/lib/tauri';

export interface UseTimerOptions {
  onReminder?: (reminder: ReminderEventPayload) => void;
  onTimerStateChange?: (state: TimerStatePayload) => void;
}

export function useTimer(options: UseTimerOptions = {}) {
  const {
    intervalMinutes,
    nextFireAt,
    isRunning,
    secondsRemaining,
    currentEscalationLevel,
    maxEscalationLevel,
    escalationEnabled,
    activeHoursStart,
    activeHoursEnd,
    activeDays,
    lastAcknowledgedAt,
    status,
    activeReminder,
    lastXpEarned,
    loading,
    error,
    setTimerState,
    setActiveReminder,
    syncWithBackend,
    setIntervalMinutes,
    acknowledge,
    snooze,
    setActiveHours,
    setActiveDays,
    setEscalationSettings,
    tickSecond,
  } = useTimerStore();

  const onReminderRef = useRef(options.onReminder);
  const onTimerStateChangeRef = useRef(options.onTimerStateChange);

  useEffect(() => {
    onReminderRef.current = options.onReminder;
    onTimerStateChangeRef.current = options.onTimerStateChange;
  });

  // 1. Initial sync and Tauri event subscriptions
  useEffect(() => {
    syncWithBackend();

    let unlistenTimer: (() => void) | undefined;
    let unlistenReminder: (() => void) | undefined;

    // Subscribe to timer state updates emitted from Rust
    subscribeToTimerState((payload) => {
      setTimerState(payload);
      onTimerStateChangeRef.current?.(payload);
    })
      .then((cleanup) => {
        unlistenTimer = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to timer state:', err);
      });

    // Subscribe to posture reminder trigger events
    subscribeToPostureReminder((reminder) => {
      setActiveReminder(reminder);
      onReminderRef.current?.(reminder);
    })
      .then((cleanup) => {
        unlistenReminder = cleanup;
      })
      .catch((err) => {
        console.error('Failed to subscribe to posture reminders:', err);
      });

    return () => {
      unlistenTimer?.();
      unlistenReminder?.();
    };
  }, [setTimerState, setActiveReminder, syncWithBackend]);

  // 2. React display interval: tick secondsRemaining smoothly every 1000ms & sync on visibility
  useEffect(() => {
    const interval = setInterval(() => {
      tickSecond();
    }, 1000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        tickSecond();
        syncWithBackend();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      }
    };
  }, [tickSecond, syncWithBackend]);

  // Format secondsRemaining into MM:SS display string
  const formattedCountdown = (() => {
    if (!isRunning || secondsRemaining === null || status !== 'active') {
      if (status === 'paused') return 'Paused';
      if (status === 'dnd') return 'DND';
      return '--:--';
    }
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })();

  return {
    intervalMinutes,
    nextFireAt,
    isRunning,
    secondsRemaining,
    formattedCountdown,
    currentEscalationLevel,
    maxEscalationLevel,
    escalationEnabled,
    activeHoursStart,
    activeHoursEnd,
    activeDays,
    lastAcknowledgedAt,
    status,
    activeReminder,
    lastXpEarned,
    loading,
    error,
    acknowledge,
    snooze,
    setInterval: setIntervalMinutes,
    setActiveHours,
    setActiveDays,
    setEscalationSettings,
    syncWithBackend,
    dismissReminder: () => setActiveReminder(null),
  };
}
