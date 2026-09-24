import { useState, useEffect } from 'react';
import {
  LEVEL_THRESHOLDS,
  useThemeStore,
  type MascotState,
} from '@posture-check/shared';
import DesignSystem from './pages/DesignSystem';
import RibbitMascot from '@/components/ribbit/RibbitMascot';
import { useTrayState } from '@/hooks/useTrayState';
import {
  sendTestNotification,
  isTauriEnvironment,
} from '@/lib/tauri';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Laptop,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sun,
  Zap,
} from 'lucide-react';

export default function App() {
  const { mode, setMode } = useThemeStore();
  const [currentView, setCurrentView] = useState<'dashboard' | 'design-system'>('dashboard');
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const isTauri = isTauriEnvironment();

  const showFeedback = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 3500);
  };

  const {
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

  const [mascotState, setMascotState] = useState<MascotState>('idle');

  useEffect(() => {
    if (isDnd || !isActive) {
      setMascotState('sleeping');
    } else {
      setMascotState('encouraging');
    }
  }, [isActive, isDnd]);

  useEffect(() => {
    if (error) {
      showFeedback(error, true);
    }
  }, [error]);

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
      showFeedback(`Reminder interval set to ${minutes} minutes`);
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
                Tauri 2.0 System Tray App • Phase 01 Core
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
              {isTauri ? 'Tauri Tray Active' : 'Browser Webview Mode'}
            </div>
          </div>
        </header>

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
                  <span>0 Day Streak</span>
                </div>
              </div>
              <p className="text-sm text-text-muted-dark max-w-xl">
                Ribbit is running in your system tray. Closing this window hides it back to the tray
                so reminders continue smoothly in the background.
              </p>

              {/* Progress bar preview */}
              <div className="pt-2 max-w-md">
                <div className="flex justify-between text-xs text-text-muted-dark mb-1 font-mono">
                  <span>Current: {LEVEL_THRESHOLDS[0].title}</span>
                  <span className="text-golden-xp">0 / 100 XP</span>
                </div>
                <div className="w-full bg-pond-dark h-2 rounded-full overflow-hidden border border-surface-dark">
                  <div
                    className="bg-gradient-to-r from-frog-green to-lily-pad h-full rounded-full transition-all duration-500"
                    style={{ width: '15%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live System Tray State & Controls */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rust Tray Backend State Card */}
          <div className="bg-surface-dark/50 border border-surface-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-frog-green">
                <Laptop className="w-4 h-4" />
                <span>System Tray Status & State</span>
              </div>
              <button
                type="button"
                onClick={() => syncWithBackend()}
                disabled={loading}
                aria-label="Refresh app state from Rust backend"
                className="p-1.5 rounded-lg hover:bg-surface-dark text-text-muted-dark hover:text-text-primary-dark transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-frog-green outline-none"
                title="Refresh State"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-frog-green' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-pond-dark/60 border border-surface-dark">
                <div className="text-text-muted-dark text-[11px] mb-1">MODE</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDnd
                        ? 'bg-purple-400'
                        : isActive
                        ? 'bg-frog-green'
                        : 'bg-coral-alert'
                    }`}
                  />
                  <span
                    className={
                      isDnd
                        ? 'text-purple-400'
                        : isActive
                        ? 'text-frog-green'
                        : 'text-coral-alert'
                    }
                  >
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-pond-dark/60 border border-surface-dark">
                <div className="text-text-muted-dark text-[11px] mb-1">NEXT REMINDER</div>
                <div className="flex items-center gap-1.5 font-bold text-sky-blue">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isDnd
                      ? 'DND SILENT'
                      : !isActive
                      ? 'PAUSED'
                      : formatReminderTime(nextReminderAt) ?? `${intervalMinutes}m`}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Tray Payload */}
            <div className="rounded-lg bg-pond-dark p-3 border border-surface-dark font-mono text-[11px] text-text-muted-dark overflow-x-auto">
              <div className="text-[10px] uppercase text-text-muted-dark/70 mb-1 flex items-center justify-between">
                <span>Tray State Store</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="text-lily-pad/90">
                {JSON.stringify(
                  {
                    isActive,
                    isDnd,
                    status,
                    nextReminderAt,
                    dndUntil,
                    intervalMinutes,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-surface-dark/50 border border-surface-dark rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-sky-blue mb-4">
                <Zap className="w-4 h-4" />
                <span>Timer & Tray Controls</span>
              </div>

              {/* Interval Buttons */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-text-muted-dark font-medium flex items-center justify-between">
                  <span>Reminder Interval</span>
                  <span className="font-mono text-frog-green">{intervalMinutes} minutes</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleIntervalChange(mins)}
                      aria-label={`Set reminder interval to ${mins} minutes`}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-frog-green outline-none border ${
                        intervalMinutes === mins
                          ? 'bg-frog-green text-pond-dark border-frog-green shadow-sm'
                          : 'bg-surface-dark/80 text-text-muted-dark hover:text-text-primary-dark hover:bg-surface-dark border-transparent'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
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

              <button
                type="button"
                onClick={handleTestNotification}
                aria-label="Send test posture check notification"
                className="w-full py-2 px-4 rounded-xl font-display font-medium text-xs flex items-center justify-center gap-2 bg-surface-dark/80 hover:bg-surface-dark hover:text-text-primary-dark text-text-muted-dark border border-surface-dark transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-frog-green outline-none"
              >
                <Bell className="w-3.5 h-3.5 text-golden-xp" />
                <span>Test Notification Capability</span>
              </button>
            </div>
          </div>
        </section>

        {/* Spec Architecture Verification Pills */}
        <section className="bg-surface-dark/30 border border-surface-dark/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-text-muted-dark uppercase tracking-wider mb-3 font-display flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-frog-green" />
            <span>Monorepo & Native Platform Capabilities</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Shared Package Linked
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  Tokens from @posture-check/shared loaded
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Tauri 2.0 System Tray
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  Icon state, context menu & DND submenus
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-pond-dark/40 border border-surface-dark/40 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-frog-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary-dark block">
                  Hide-to-Tray Lifecycle
                </span>
                <span className="text-[11px] text-text-muted-dark">
                  Close button (X) preserves background execution
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Windows 11 Tray Pinning Notice */}
        <div className="bg-surface-dark/20 border border-surface-dark/50 rounded-xl p-3 text-xs text-text-muted-dark flex items-start gap-2.5">
          <span className="text-base leading-none mt-0.5">💡</span>
          <div>
            <span className="font-semibold text-text-primary-dark">Windows 11 Tip: </span>
            <span>
              If Ribbit is hidden in the taskbar chevron (^), right-click your taskbar →{' '}
              <span className="text-lily-pad font-medium">Taskbar settings</span> →{' '}
              <span className="text-lily-pad font-medium">Other system tray icons</span> → toggle{' '}
              <span className="text-frog-green font-semibold">Posture Check!</span> On to pin Ribbit to the visible tray.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="text-center text-[11px] text-text-muted-dark pt-6 font-mono border-t border-surface-dark/40 mt-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <span>Posture Check! • Phase 01 System Tray Core</span>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-frog-green" />
          <span>System Healthy</span>
        </div>
      </footer>
    </main>
  );
}
