import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import TimingSettings from '@/components/settings/TimingSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import ScheduleSettings from '@/components/settings/ScheduleSettings';
import DndSettings from '@/components/settings/DndSettings';
import GeneralSettings from '@/components/settings/GeneralSettings';
import {
  Clock,
  Bell,
  Calendar,
  BellOff,
  Settings as SettingsIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export type SettingsTabId = 'timing' | 'notifications' | 'schedule' | 'dnd' | 'general';

interface SettingsPageProps {
  onBackToDashboard?: () => void;
  initialTab?: SettingsTabId;
}

const TABS: Array<{
  id: SettingsTabId;
  label: string;
  desc: string;
  icon: typeof Clock;
}> = [
  { id: 'timing', label: 'Timing', desc: 'Interval & Active Hours', icon: Clock },
  { id: 'notifications', label: 'Notifications', desc: 'Intensity & Sound', icon: Bell },
  { id: 'schedule', label: 'Schedule', desc: 'Quick Profiles', icon: Calendar },
  { id: 'dnd', label: 'Do Not Disturb', desc: 'Silence & Quiet Times', icon: BellOff },
  { id: 'general', label: 'General', desc: 'Startup, Tone & Data', icon: SettingsIcon },
];

export default function Settings({ onBackToDashboard, initialTab = 'timing' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const { loadSettings, hasLoaded, loading, profileName } = useSettingsStore();

  useEffect(() => {
    if (!hasLoaded) {
      loadSettings();
    }
  }, [hasLoaded, loadSettings]);

  return (
    <div className="h-screen max-h-screen bg-(--color-theme-bg) text-(--color-theme-text) font-sans antialiased selection:bg-(--color-frog-green)/20 flex flex-col overflow-y-auto">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-(--color-theme-bg)/90 backdrop-blur-md border-b border-(--color-theme-border) px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-(--color-theme-surface) border border-(--color-theme-border) hover:border-(--color-frog-green) hover:text-(--color-frog-green) transition-all active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🐸</span>
              <h1 className="text-xl font-bold font-display text-(--color-theme-text)">
                Settings & Preferences
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-(--color-frog-green)/10 text-(--color-frog-green) px-2 py-0.5 rounded-full border border-(--color-frog-green)/20">
                <CheckCircle2 className="w-3 h-3" />
                Profile: {profileName}
              </span>
            </div>
            <p className="text-xs text-(--color-theme-muted) hidden sm:block">
              All modifications auto-save and sync immediately with the desktop timer engine.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-(--color-theme-muted)">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-(--color-frog-green)" />
            <span>Syncing...</span>
          </div>
        )}
      </header>

      {/* Main Body Layout: Vertical Tabs Left, Content Right */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6 pb-20">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-24 self-start">
          <nav
            aria-label="Settings categories"
            className="p-2 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-xs space-y-1"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-selected={isSelected}
                  role="tab"
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-(--color-frog-green) text-white shadow-(--shadow-glow-green)'
                      : 'text-(--color-theme-text) hover:bg-(--color-theme-border)/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/20' : 'bg-(--color-theme-card) text-(--color-frog-green)'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold font-display truncate">{tab.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-white/80' : 'text-(--color-theme-muted)'
                      }`}
                    >
                      {tab.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0" role="tabpanel">
          {activeTab === 'timing' && <TimingSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'schedule' && <ScheduleSettings />}
          {activeTab === 'dnd' && <DndSettings />}
          {activeTab === 'general' && <GeneralSettings />}
        </main>
      </div>
    </div>
  );
}
