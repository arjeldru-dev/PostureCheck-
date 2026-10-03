import { useState, useEffect } from 'react';
import { useThemeStore } from '@posture-check/shared';
import DesignSystem from './pages/DesignSystem';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import { useTrayState } from '@/hooks/useTrayState';
import { useNotifications } from '@/hooks/useNotifications';
import { useGamificationStore } from '@/stores/gamificationStore';
import { isTauriEnvironment } from '@/lib/tauri';
import {
  Laptop,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Palette,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react';
import {
  WhisperNotification,
  NudgeNotification,
  ReminderNotification,
} from '@/components/notifications';

export default function App() {
  const { mode, setMode } = useThemeStore();
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'design-system'>('dashboard');
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const isTauri = isTauriEnvironment();

  const showFeedback = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const { error: trayError } = useTrayState({
    onNavigate: (dest) => {
      if (dest === 'settings') {
        setCurrentView('settings');
        showFeedback('System Tray: Opened settings');
      } else {
        setCurrentView('dashboard');
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
    latestNotification,
    acknowledge,
    snooze,
    dismiss,
    isPermissionDenied,
    refreshPermission,
  } = useNotifications({
    onNotificationShown: (record) => {
      showFeedback(`Notification shown: ${record.title}`);
    },
    onNotificationAcknowledged: (payload) => {
      showFeedback(`✓ Sitting up! Reminder acknowledged (+${payload.xpEarned} XP) 🎉`);
    },
    onNotificationSnoozed: (payload) => {
      showFeedback(`💤 Snoozed for ${payload.minutes} minutes`);
    },
    onNotificationDismissed: () => {
      showFeedback(`Notification dismissed`);
    },
  });

  useEffect(() => {
    useGamificationStore.getState().initialize().catch((err) => {
      console.warn('Failed to initialize gamification store:', err);
    });
  }, []);

  useEffect(() => {
    if (trayError) {
      showFeedback(trayError, true);
    }
  }, [trayError]);

  return (
    <main className="min-h-screen bg-theme-bg text-theme-text flex flex-col justify-between select-none transition-colors duration-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-theme-bg/90 backdrop-blur-md border-b border-theme-border px-6 py-3.5">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          {/* Logo & Version */}
          <div
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-frog-green/20 border border-frog-green/40 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
              🐸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg text-frog-green tracking-tight">
                  Posture Check!
                </h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-lily-pad/20 text-lily-pad font-mono font-medium">
                  v0.2.0-beta
                </span>
              </div>
              <p className="text-[11px] text-theme-muted font-sans">
                Desktop Mascot & Smart Coach
              </p>
            </div>
          </div>

          {/* Navigation Tabs and Controls */}
          <div className="flex items-center gap-2">
            {/* View Switchers */}
            <nav className="flex items-center bg-theme-surface border border-theme-border rounded-xl p-0.5">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-frog-green text-white font-semibold shadow-xs'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
                title="Open Mascot Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentView('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'settings'
                    ? 'bg-frog-green text-white font-semibold shadow-xs'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
                title="Open Settings Panel"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setCurrentView('design-system')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'design-system'
                    ? 'bg-frog-green text-white font-semibold shadow-xs'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
                title="Open Design Tokens"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Design Tokens</span>
              </button>
            </nav>

            {/* 3-Way Theme Toggle */}
            <button
              onClick={() => {
                const nextMode = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
                setMode(nextMode);
                showFeedback(`Theme set to ${nextMode} mode`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text transition-colors cursor-pointer active:scale-97"
              title={`Theme: ${mode} (click to cycle: dark → light → system)`}
            >
              {mode === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-sky-blue" />
              ) : mode === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-golden-xp" />
              ) : (
                <Laptop className="w-3.5 h-3.5 text-frog-green" />
              )}
            </button>

            {/* Tauri IPC Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                isTauri
                  ? 'bg-frog-green/10 text-frog-green border-frog-green/30'
                  : 'bg-sky-blue/10 text-sky-blue border-sky-blue/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isTauri ? 'bg-frog-green animate-pulse' : 'bg-sky-blue'
                }`}
              />
              <span>{isTauri ? 'Rust Engine' : 'Webview'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* OS Notification Permission Warning Banner (if disabled at OS level) */}
      {isPermissionDenied && (
        <div className="max-w-4xl w-full mx-auto px-6 pt-4">
          <div className="bg-golden-xp/10 border border-golden-xp/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-golden-xp animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold block">Desktop Notifications are disabled in your OS Settings</span>
                <span className="text-theme-muted text-[11px]">
                  Reminders will show inside this app. Enable notifications in OS Settings to receive toasts.
                </span>
              </div>
            </div>
            <button
              onClick={() => refreshPermission()}
              className="px-2.5 py-1 rounded-lg bg-golden-xp/20 hover:bg-golden-xp/30 font-mono text-[11px] text-golden-xp border border-golden-xp/40 transition-colors shrink-0 cursor-pointer"
            >
              Re-check
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col overflow-y-auto">
        {currentView === 'dashboard' && (
          <Dashboard
            onOpenSettings={() => setCurrentView('settings')}
            onOpenDesignSystem={() => setCurrentView('design-system')}
            onShowFeedback={showFeedback}
          />
        )}

        {currentView === 'settings' && (
          <Settings onBackToDashboard={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'design-system' && (
          <DesignSystem onBack={() => setCurrentView('dashboard')} />
        )}
      </div>

      {/* Floating Action/Event Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-40 animate-pop-in">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border text-xs font-medium flex items-center gap-2 ${
              feedback.isError
                ? 'bg-coral-alert/15 border-coral-alert text-coral-alert'
                : 'bg-theme-surface/95 border-frog-green/50 text-theme-text shadow-frog-green/10'
            }`}
          >
            {!feedback.isError && <CheckCircle2 className="w-3.5 h-3.5 text-frog-green shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* In-App Notification Host for Levels 1–3 */}
      {latestNotification && latestNotification.status === 'shown' && (
        <>
          {latestNotification.level === 1 && (
            <WhisperNotification
              key={latestNotification.id}
              message={latestNotification.body}
              onAcknowledge={() => acknowledge(latestNotification.id)}
              onDismiss={() => dismiss(latestNotification.id)}
            />
          )}

          {latestNotification.level === 2 && (
            <NudgeNotification
              key={latestNotification.id}
              title={latestNotification.title}
              message={latestNotification.body}
              onAcknowledge={() => acknowledge(latestNotification.id)}
              onSnooze={() => snooze(5, latestNotification.id)}
              onDismiss={() => dismiss(latestNotification.id)}
            />
          )}

          {latestNotification.level === 3 && (
            <ReminderNotification
              key={latestNotification.id}
              title={latestNotification.title}
              message={latestNotification.body}
              onAcknowledge={() => acknowledge(latestNotification.id)}
              onSnooze={() => snooze(5, latestNotification.id)}
              onDismiss={() => dismiss(latestNotification.id)}
            />
          )}
        </>
      )}
    </main>
  );
}
