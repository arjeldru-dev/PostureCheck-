import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { openExternalUrl } from '@/lib/tauri';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  Smile,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { ThemeMode, MascotTone } from '@posture-check/shared';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function GeneralSettings() {
  const {
    launchOnStartup,
    themeMode,
    mascotTone,
    setLaunchOnStartup,
    setThemeMode,
    setMascotTone,
    exportData,
    clearHistory,
  } = useSettingsStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportData();
      setExportNotice('Posture data exported successfully!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      setExportNotice(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      const deletedCount = await clearHistory();
      setShowClearModal(false);
      setClearNotice(`Cleared ${deletedCount} history records.`);
      setTimeout(() => setClearNotice(null), 4000);
    } catch (err) {
      alert(`Clear failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-(--color-theme-text)">
      {/* Tab Header */}
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-(--color-frog-green)" />
          General Preferences
        </h2>
        <p className="text-sm text-(--color-theme-muted) mt-1">
          Customize system behavior, visual appearance, mascot personality, and data management.
        </p>
      </div>

      {/* Startup Behavior */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Launch on Startup</h3>
            <p className="text-xs text-(--color-theme-muted) max-w-xl leading-relaxed">
              Start Posture Check! minimized to the system tray automatically when your computer boots up.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={launchOnStartup}
            onClick={() => setLaunchOnStartup(!launchOnStartup)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50 ${
              launchOnStartup ? 'bg-(--color-frog-green)' : 'bg-(--color-theme-border)'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                launchOnStartup ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Theme Appearance */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold">Appearance & Theme</h3>
          <p className="text-xs text-(--color-theme-muted)">
            Choose your preferred color theme or adapt to your operating system settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { id: 'system', label: 'System Sync', icon: Laptop, desc: 'Follows OS mode' },
              { id: 'light', label: 'Pond Light', icon: Sun, desc: 'Clean high contrast' },
              { id: 'dark', label: 'Deep Pond', icon: Moon, desc: 'Sleek dark mode' },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = themeMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setThemeMode(item.id as ThemeMode)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-(--color-frog-green) bg-(--color-frog-green)/10 shadow-(--shadow-glow-green)'
                    : 'border-(--color-theme-border) bg-(--color-theme-card) hover:border-(--color-frog-green)/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-(--color-frog-green)" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-(--color-frog-green)" />}
                </div>
                <p className="text-[11px] text-(--color-theme-muted) mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mascot Tone */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Smile className="w-4 h-4 text-(--color-frog-green)" />
            Ribbit Mascot Tone
          </h3>
          <p className="text-xs text-(--color-theme-muted)">
            Customize the personality and phrasing Ribbit uses during posture checks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                id: 'encouraging',
                emoji: '💖',
                label: 'Encouraging',
                desc: 'Supportive, wholesome and friendly reminders.',
              },
              {
                id: 'sassy',
                emoji: '😏',
                label: 'Sassy',
                desc: 'Witty, playful roasts when you catch yourself slouching.',
              },
              {
                id: 'minimal',
                emoji: '🧘',
                label: 'Minimal',
                desc: 'Concise, no-nonsense posture cues.',
              },
            ] as const
          ).map((item) => {
            const isSelected = mascotTone === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMascotTone(item.id as MascotTone)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-(--color-frog-green) bg-(--color-frog-green)/10'
                    : 'border-(--color-theme-border) bg-(--color-theme-card) hover:border-(--color-frog-green)/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>{item.emoji}</span>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-(--color-frog-green)" />}
                </div>
                <p className="text-[11px] text-(--color-theme-muted) mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Management Section */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold">Data & Privacy</h3>
          <p className="text-xs text-(--color-theme-muted)">
            Your posture records and gamification stats are stored 100% locally on your machine in SQLite.
          </p>
        </div>

        {exportNotice && (
          <div className="p-3 rounded-xl bg-(--color-frog-green)/10 border border-(--color-frog-green)/30 text-xs text-(--color-frog-green) flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {clearNotice && (
          <div className="p-3 rounded-xl bg-(--color-coral-alert)/10 border border-(--color-coral-alert)/30 text-xs text-(--color-coral-alert) flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{clearNotice}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-(--color-theme-card) border border-(--color-theme-border) hover:border-(--color-frog-green)/50 hover:bg-(--color-frog-green)/10 text-(--color-theme-text) transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-(--color-frog-green)" />}
            Export Data as JSON
          </button>

          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-(--color-coral-alert)/10 border border-(--color-coral-alert)/30 hover:bg-(--color-coral-alert)/20 text-(--color-coral-alert) transition-all shadow-sm active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-(--color-coral-alert)">
              <div className="w-10 h-10 rounded-full bg-(--color-coral-alert)/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold font-display">Clear Posture Check History?</h4>
                <p className="text-xs text-(--color-theme-muted)">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-(--color-theme-muted) leading-relaxed">
              All logged checks, timestamps, and test notifications will be purged from SQLite. Your
              unlocked achievements, user level, and profiles will be preserved.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-(--color-theme-muted) hover:text-(--color-theme-text)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-(--color-coral-alert) text-white hover:bg-(--color-coral-alert)/90 disabled:opacity-50"
              >
                {isClearing && <Loader2 className="w-3 h-3 animate-spin" />}
                Yes, Purge History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--color-frog-green)/20 flex items-center justify-center text-xl">
              🐸
            </div>
            <div>
              <h3 className="text-base font-bold font-display">Posture Check! Desktop</h3>
              <p className="text-xs text-(--color-theme-muted)">Version 0.1.0 · Tauri 2.0 & React</p>
            </div>
          </div>

          <a
            href="https://github.com/arjeldru-dev/PostureCheck-"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openExternalUrl('https://github.com/arjeldru-dev/PostureCheck-');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-frog-green) hover:underline cursor-pointer"
          >
            <GithubIcon className="w-4 h-4" />
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-(--color-theme-muted) pt-1 leading-relaxed">
          Crafted with love to keep spine health delightful, engaging, and effortless. Ribbit the frog
          is always ready to cheer on your best posture!
        </p>
      </div>
    </div>
  );
}
