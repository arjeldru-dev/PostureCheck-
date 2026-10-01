import { useState, useEffect, useRef, useCallback } from 'react';
import type { RibbitState } from '@posture-check/shared';
import type { ReminderEventPayload } from '@/lib/tauri';
import { getRandomRibbitMessage } from '@posture-check/shared';
import { useTimerStore } from '@/stores/timerStore';
import { useAppStore } from '@/stores/appStore';

export interface UseRibbitStateOptions {
  /** Optional custom initial state (default: 'idle') */
  initialState?: RibbitState;
  /** Whether the streak was broken recently */
  streakBroken?: boolean;
  /** Optional overrides for test environments or explicit prop passing */
  activeReminder?: ReminderEventPayload | null;
  currentEscalationLevel?: number;
  timerStatus?: 'active' | 'paused' | 'dnd';
  appStatus?: 'active' | 'paused' | 'dnd';
  isDnd?: boolean;
  isActive?: boolean;
}

export interface UseRibbitStateReturn {
  state: RibbitState;
  message: string | null;
  isCelebrating: boolean;
  setMessage: (msg: string | null) => void;
  dismissMessage: () => void;
  triggerEncouraging: (customMessage?: string) => void;
  triggerCelebrating: (customMessage?: string) => void;
  triggerDisappointed: (customMessage?: string) => void;
  triggerConcerned: (customMessage?: string) => void;
  resetToIdle: () => void;
}

export function useRibbitState(options: UseRibbitStateOptions = {}): UseRibbitStateReturn {
  const timerHook = useTimerStore();
  const appHook = useAppStore();

  // Combine hook subscription with getState() for rock-solid SSR & test rendering
  const activeReminder =
    options.activeReminder !== undefined
      ? options.activeReminder
      : (useTimerStore.getState().activeReminder ?? timerHook.activeReminder);

  const currentEscalationLevel =
    options.currentEscalationLevel !== undefined
      ? options.currentEscalationLevel
      : (useTimerStore.getState().currentEscalationLevel ?? timerHook.currentEscalationLevel);

  const timerStatus =
    options.timerStatus !== undefined
      ? options.timerStatus
      : (useTimerStore.getState().status ?? timerHook.status);

  const appStatus =
    options.appStatus !== undefined
      ? options.appStatus
      : (useAppStore.getState().status ?? appHook.status);

  const isDnd =
    options.isDnd !== undefined
      ? options.isDnd
      : (useAppStore.getState().isDnd || appHook.isDnd);

  const isActive =
    options.isActive !== undefined
      ? options.isActive
      : (useAppStore.getState().isActive && appHook.isActive);

  // 1. Calculate the pure derived base state from timer and app context
  const isSleeping =
    isDnd ||
    !isActive ||
    timerStatus === 'dnd' ||
    timerStatus === 'paused' ||
    appStatus === 'dnd' ||
    appStatus === 'paused';

  const derivedBaseState: RibbitState = (() => {
    if (isSleeping) {
      return 'sleeping';
    }
    if (activeReminder) {
      return currentEscalationLevel >= 2 ? 'concerned' : 'reminding';
    }
    return options.initialState || 'idle';
  })();

  const derivedBaseMessage: string = (() => {
    if (isSleeping) {
      return getRandomRibbitMessage({ state: 'sleeping' }).text;
    }
    if (activeReminder) {
      return activeReminder.message || 'Time for a posture check! 🐸';
    }
    return 'Ribbit is watching your posture! 🐸';
  })();

  // 2. Transient state for temporary animations (celebrating, encouraging, disappointed)
  const [transientState, setTransientState] = useState<RibbitState | null>(null);
  const [transientMessage, setTransientMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const activeState = transientState ?? derivedBaseState;
  const activeMessage = isDismissed ? null : (transientMessage ?? derivedBaseMessage);

  const transientTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTransient = useCallback(() => {
    if (transientTimerRef.current) {
      clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
    setTransientState(null);
    setTransientMessage(null);
  }, []);

  const triggerEncouraging = useCallback(
    (customMsg?: string) => {
      clearTransient();
      setIsDismissed(false);
      setTransientState('encouraging');
      const msg = customMsg || getRandomRibbitMessage({ state: 'encouraging' }).text;
      setTransientMessage(msg);

      transientTimerRef.current = setTimeout(() => {
        setTransientState(null);
        setTransientMessage(null);
      }, 3000);
    },
    [clearTransient]
  );

  const triggerCelebrating = useCallback(
    (customMsg?: string) => {
      clearTransient();
      setIsDismissed(false);
      setTransientState('celebrating');
      const msg = customMsg || getRandomRibbitMessage({ state: 'celebrating' }).text;
      setTransientMessage(msg);

      transientTimerRef.current = setTimeout(() => {
        setTransientState(null);
        setTransientMessage(null);
      }, 5000);
    },
    [clearTransient]
  );

  const triggerDisappointed = useCallback(
    (customMsg?: string) => {
      clearTransient();
      setIsDismissed(false);
      setTransientState('disappointed');
      const msg = customMsg || getRandomRibbitMessage({ state: 'disappointed' }).text;
      setTransientMessage(msg);

      transientTimerRef.current = setTimeout(() => {
        setTransientState(null);
        setTransientMessage(null);
      }, 4000);
    },
    [clearTransient]
  );

  const triggerConcerned = useCallback(
    (customMsg?: string) => {
      clearTransient();
      setIsDismissed(false);
      setTransientState('concerned');
      const msg = customMsg || getRandomRibbitMessage({ state: 'concerned' }).text;
      setTransientMessage(msg);
    },
    [clearTransient]
  );

  const resetToIdle = useCallback(() => {
    clearTransient();
    setIsDismissed(false);
  }, [clearTransient]);

  const setMessage = useCallback((msg: string | null) => {
    if (msg === null) {
      setIsDismissed(true);
      setTransientMessage(null);
    } else {
      setIsDismissed(false);
      setTransientMessage(msg);
    }
  }, []);

  const dismissMessage = useCallback(() => {
    setIsDismissed(true);
    setTransientMessage(null);
  }, []);

  // When active reminder appears, un-dismiss message
  useEffect(() => {
    if (activeReminder) {
      setIsDismissed(false);
    }
  }, [activeReminder]);

  // Initial streak check if broken
  const initialStreakCheckRef = useRef(false);
  useEffect(() => {
    if (!initialStreakCheckRef.current && options.streakBroken) {
      initialStreakCheckRef.current = true;
      triggerDisappointed();
    }
  }, [options.streakBroken, triggerDisappointed]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (transientTimerRef.current) {
        clearTimeout(transientTimerRef.current);
      }
    };
  }, []);

  return {
    state: activeState,
    message: activeMessage,
    isCelebrating: activeState === 'celebrating',
    setMessage,
    dismissMessage,
    triggerEncouraging,
    triggerCelebrating,
    triggerDisappointed,
    triggerConcerned,
    resetToIdle,
  };
}

export default useRibbitState;
