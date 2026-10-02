import { useState, useEffect } from 'react';
import { useSettingsStore, type NotificationSound } from '@/stores/settingsStore';
import {
  Bell,
  Volume2,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Check,
  Loader2,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react';
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
    level5OptIn,
    setIntensityLevel,
    setAutoEscalation,
    optInLevel5,
    setNotificationSound,
    testNotification,
  } = useSettingsStore();

  const [testingLevel, setTestingLevel] = useState<number | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [showOptInModal, setShowOptInModal] = useState<boolean>(false);
  const [isConfirmingOptIn, setIsConfirmingOptIn] = useState<boolean>(false);

  useEffect(() => {
    if (!showOptInModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOptInModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOptInModal]);

  const handleSelectLevel = (level: number) => {
    if (level === 5 && !level5OptIn) {
      setShowOptInModal(true);
      return;
    }
    setIntensityLevel(level);
  };

  const handleConfirmOptIn = async () => {
    setIsConfirmingOptIn(true);
    try {
      await optInLevel5(true);
      await setIntensityLevel(5);
      setShowOptInModal(false);
      setTestSuccess('Level 5 fullscreen screen-blocking enabled.');
      setTimeout(() => setTestSuccess(null), 3500);
    } finally {
      setIsConfirmingOptIn(false);
    }
  };

  const handleRevokeOptIn = async () => {
    await optInLevel5(false);
    if (intensityLevel === 5) {
      await setIntensityLevel(4);
    }
    setTestSuccess('Level 5 opt-in revoked. Level set to 4.');
    setTimeout(() => setTestSuccess(null), 3500);
  };

  const handleTest = async (level: number) => {
    if (level === 5 && !level5OptIn) {
      setShowOptInModal(true);
      return;
    }
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
                onClick={() => handleSelectLevel(level)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectLevel(level)}
                className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? level === 5
                      ? 'bg-(--color-coral-alert)/10 border-(--color-coral-alert) shadow-[0_0_20px_rgba(255,107,107,0.3)]'
                      : 'bg-(--color-frog-green)/10 border-(--color-frog-green) shadow-(--shadow-glow-green)'
                    : 'bg-(--color-theme-surface) border-(--color-theme-border) hover:border-(--color-frog-green)/40 hover:bg-(--color-theme-surface)/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex items-center gap-1.5">
                      {level === 5 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            level5OptIn
                              ? 'bg-(--color-frog-green)/20 text-(--color-frog-green)'
                              : 'bg-amber-500/20 text-amber-500'
                          }`}
                        >
                          {level5OptIn ? 'Opted In' : 'Opt-in Req'}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? level === 5
                              ? 'bg-(--color-coral-alert) text-white'
                              : 'bg-(--color-frog-green) text-white'
                            : 'bg-(--color-theme-border) text-(--color-theme-muted)'
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
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
                  <div className="flex items-center gap-2">
                    {level === 5 && level5OptIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevokeOptIn();
                        }}
                        className="text-xs text-amber-500 hover:underline font-medium"
                      >
                        Revoke
                      </button>
                    )}
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

      {/* Level 5 Confirmation Modal */}
      {showOptInModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowOptInModal(false)}
        >
          <div
            className="w-full max-w-md bg-(--color-theme-card) border border-(--color-coral-alert)/40 rounded-3xl p-6 shadow-2xl space-y-5 text-(--color-theme-text) relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowOptInModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-(--color-theme-muted) transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-(--color-coral-alert)/15 border border-(--color-coral-alert)/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-(--color-coral-alert)" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-coral-alert)">
                  Extreme Intensity Warning
                </span>
                <h3 className="text-lg font-bold font-display leading-tight">
                  Enable Level 5 Fullscreen Mode?
                </h3>
              </div>
            </div>

            <p className="text-sm text-(--color-theme-muted) leading-relaxed">
              Level 5 will block your entire screen until you acknowledge the reminder. This is the nuclear option. Are you sure?
            </p>

            <div className="p-3.5 rounded-xl bg-(--color-coral-alert)/10 border border-(--color-coral-alert)/20 text-xs text-(--color-theme-text) leading-relaxed space-y-1">
              <div className="font-semibold text-(--color-coral-alert) flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Interruption Warning
              </div>
              <p className="text-(--color-theme-muted)">
                Note: This may minimize fullscreen games or interrupt presentations. It cannot be dismissed with Alt+F4 and re-focuses automatically if switched away.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOptInModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-(--color-theme-muted) hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOptIn}
                disabled={isConfirmingOptIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-(--color-coral-alert) text-white hover:bg-(--color-coral-alert)/90 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {isConfirmingOptIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Yes, block my screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
