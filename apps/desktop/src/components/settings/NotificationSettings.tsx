import { useState } from 'react';
import { useSettingsStore, type NotificationSound } from '@/stores/settingsStore';
import { Bell, Volume2, ShieldAlert, Sparkles, Smartphone, Check, Loader2 } from 'lucide-react';
import { INTENSITY_CONFIGS, type IntensityLevel } from '@posture-check/shared';

const INTENSITY_ITEMS: Array<{
  level: IntensityLevel;
  badge: string;
  emoji: string;
  summary: string;
}> = [
  {
    level: 1,
    badge: 'Level 1',
    emoji: '🤫',
    summary: 'Subtle tray tooltip & gentle frog wink. Ideal for shared offices and streaming.',
  },
  {
    level: 2,
    badge: 'Level 2 · Default',
    emoji: '👋',
    summary: 'Small toast notification with soft chime. Noticeable but never intrusive.',
  },
  {
    level: 3,
    badge: 'Level 3',
    emoji: '🔔',
    summary: 'Standard banner notification. Stays on screen until you stretch and acknowledge.',
  },
  {
    level: 4,
    badge: 'Level 4',
    emoji: '⚡',
    summary: 'Prominent screen badge and repeated reminder sound every 30 seconds.',
  },
  {
    level: 5,
    badge: 'Level 5',
    emoji: '🚨',
    summary: 'Maximum alert: overlays screen until posture is reset. For stubborn slouchers.',
  },
];

export default function NotificationSettings() {
  const {
    intensityLevel,
    autoEscalation,
    notificationSound,
    setIntensityLevel,
    setAutoEscalation,
    setNotificationSound,
    testNotification,
  } = useSettingsStore();

  const [testingLevel, setTestingLevel] = useState<number | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const handleTest = async (level: number) => {
    setTestingLevel(level);
    setTestSuccess(null);
    try {
      await testNotification(level);
      setTestSuccess(`Test notification for Level ${level} sent!`);
      setTimeout(() => setTestSuccess(null), 3500);
    } catch (err) {
      setTestSuccess(`Failed to send test: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestingLevel(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-(--color-theme-text)">
      {/* Tab Header */}
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Bell className="w-6 h-6 text-(--color-frog-green)" />
          Notification Intensity
        </h2>
        <p className="text-sm text-(--color-theme-muted) mt-1">
          Configure how assertively Ribbit reminds you and whether unacknowledged reminders escalate.
        </p>
      </div>

      {/* Intensity Cards Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Reminder Intensity Level</h3>
            <p className="text-xs text-(--color-theme-muted)">
              Choose the baseline visual and audio style for each posture check
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTest(intensityLevel)}
            disabled={testingLevel !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-(--color-frog-green) text-white hover:bg-(--color-frog-green)/90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {testingLevel === intensityLevel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Test Current Level ({intensityLevel})
          </button>
        </div>

        {testSuccess && (
          <div className="p-3 rounded-xl bg-(--color-frog-green)/10 border border-(--color-frog-green)/30 text-xs text-(--color-frog-green) flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{testSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTENSITY_ITEMS.map(({ level, badge, emoji, summary }) => {
            const config = INTENSITY_CONFIGS[level];
            const isSelected = intensityLevel === level;
            return (
              <div
                key={level}
                onClick={() => setIntensityLevel(level)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setIntensityLevel(level)}
                className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-(--color-frog-green)/10 border-(--color-frog-green) shadow-(--shadow-glow-green)'
                    : 'bg-(--color-theme-surface) border-(--color-theme-border) hover:border-(--color-frog-green)/40 hover:bg-(--color-theme-surface)/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? 'bg-(--color-frog-green) text-white'
                          : 'bg-(--color-theme-border) text-(--color-theme-muted)'
                      }`}
                    >
                      {badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold font-display text-(--color-theme-text)">
                    {config.name}
                  </h4>
                  <p className="text-xs text-(--color-theme-muted) mt-1 leading-relaxed">
                    {summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-(--color-theme-border)/60 flex items-center justify-between text-[11px] text-(--color-theme-muted)">
                  <span>Audio: {config.audio}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTest(level);
                    }}
                    className="text-(--color-frog-green) hover:underline font-medium"
                  >
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto Escalation Toggle */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-(--color-golden-xp)" />
              <h3 className="text-base font-semibold">Auto-Escalation</h3>
            </div>
            <p className="text-xs text-(--color-theme-muted) max-w-xl leading-relaxed">
              If an alert is ignored or left unacknowledged, automatically increase the intensity
              level on the next check to break your concentration slump.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoEscalation}
            onClick={() => setAutoEscalation(!autoEscalation)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50 ${
              autoEscalation ? 'bg-(--color-frog-green)' : 'bg-(--color-theme-border)'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoEscalation ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Audio Sound Dropdown */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-(--color-frog-green)" />
            Chime Sound
          </h3>
          <p className="text-xs text-(--color-theme-muted)">
            Select the audio sound used for levels that support sound feedback (Level 2+)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { id: 'system', label: 'System Default', desc: 'Standard OS alert sound' },
              { id: 'chime', label: 'Custom Chime', desc: 'Pleasant gentle frog harmonic' },
              { id: 'silent', label: 'Silent Mode', desc: 'Visual reminders only, no sound' },
            ] as const
          ).map((item) => {
            const isSelected = notificationSound === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setNotificationSound(item.id as NotificationSound)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-(--color-frog-green) bg-(--color-frog-green)/10'
                    : 'border-(--color-theme-border) bg-(--color-theme-card) hover:border-(--color-frog-green)/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-(--color-frog-green)" />}
                </div>
                <p className="text-[11px] text-(--color-theme-muted) mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-device Informational Note */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-(--color-sky-blue)/10 border border-(--color-sky-blue)/20 text-xs">
        <Smartphone className="w-5 h-5 text-(--color-sky-blue) shrink-0" />
        <span className="text-(--color-theme-muted)">
          <strong className="text-(--color-theme-text)">Per-device note:</strong> These notification
          settings apply specifically to this PC. Mobile vibration and notification settings can be
          customized inside the PostureCheck mobile companion app.
        </span>
      </div>
    </div>
  );
}
