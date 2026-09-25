import { useState, useEffect } from 'react';
import {
  LEVEL_THRESHOLDS,
  useThemeStore,
  type MascotState,
} from '@posture-check/shared';
import DesignSystem from './pages/DesignSystem';
import RibbitMascot from '@/components/ribbit/RibbitMascot';
import { useTrayState } from '@/hooks/useTrayState';
import { useTimer } from '@/hooks/useTimer';
import { useNotifications } from '@/hooks/useNotifications';
import {
  sendTestNotification,
  isTauriEnvironment,
} from '@/lib/tauri';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Laptop,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sun,
  Timer,
  Zap,
} from 'lucide-react';

export default function App() {
  const { mode, setMode } = useThemeStore();
  const [currentView, setCurrentView] = useState<'dashboard' | 'design-system'>('dashboard');
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [userXp, setUserXp] = useState<number>(0);
  const isTauri = isTauriEnvironment();

  const showFeedback = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const {
    isActive,
    isDnd,
    nextReminderAt,
    dndUntil,
    intervalMinutes,
    status,
    loading: trayLoading,
    error: trayError,
    togglePause,
    setDnd,
    cancelDnd,
    setIntervalMinutes,
    syncWithBackend: syncTrayWithBackend,
  } = useTrayState({
    onNavigate: (dest) => {
      if (dest === 'settings') {
        showFeedback('System Tray: Opened settings');
      } else {
        showFeedback('System Tray: Opened dashboard');
      }
    },
    onStateChange: (state) => {
      if (state.isDnd) {
        showFeedback('System Tray: Do Not Disturb activated 🔕');
      } else if (!state.isActive) {
        showFeedback('System Tray: Reminders paused ⏸');
      } else {
        showFeedback('System Tray: Reminders resumed ▶');
      }
    },
  });

  const {
    formattedCountdown,
    secondsRemaining,
    isRunning,
    currentEscalationLevel,
    maxEscalationLevel,
    escalationEnabled,
    activeHoursStart,
    activeHoursEnd,
    activeReminder,
    acknowledge,
    snooze,
    dismissReminder,
    syncWithBackend: syncTimerWithBackend,
  } = useTimer({
    onReminder: (reminder) => {
      setMascotState('reminding');
      showFeedback(`🐸 ${reminder.message}`);
    },
    onTimerStateChange: () => {
      // Auto sync visuals
    },
  });

  const { history: notificationHistory, testNotification: triggerNotificationLevel } =
    useNotifications({
      onNotificationShown: (record) => {
        showFeedback(`Notification shown: ${record.title}`);
      },
    });

  const [mascotState, setMascotState] = useState<MascotState>('idle');

  useEffect(() => {
    if (activeReminder) {
      setMascotState('reminding');
    } else if (isDnd || !isActive) {
      setMascotState('sleeping');
    } else {
      setMascotState('encouraging');
    }
  }, [isActive, isDnd, activeReminder]);

  useEffect(() => {
    if (trayError) {
      showFeedback(trayError, true);
    }
  }, [trayError]);

  const handleTestLevelNotification = async (level: number) => {
    try {
      const record = await triggerNotificationLevel(level);
      setMascotState('reminding');
      const levelName =
        level === 1 ? 'Whisper (Silent)' : level === 2 ? 'Nudge (Toast)' : 'Reminder (Chime)';
      showFeedback(`Level ${level} ${levelName} notification sent!`);
    } catch (err) {
      console.error('Failed to trigger notification:', err);
      showFeedback('Failed to send level notification', true);
    }
  };

  const handleTogglePause = async () => {
    try {
      await togglePause();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
      showFeedback('Failed to toggle pause state', true);
    }
  };

  const handleIntervalChange = async (minutes: number) => {
    try {
      await setIntervalMinutes(minutes);
      showFeedback(`Reminder interval set to ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    } catch (err) {
      console.error('Failed to update interval:', err);
      showFeedback(err instanceof Error ? err.message : 'Failed to update interval', true);
    }
  };

  const handleSetDnd = async (minutes: number | null) => {
    try {
      if (minutes === 0) {
        await cancelDnd();
        showFeedback('DND Mode disabled — Reminders active');
      } else {
        await setDnd(minutes);
        showFeedback(
          minutes
            ? `Do Not Disturb set for ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`
            : 'Do Not Disturb active until manually turned off'
        );
      }
    } catch (err) {
      console.error('Failed to update DND mode:', err);
      showFeedback('Failed to update DND mode', true);
    }
  };

  const handleAcknowledge = async () => {
    try {
      const res = await acknowledge();
      setUserXp((prev) => prev + res.xpEarned);
      setMascotState('celebrating');
      showFeedback(`🎉 Awesome posture! +${res.xpEarned} XP earned! Resetting timer.`);
      setTimeout(() => {
        setMascotState('encouraging');
      }, 3000);
    } catch (err) {
      console.error('Failed to acknowledge reminder:', err);
      showFeedback('Failed to acknowledge reminder', true);
    }
  };

  const handleSnooze = async (minutes: number) => {
    try {
      await snooze(minutes);
      setMascotState('idle');
      showFeedback(`💤 Snoozed for ${minutes} minutes`);
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      showFeedback('Failed to snooze reminder', true);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      setMascotState('encouraging');
      showFeedback('Test notification sent to operating system!');
    } catch (err) {
      console.error('Failed to send test notification:', err);
      showFeedback('Failed to send notification: permission denied or unsupported', true);
    }
  };

  const syncAll = async () => {
    await Promise.all([syncTrayWithBackend(), syncTimerWithBackend()]);
  };

  const formatReminderTime = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const dt = new Date(isoString);
      return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  if (currentView === 'design-system') {
    return <DesignSystem onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <main className="min-h-screen bg-theme-bg text-theme-text p-6 flex flex-col justify-between select-none transition-colors duration-200">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Top App Bar */}
        <header className="flex items-center justify-between border-b border-theme-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-frog-green/20 border border-frog-green/40 flex items-center justify-center text-2xl shadow-sm">
              🐸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl text-frog-green tracking-tight">
                  Posture Check!
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-lily-pad/20 text-lily-pad font-mono font-medium">
                  v0.1.0-alpha
                </span>
              </div>
              <p className="text-xs text-theme-muted font-sans">
                Tauri 2.0 Desktop Core • Step 1.2 Timer Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Design System Switcher */}
            <button
              onClick={() => setCurrentView('design-system')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-surface border border-theme-border text-theme-text hover:border-frog-green hover:text-frog-green transition-colors"
              title="Open Design System & Token Catalog"
            >
              <span>🎨 Design Tokens</span>
            </button>

            {/* 3-Way Theme Toggle (dark -> light -> system) */}
            <button
              onClick={() => {
                const nextMode = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
                setMode(nextMode);
                showFeedback(`Theme set to ${nextMode} mode`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text transition-colors"
              title={`Theme: ${mode} (click to cycle: dark → light → system)`}
            >
              {mode === 'dark' ? (
                <Moon className="w-4 h-4 text-sky-blue" />
              ) : mode === 'light' ? (
                <Sun className="w-4 h-4 text-golden-xp" />
              ) : (
                <Laptop className="w-4 h-4 text-frog-green" />
              )}
              <span className="text-[11px] font-mono capitalize">{mode}</span>
            </button>

            {/* Tauri IPC Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                isTauri
                  ? 'bg-frog-green/10 text-frog-green border-frog-green/30'
                  : 'bg-sky-blue/10 text-sky-blue border-sky-blue/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTauri ? 'bg-frog-green animate-pulse' : 'bg-sky-blue'
                }`}
              />
              {isTauri ? 'Rust Timer Engine' : 'Browser Webview Mode'}
            </div>
          </div>
        </header>

        {/* Active Reminder Banner Alert (When Timer Fires!) */}
        {activeReminder && (
          <section className="bg-gradient-to-r from-frog-green/20 via-golden-xp/15 to-lily-pad/20 border-2 border-frog-green rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-frog-green/30 border border-frog-green flex items-center justify-center text-3xl animate-bounce">
                  🐸
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-frog-green text-pond-dark">
                      Level {activeReminder.level} Reminder
                    </span>
                    <span className="text-xs text-text-muted-dark font-mono">
                      {new Date(activeReminder.timestamp).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-text-primary-dark mt-1">
                    {activeReminder.message}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="px-4 py-2.5 rounded-xl font-display font-bold text-sm bg-frog-green hover:bg-frog-green-secondary text-pond-dark shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>✓ Sitting up tall! (+15 XP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze(5)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-surface-dark border border-surface-dark hover:border-text-muted-dark text-text-primary-dark transition-colors"
                >
                  💤 5m
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze(15)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-surface-dark border border-surface-dark hover:border-text-muted-dark text-text-primary-dark transition-colors"
                >
                  💤 15m
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Feedback Alert Toast if triggered */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              feedback.isError
                ? 'bg-coral-alert/15 border-coral-alert/40 text-coral-alert'
                : 'bg-frog-green/15 border-frog-green/40 text-frog-green'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss message"
              className="text-text-muted-dark hover:text-text-primary-dark ml-2 px-1 focus-visible:ring-1 focus-visible:ring-frog-green rounded"
            >
              ×
            </button>
          </div>
        )}

        {/* Hero Welcome Card */}
        <section className="bg-surface-dark/70 backdrop-blur border border-surface-dark rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-frog-green/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            {/* Mascot Avatar with breathing animation */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-frog-green/30 to-lily-pad/10 border-2 border-frog-green/50 flex items-center justify-center p-2 shadow-lg shadow-frog-green/10">
                <RibbitMascot state={mascotState} size="md" />
              </div>
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-golden-xp text-pond-dark font-mono text-[10px] font-bold shadow">
                LVL 1
              </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary-dark">
                  Welcome to Posture Check!
                </h2>
                <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-golden-xp/10 text-golden-xp border border-golden-xp/30 font-medium">
                  <Flame className="w-3.5 h-3.5 fill-golden-xp text-golden-xp" />
                  <span>{userXp > 0 ? '1 Day Streak 🔥' : '0 Day Streak'}</span>
                </div>
              </div>
              <p className="text-sm text-text-muted-dark max-w-xl">
                The Rust async timer engine ticks continuously in the background. It survives
                frontend reloads, auto-escalates if unacknowledged, and respects active hours and DND.
              </p>

              {/* Progress bar preview */}
              <div className="pt-2 max-w-md">
                <div className="flex justify-between text-xs text-text-muted-dark mb-1 font-mono">
                  <span>Current: {LEVEL_THRESHOLDS[0].title}</span>
                  <span className="text-golden-xp">{userXp} / 100 XP</span>
                </div>
                <div className="w-full bg-pond-dark h-2 rounded-full overflow-hidden border border-surface-dark">
                  <div
                    className="bg-gradient-to-r from-frog-green to-lily-pad h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, (userXp / 100) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Timer Engine & System Tray State Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rust Timer Engine Card */}
          <div className="bg-surface-dark/50 border border-surface-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-frog-green">
                <Timer className="w-4 h-4 text-frog-green" />
                <span>Rust Async Timer Engine</span>
              </div>
              <button
                type="button"
                onClick={syncAll}
                disabled={trayLoading}
                aria-label="Refresh app and timer state from Rust backend"
                className="p-1.5 rounded-lg hover:bg-surface-dark text-text-muted-dark hover:text-text-primary-dark transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-frog-green outline-none"
                title="Refresh State"
              >
                <RefreshCw
                  className={`w-4 h-4 ${trayLoading ? 'animate-spin text-frog-green' : ''}`}
                />
              </button>
            </div>

            {/* Big Countdown Display */}
            <div className="p-4 rounded-xl bg-pond-dark/80 border border-surface-dark text-center space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted-dark">
                Time Until Next Posture Reminder
              </div>
              <div className="font-mono text-4xl font-extrabold text-frog-green tracking-tight">
                {formattedCountdown}
              </div>
              <div className="text-xs text-text-muted-dark font-sans flex items-center justify-center gap-2 pt-1">
                <span>
                  {nextReminderAt
                    ? `Fires at ${formatReminderTime(nextReminderAt)}`
                    : isDnd
                    ? 'Silent (DND Active)'
                    : 'Timer Paused'}
                </span>
                {secondsRemaining !== null && isRunning && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-frog-green/20 text-frog-green font-mono">
                    {secondsRemaining}s left
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-pond-dark/60 border border-surface-dark">
                <div className="text-text-muted-dark text-[11px] mb-1">INTENSITY LEVEL</div>
                <div className="flex items-center gap-1.5 font-bold text-golden-xp">
                  <span>
                    Level {currentEscalationLevel} (Max {maxEscalationLevel})
                  </span>
                </div>
                <div className="text-[10px] text-text-muted-dark mt-0.5 font-sans">
                  {escalationEnabled ? 'Auto-escalation active' : 'Escalation disabled'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-pond-dark/60 border border-surface-dark">
                <div className="text-text-muted-dark text-[11px] mb-1">ACTIVE WINDOW</div>
                <div className="flex items-center gap-1.5 font-bold text-sky-blue">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {activeHoursStart} – {activeHoursEnd}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted-dark mt-0.5 font-sans">Mon–Sun</div>
              </div>
            </div>

            {/* Quick Acknowledge Action (if user wants to stretch early) */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleAcknowledge}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-display font-medium bg-frog-green/15 border border-frog-green/30 text-frog-green hover:bg-frog-green hover:text-pond-dark transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Straighten Up Now (+15 XP)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSnooze(5)}
                className="py-2 px-3 rounded-lg text-xs font-mono bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-text-primary-dark border border-surface-dark transition-colors flex items-center gap-1"
                title="Delay reminder by 5 minutes"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>+5m</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Interval Controls Card */}
          <div className="bg-surface-dark/50 border border-surface-dark rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-sky-blue mb-4">
                <Zap className="w-4 h-4" />
                <span>Timer & Tray Controls</span>
              </div>

              {/* Interval Buttons (Including 1m for testing!) */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-text-muted-dark font-medium flex items-center justify-between">
                  <span>Reminder Interval</span>
                  <span className="font-mono text-frog-green">{intervalMinutes} minutes</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleIntervalChange(mins)}
                      aria-label={`Set reminder interval to ${mins} minutes`}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-frog-green outline-none border ${
                        intervalMinutes === mins
                          ? 'bg-frog-green text-pond-dark border-frog-green shadow-sm font-bold'
                          : 'bg-surface-dark/80 text-text-muted-dark hover:text-text-primary-dark hover:bg-surface-dark border-transparent'
                      }`}
                    >
                      {mins === 1 ? '1m ⚡' : `${mins}m`}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-text-muted-dark font-mono pt-0.5">
                  Tip: 1m ⚡ triggers reminder after 60s for verification
                </div>
              </div>

              {/* Do Not Disturb Quick Presets */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-text-muted-dark font-medium flex items-center justify-between">
                  <span>🔕 Do Not Disturb Mode</span>
                  {isDnd && (
                    <span className="text-[11px] font-mono text-purple-400">
                      {dndUntil ? `Until ${formatReminderTime(dndUntil)}` : 'Indefinite'}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetDnd(30)}
                    className="py-1.5 px-2 rounded-lg text-xs font-mono bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-purple-300 border border-surface-dark"
                  >
                    30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDnd(60)}
                    className="py-1.5 px-2 rounded-lg text-xs font-mono bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-purple-300 border border-surface-dark"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDnd(120)}
                    className="py-1.5 px-2 rounded-lg text-xs font-mono bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-purple-300 border border-surface-dark"
                  >
                    2h
                  </button>
                  <button
                    type="button"
                    onClick={() => (isDnd ? handleSetDnd(0) : handleSetDnd(null))}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono border ${
                      isDnd
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                        : 'bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-text-primary-dark border-surface-dark'
                    }`}
                  >
                    {isDnd ? 'Off' : 'Hold'}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions: Pause / Resume & Test Notification */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTogglePause}
                aria-label={!isActive ? 'Resume posture reminders' : 'Pause posture reminders'}
                className={`w-full py-3 px-4 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-frog-green outline-none ${
                  !isActive
                    ? 'bg-frog-green hover:bg-frog-green-secondary text-pond-dark shadow-frog-green/20'
                    : 'bg-coral-alert hover:opacity-90 text-white shadow-coral-alert/20'
                }`}
              >
                {!isActive ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Reminders</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Reminders</span>
                  </>
                )}
              </button>

              {/* Notification Intensity Level Tests (Levels 1-3) */}
              <div className="space-y-1.5 pt-1 border-t border-surface-dark/40">
                <label className="text-[11px] text-text-muted-dark font-medium flex items-center justify-between">
                  <span>🔔 Test Intensity Levels</span>
                  <span className="text-[10px] text-golden-xp font-mono">Phase 1 Levels 1–3</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleTestLevelNotification(1)}
                    className="py-1.5 px-2 rounded-lg bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-frog-green border border-surface-dark flex flex-col items-center"
                    title="Level 1 Whisper: Silent subtle notification (10s auto-dismiss)"
                  >
                    <span className="font-bold">L1 Whisper</span>
                    <span className="text-[10px] text-text-muted-dark/70">Silent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestLevelNotification(2)}
                    className="py-1.5 px-2 rounded-lg bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-golden-xp border border-surface-dark flex flex-col items-center"
                    title="Level 2 Nudge: Toast notification with sound (30s auto-dismiss)"
                  >
                    <span className="font-bold">L2 Nudge</span>
                    <span className="text-[10px] text-text-muted-dark/70">Toast</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestLevelNotification(3)}
                    className="py-1.5 px-2 rounded-lg bg-surface-dark/80 hover:bg-surface-dark text-text-muted-dark hover:text-coral-alert border border-surface-dark flex flex-col items-center"
                    title="Level 3 Reminder: Banner notification with chime"
                  >
                    <span className="font-bold">L3 Reminder</span>
                    <span className="text-[10px] text-text-muted-dark/70">Chime</span>
                  </button>
                </div>
              </div>

              {notificationHistory.length > 0 && (
                <div className="p-2.5 rounded-lg bg-pond-dark border border-surface-dark font-mono text-[10px] text-text-muted-dark">
                  <div className="flex items-center justify-between text-lily-pad font-bold mb-1">
                    <span>LATEST NOTIFICATION</span>
                    <span>LVL {notificationHistory[0].level}</span>
                  </div>
                  <div className="truncate text-text-primary-dark">
                    "{notificationHistory[0].body}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Spec Architecture Verification Pills */}
        <section className="bg-surface-dark/30 border border-surface-dark/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-text-muted-dark uppercase tracking-wider mb-3 font-display flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-frog-green" />
            <span>Phase 01 Core: Timer Engine Architecture</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Rust Tokio Background Task
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  Survives frontend reload, absolute timestamp calculation
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Active Hours & Auto-Escalation
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  08:00–22:00 window, escalates if unacknowledged (2× interval)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Power Suspend & Resume Guard
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  No instant wake fire, pauses timer on sleep
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Windows 11 Tray Pinning Notice */}
        <div className="bg-surface-dark/20 border border-surface-dark/50 rounded-xl p-3 text-xs text-text-muted-dark flex items-start gap-2.5">
          <span className="text-base leading-none mt-0.5">💡</span>
          <div>
            <span className="font-semibold text-text-primary-dark">Timer Engine Note: </span>
            <span>
              All timer calculations happen in Rust native threads. You can close or hide this
              window at any time; Ribbit will notify you according to your configured active schedule.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="text-center text-[11px] text-text-muted-dark pt-6 font-mono border-t border-surface-dark/40 mt-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <span>Posture Check! • Phase 01 Desktop Core</span>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-frog-green" />
          <span>Timer Engine Running</span>
        </div>
      </footer>
    </main>
  );
}
