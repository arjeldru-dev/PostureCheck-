import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { BellOff, Bell, Moon, Clock, MonitorPlay, Check, AlertCircle } from 'lucide-react';

const DND_PRESETS = [
  { label: '30 Minutes', minutes: 30 },
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
  { label: 'Indefinitely', minutes: null },
];

export default function DndSettings() {
  const {
    scheduledDndEnabled,
    scheduledDndStart,
    scheduledDndEnd,
    autoDndFullscreen,
    setScheduledDnd,
    setAutoDndFullscreen,
  } = useSettingsStore();

  const {
    isDnd,
    dndUntil,
    setDnd,
    cancelDnd,
  } = useAppStore();

  const [customMinutes, setCustomMinutes] = useState<number | null>(null);

  const handleToggleDnd = async () => {
    if (isDnd) {
      await cancelDnd();
    } else {
      await setDnd(customMinutes);
    }
  };

  const handleSelectPreset = async (minutes: number | null) => {
    setCustomMinutes(minutes);
    await setDnd(minutes);
  };

  const formatDndUntil = (untilStr: string | null) => {
    if (!untilStr) return 'Until turned off';
    try {
      const date = new Date(untilStr);
      return `Until ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return untilStr;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-(--color-theme-text)">
      {/* Tab Header */}
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <BellOff className="w-6 h-6 text-(--color-frog-green)" />
          Do Not Disturb (DND)
        </h2>
        <p className="text-sm text-(--color-theme-muted) mt-1">
          Temporarily silence all posture reminders for meetings, presentations, or quiet focus periods.
        </p>
      </div>

      {/* Primary DND Master Switch Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDnd
            ? 'bg-(--color-theme-surface) border-(--color-golden-xp)/60 shadow-(--shadow-glow-gold)'
            : 'bg-(--color-theme-surface) border-(--color-theme-border)'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDnd
                ? 'bg-(--color-golden-xp)/20 text-(--color-golden-xp)'
                : 'bg-(--color-frog-green)/20 text-(--color-frog-green)'
            }`}
          >
            {isDnd ? <Moon className="w-6 h-6 animate-pulse" /> : <Bell className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-display">
                {isDnd ? 'Do Not Disturb Active' : 'Reminders Active'}
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isDnd
                    ? 'bg-(--color-golden-xp)/20 text-(--color-golden-xp)'
                    : 'bg-(--color-frog-green)/20 text-(--color-frog-green)'
                }`}
              >
                {isDnd ? formatDndUntil(dndUntil) : 'Normal Cadence'}
              </span>
            </div>
            <p className="text-xs text-(--color-theme-muted) mt-1">
              {isDnd
                ? 'Ribbit is currently sleeping. No banners or audio chimes will fire.'
                : 'Your timer engine is active. Micro-breaks will fire according to schedule.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleDnd}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-sm shrink-0 self-start sm:self-auto ${
            isDnd
              ? 'bg-(--color-golden-xp) text-(--color-pond-dark) hover:bg-(--color-golden-xp)/90'
              : 'bg-(--color-frog-green) text-white hover:bg-(--color-frog-green)/90'
          }`}
        >
          {isDnd ? 'Turn Off DND' : 'Activate DND Now'}
        </button>
      </div>

      {/* Quick DND Presets */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold">Quick Silence Durations</h3>
          <p className="text-xs text-(--color-theme-muted)">
            Quickly mute reminders for a set period. Posture checks will resume automatically.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DND_PRESETS.map((preset) => {
            const isCurrentPreset =
              isDnd &&
              (preset.minutes === null
                ? dndUntil === null
                : dndUntil !== null && customMinutes === preset.minutes);

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset.minutes)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isCurrentPreset
                    ? 'border-(--color-golden-xp) bg-(--color-golden-xp)/10 text-(--color-golden-xp)'
                    : 'border-(--color-theme-border) bg-(--color-theme-card) hover:border-(--color-frog-green)/40 text-(--color-theme-text)'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{preset.label}</span>
                  {isCurrentPreset && <Check className="w-3.5 h-3.5 text-(--color-golden-xp)" />}
                </div>
                <span className="text-[11px] text-(--color-theme-muted) block mt-1">
                  {preset.minutes ? `${preset.minutes} min pause` : 'Indefinite'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduled Recurring DND (e.g. Lunch) */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-(--color-frog-green)" />
              <h3 className="text-base font-semibold">Scheduled Daily Quiet Hours</h3>
            </div>
            <p className="text-xs text-(--color-theme-muted) mt-1">
              Automatically mute reminders during recurring blocks (such as daily lunch or team standup)
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={scheduledDndEnabled}
            onClick={() => setScheduledDnd(!scheduledDndEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50 ${
              scheduledDndEnabled ? 'bg-(--color-frog-green)' : 'bg-(--color-theme-border)'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                scheduledDndEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {scheduledDndEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) space-y-1">
              <label className="text-xs font-medium text-(--color-theme-muted)">Mute From</label>
              <input
                type="time"
                value={scheduledDndStart}
                onChange={(e) => setScheduledDnd(true, e.target.value, scheduledDndEnd)}
                className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-surface) border border-(--color-theme-border) text-sm font-mono"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) space-y-1">
              <label className="text-xs font-medium text-(--color-theme-muted)">Resume At</label>
              <input
                type="time"
                value={scheduledDndEnd}
                onChange={(e) => setScheduledDnd(true, scheduledDndStart, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-surface) border border-(--color-theme-border) text-sm font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Auto DND during Fullscreen apps (v1.1 Placeholder) */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-(--color-theme-muted)" />
              <h3 className="text-base font-semibold">Auto-DND During Fullscreen Apps</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-(--color-theme-border) text-(--color-theme-muted)">
                V1.1 Planned
              </span>
            </div>
            <p className="text-xs text-(--color-theme-muted) max-w-xl leading-relaxed">
              Automatically silence toast popups when playing fullscreen games, watching movies, or
              running presentation software (PowerPoint, Keynote).
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoDndFullscreen}
            onClick={() => setAutoDndFullscreen(!autoDndFullscreen)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50 ${
              autoDndFullscreen ? 'bg-(--color-frog-green)' : 'bg-(--color-theme-border)'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoDndFullscreen ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="text-[11px] text-(--color-theme-muted) flex items-center gap-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>This feature will automatically detect DirectX/fullscreen hooks in the V1.1 update.</span>
        </div>
      </div>
    </div>
  );
}
