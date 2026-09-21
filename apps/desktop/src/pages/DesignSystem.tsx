import { useState } from 'react';
import {
  COLORS,
  FONT_SIZES,
  RADII,
  SPACING,
  useThemeStore,
  type ThemeMode,
  type RibbitState,
  RIBBIT_STATE_DESCRIPTIONS,
} from '@posture-check/shared';
import RibbitMascot from '../components/ribbit/RibbitMascot';
import {
  Check,
  Copy,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  Type,
  Maximize2,
  Layers,
  Activity,
  ArrowLeft,
  Smile,
} from 'lucide-react';

interface DesignSystemProps {
  onBack?: () => void;
}

interface ColorCardProps {
  name: string;
  tokenName: string;
  hex: string;
  description: string;
  textColor?: string;
  contrastTag: string;
  isDark?: boolean;
}

function ColorCard({
  name,
  tokenName,
  hex,
  description,
  textColor = 'text-white',
  contrastTag,
  isDark,
}: ColorCardProps) {
  const [copied, setCopied] = useState(false);

  const fallbackCopy = () => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = hex;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(hex)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-theme-border bg-theme-surface shadow-sm transition-all hover:shadow-md hover:border-frog-green/50 group">
      <div
        className="h-24 w-full relative p-3 flex flex-col justify-between transition-transform duration-200 group-hover:scale-[1.01]"
        style={{ backgroundColor: hex }}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full backdrop-blur-md ${
              isDark ? 'bg-white/20 text-white' : 'bg-black/20 text-black'
            }`}
          >
            {contrastTag}
          </span>
          <button
            onClick={handleCopy}
            title="Copy hex code"
            className="p-1 rounded-md bg-black/25 text-white hover:bg-black/40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-frog-green" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className={`text-xs font-mono font-bold tracking-wide ${textColor}`}>
          {hex}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between">
          <h4 className="font-display font-semibold text-sm text-theme-text">{name}</h4>
          <span className="font-mono text-[11px] text-theme-muted">{tokenName}</span>
        </div>
        <p className="text-xs text-theme-muted mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function DesignSystem({ onBack }: DesignSystemProps) {
  const { mode, resolvedMode, setMode } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'surfaces' | 'animations' | 'mascot'>('colors');
  const [previewSize, setPreviewSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [previewBreathing, setPreviewBreathing] = useState(true);

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text font-sans p-6 overflow-y-auto max-h-screen">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Header with Navigation and Theme Controls */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-theme-border">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text hover:border-frog-green transition-colors"
                title="Back to App Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-frog-green/20 border border-frog-green/40 flex items-center justify-center text-2xl shadow-glow-green">
              🐸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-2xl text-theme-text tracking-tight">
                  Design System & Tokens
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-frog-green/15 text-frog-green font-mono font-semibold">
                  Posture Check! v0.1
                </span>
              </div>
              <p className="text-xs text-theme-muted mt-0.5">
                Unified design system for Tauri 2.0 (Tailwind CSS 4) & Expo Mobile (NativeWind 4)
              </p>
            </div>
          </div>

          {/* Theme Mode Segmented Controller */}
          <div className="flex items-center gap-2 bg-theme-surface p-1 rounded-xl border border-theme-border">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Laptop },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id as ThemeMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === id
                    ? 'bg-frog-green text-white shadow-sm font-semibold'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-bg/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-2 border-b border-theme-border pb-2 overflow-x-auto">
          {(
            [
              { id: 'colors', label: 'Color Tokens', icon: Sparkles },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'spacing', label: 'Spacing Scale', icon: Maximize2 },
              { id: 'surfaces', label: 'Surfaces & Shadows', icon: Layers },
              { id: 'animations', label: 'Micro-Animations', icon: Activity },
              { id: 'mascot', label: 'Ribbit Mascot', icon: Smile },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-theme-surface border border-theme-border text-frog-green font-semibold shadow-xs'
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Active Theme Status Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-theme-surface border border-theme-border text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-frog-green animate-pulse" />
            <span className="text-theme-text font-medium">
              Theme Mode: <strong className="capitalize text-frog-green">{mode}</strong> (Resolved as{' '}
              <strong className="capitalize text-frog-green">{resolvedMode}</strong>)
            </span>
          </div>
          <span className="font-mono text-theme-muted text-[11px]">
            WCAG 2.1 AA Compliant (≥4.5:1 text, ≥3.0:1 UI)
          </span>
        </div>

        {/* 1. COLOR TOKENS TAB */}
        {activeTab === 'colors' && (
          <section className="space-y-8 animate-fade-in">
            {/* Primary & Brand */}
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Primary Brand & Gamification
              </h2>
              <p className="text-xs text-theme-muted mb-4">
                Core identity colors representing Ribbit the frog, streaks, XP, and urgent posture alerts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ColorCard
                  name="Frog Green (Primary)"
                  tokenName="--color-frog-green"
                  hex={COLORS.frogGreen}
                  description="Primary action buttons, brand identity, mascot accents, and active status indicators."
                  contrastTag="WCAG AAA (White)"
                  isDark
                />
                <ColorCard
                  name="Frog Green Secondary"
                  tokenName="--color-frog-green-secondary"
                  hex={COLORS.frogGreenSecondary}
                  description="Gradients, secondary highlights, active toggles, and hover states."
                  contrastTag="WCAG AA"
                  isDark
                />
                <ColorCard
                  name="Lily Pad"
                  tokenName="--color-lily-pad"
                  hex={COLORS.lilyPad}
                  description="Subtle background accents, secondary surfaces, tags, and progress bars."
                  contrastTag="WCAG AA"
                />
                <ColorCard
                  name="Golden XP"
                  tokenName="--color-golden-xp"
                  hex={COLORS.goldenXp}
                  description="XP badges, daily completion bonus, streak flame highlights, and trophies."
                  contrastTag="WCAG AAA (Pond)"
                />
                <ColorCard
                  name="Coral Alert"
                  tokenName="--color-coral-alert"
                  hex={COLORS.coralAlert}
                  description="Level 4-5 urgent notifications, broken streak recovery, and warnings."
                  contrastTag="WCAG AA"
                  isDark
                />
                <ColorCard
                  name="Sky Blue"
                  tokenName="--color-sky-blue"
                  hex={COLORS.skyBlue}
                  description="Info banners, PC-to-Phone routing indicators, and external hyperlinks."
                  contrastTag="WCAG AA"
                  isDark
                />
              </div>
            </div>

            {/* Backgrounds & Surfaces */}
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Pond Backgrounds & Surfaces
              </h2>
              <p className="text-xs text-theme-muted mb-4">
                High contrast dark and light theme foundations designed for comfortable day and night usage.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ColorCard
                  name="Pond Dark (Base)"
                  tokenName="--color-pond-dark"
                  hex={COLORS.pondDark}
                  description="Main dark mode app background. Deep, calming aquatic obsidian."
                  textColor="text-white"
                  contrastTag="Base Dark"
                  isDark
                />
                <ColorCard
                  name="Surface Dark (Card)"
                  tokenName="--color-surface-dark"
                  hex={COLORS.surfaceDark}
                  description="Cards, panels, modal dialogs, and elevated headers in dark mode."
                  textColor="text-white"
                  contrastTag="Elevated Dark"
                  isDark
                />
                <ColorCard
                  name="Pond Light (Base)"
                  tokenName="--color-pond-light"
                  hex={COLORS.pondLight}
                  description="Main light mode app background. Crisp, gentle soft neutral paper."
                  textColor="text-slate-900"
                  contrastTag="Base Light"
                />
                <ColorCard
                  name="Surface Light (Card)"
                  tokenName="--color-surface-light"
                  hex={COLORS.surfaceLight}
                  description="Cards, panels, and floating dropdowns in light mode."
                  textColor="text-slate-900"
                  contrastTag="Elevated Light"
                />
              </div>
            </div>

            {/* Text & Typography Colors */}
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Text & Content Colors
              </h2>
              <p className="text-xs text-theme-muted mb-4">
                Strict contrast standards guaranteeing effortless legibility on both pond surfaces.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ColorCard
                  name="Text Primary (Dark)"
                  tokenName="--color-text-primary-dark"
                  hex={COLORS.textPrimaryDark}
                  description="Primary headings and readable text against Pond Dark."
                  textColor="text-slate-900"
                  contrastTag="Ratio 13.8:1"
                />
                <ColorCard
                  name="Text Muted (Dark)"
                  tokenName="--color-text-muted-dark"
                  hex={COLORS.textMutedDark}
                  description="Subtitles, captions, and secondary metadata in dark mode."
                  textColor="text-slate-900"
                  contrastTag="Ratio 6.4:1"
                />
                <ColorCard
                  name="Text Primary (Light)"
                  tokenName="--color-text-primary-light"
                  hex={COLORS.textPrimaryLight}
                  description="Primary text and labels against Pond Light."
                  textColor="text-white"
                  contrastTag="Ratio 14.1:1"
                  isDark
                />
                <ColorCard
                  name="Text Muted (Light)"
                  tokenName="--color-text-muted-light"
                  hex={COLORS.textMutedLight}
                  description="Subtitles and metadata against light backgrounds."
                  textColor="text-white"
                  contrastTag="Ratio 5.2:1"
                  isDark
                />
              </div>
            </div>
          </section>
        )}

        {/* 2. TYPOGRAPHY TAB */}
        {activeTab === 'typography' && (
          <section className="space-y-8 animate-fade-in">
            <div className="p-4 rounded-xl bg-theme-surface border border-theme-border space-y-6">
              <div>
                <span className="text-xs font-mono font-semibold text-frog-green uppercase tracking-wider">
                  Display Font — Outfit
                </span>
                <h3 className="font-display font-bold text-3xl text-theme-text mt-1">
                  Outfit: Friendly, modern, and engaging
                </h3>
                <p className="text-xs text-theme-muted mt-1">
                  Applied via <code className="text-frog-green font-mono">font-display</code> for headers, mascot dialogue, and achievement titles.
                </p>
              </div>

              <div className="space-y-4 border-t border-theme-border pt-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
                    <span className="font-mono">font-display text-5xl font-extrabold</span>
                    <span className="font-mono">{FONT_SIZES['5xl']} (48px)</span>
                  </div>
                  <h1 className="font-display font-extrabold text-5xl text-theme-text tracking-tight">
                    Level 10: Poison Dart 🐸
                  </h1>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
                    <span className="font-mono">font-display text-4xl font-bold</span>
                    <span className="font-mono">{FONT_SIZES['4xl']} (36px)</span>
                  </div>
                  <h2 className="font-display font-bold text-4xl text-theme-text tracking-tight">
                    Sit Tall, Stay Sharp
                  </h2>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
                    <span className="font-mono">font-display text-3xl font-bold</span>
                    <span className="font-mono">{FONT_SIZES['3xl']} (30px)</span>
                  </div>
                  <h3 className="font-display font-bold text-3xl text-theme-text tracking-tight">
                    Ready for a Quick Stretch?
                  </h3>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
                    <span className="font-mono">font-display text-2xl font-semibold</span>
                    <span className="font-mono">{FONT_SIZES['2xl']} (24px)</span>
                  </div>
                  <h4 className="font-display font-semibold text-2xl text-theme-text">
                    Daily Habit Streak: 14 Days
                  </h4>
                </div>
              </div>
            </div>

            {/* Inter Body */}
            <div className="p-4 rounded-xl bg-theme-surface border border-theme-border space-y-4">
              <div>
                <span className="text-xs font-mono font-semibold text-sky-blue uppercase tracking-wider">
                  Body Font — Inter
                </span>
                <h3 className="font-sans font-semibold text-xl text-theme-text mt-1">
                  Inter: High-clarity UI and dense information reading
                </h3>
                <p className="text-xs text-theme-muted mt-1">
                  Applied via <code className="text-sky-blue font-mono">font-sans</code> for settings, tooltips, dialogue, and navigation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-theme-border pt-4">
                <div className="p-3.5 rounded-lg bg-theme-bg/60 border border-theme-border">
                  <span className="font-mono text-[11px] text-theme-muted block mb-1">text-base font-normal</span>
                  <p className="text-base font-sans text-theme-text leading-relaxed">
                    Ribbit says: "Your spine will thank you later! Roll your shoulders back, plant both feet flat on the floor, and take a deep breath."
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-theme-bg/60 border border-theme-border">
                  <span className="font-mono text-[11px] text-theme-muted block mb-1">text-sm font-medium</span>
                  <p className="text-sm font-sans text-theme-muted leading-relaxed">
                    Auto-escalation will gradually increase notification intensity if three consecutive reminders are missed during scheduled work hours.
                  </p>
                </div>
              </div>
            </div>

            {/* JetBrains Mono */}
            <div className="p-4 rounded-xl bg-theme-surface border border-theme-border space-y-4">
              <div>
                <span className="text-xs font-mono font-semibold text-golden-xp uppercase tracking-wider">
                  Monospace — JetBrains Mono
                </span>
                <h3 className="font-mono font-semibold text-xl text-theme-text mt-1">
                  JetBrains Mono: Precision timers, stats, and XP
                </h3>
                <p className="text-xs text-theme-muted mt-1">
                  Applied via <code className="text-golden-xp font-mono">font-mono</code> for countdown timers, XP values, and technical IDs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-theme-border pt-4">
                <div className="p-3 rounded-lg bg-theme-bg/60 border border-theme-border">
                  <span className="text-[11px] text-theme-muted block">Next Reminder</span>
                  <span className="font-mono font-bold text-xl text-frog-green">00:24:18</span>
                </div>
                <div className="p-3 rounded-lg bg-theme-bg/60 border border-theme-border">
                  <span className="text-[11px] text-theme-muted block">Total Experience</span>
                  <span className="font-mono font-bold text-xl text-golden-xp">+1,450 XP</span>
                </div>
                <div className="p-3 rounded-lg bg-theme-bg/60 border border-theme-border">
                  <span className="text-[11px] text-theme-muted block">Session Compliance</span>
                  <span className="font-mono font-bold text-xl text-sky-blue">94.2%</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. SPACING SCALE TAB */}
        {activeTab === 'spacing' && (
          <section className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-xl bg-theme-surface border border-theme-border">
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Rem-Based Spacing Scale (0.5 – 24)
              </h2>
              <p className="text-xs text-theme-muted mb-6">
                Consistent padding, margins, and gaps across desktop and mobile. Notice touch targets (11 = 44px minimum).
              </p>

              <div className="space-y-3">
                {(Object.entries(SPACING) as [string, string][]).map(([key, value]) => {
                  const px = Math.round(parseFloat(value) * 16);
                  return (
                    <div key={key} className="flex items-center gap-4 text-xs font-mono">
                      <div className="w-16 text-theme-muted shrink-0">
                        p-{key} / {value}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className="h-6 bg-frog-green/20 border border-frog-green/60 rounded-md transition-all duration-300"
                          style={{ width: value }}
                        />
                        <span className="text-[11px] text-theme-muted">{px}px</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 4. SURFACES & SHADOWS TAB */}
        {activeTab === 'surfaces' && (
          <section className="space-y-8 animate-fade-in">
            {/* Border Radii */}
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Border Radius Scale
              </h2>
              <p className="text-xs text-theme-muted mb-4">
                Tactile, rounded shapes mirroring Duolingo's friendliness.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {(Object.entries(RADII) as [string, string][]).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-4 bg-theme-surface border border-theme-border flex flex-col items-center justify-center text-center transition-all hover:border-frog-green"
                    style={{ borderRadius: val }}
                  >
                    <span className="font-mono text-xs font-bold text-theme-text">rounded-{key}</span>
                    <span className="font-mono text-[10px] text-theme-muted mt-1">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                Depth & Atmospheric Glows
              </h2>
              <p className="text-xs text-theme-muted mb-4">
                Tailored dark elevation and mascot glow effects.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-theme-surface border border-theme-border shadow-sm">
                  <h4 className="font-display font-semibold text-sm text-theme-text">shadow-sm</h4>
                  <p className="text-xs text-theme-muted mt-1">Subtle elevation for flat cards and inputs</p>
                </div>
                <div className="p-5 rounded-xl bg-theme-surface border border-theme-border shadow-md">
                  <h4 className="font-display font-semibold text-sm text-theme-text">shadow-md</h4>
                  <p className="text-xs text-theme-muted mt-1">Standard elevation for active cards & dialogs</p>
                </div>
                <div className="p-5 rounded-xl bg-theme-surface border border-theme-border shadow-lg">
                  <h4 className="font-display font-semibold text-sm text-theme-text">shadow-lg</h4>
                  <p className="text-xs text-theme-muted mt-1">Popups, notification banners, and drawers</p>
                </div>
                <div className="p-5 rounded-xl bg-theme-surface border border-theme-border shadow-xl">
                  <h4 className="font-display font-semibold text-sm text-theme-text">shadow-xl</h4>
                  <p className="text-xs text-theme-muted mt-1">Full modal windows & intensity level 5 overlays</p>
                </div>
                <div className="p-5 rounded-xl bg-theme-surface border border-frog-green/40 shadow-glow-green">
                  <h4 className="font-display font-semibold text-sm text-frog-green">shadow-glow-green</h4>
                  <p className="text-xs text-theme-muted mt-1">Frog mascot active state & successful checks</p>
                </div>
                <div className="p-5 rounded-xl bg-theme-surface border border-golden-xp/40 shadow-glow-gold">
                  <h4 className="font-display font-semibold text-sm text-golden-xp">shadow-glow-gold</h4>
                  <p className="text-xs text-theme-muted mt-1">Golden XP pulses, streaks, and achievement unlocks</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. ANIMATIONS TAB */}
        {activeTab === 'animations' && (
          <section className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-display font-bold text-theme-text mb-1">
              Micro-Interactions & Motion
            </h2>
            <p className="text-xs text-theme-muted mb-4">
              Subtle animations designed to feel alive, playful, and responsive without draining battery.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Ribbit Breathing */}
              <div className="p-5 rounded-xl bg-theme-surface border border-theme-border flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-frog-green/20 border border-frog-green/40 flex items-center justify-center text-3xl animate-breathe">
                  🐸
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-theme-text">animate-breathe</h4>
                  <p className="text-xs text-theme-muted mt-0.5">Idle Ribbit breathing state (3.5s loop)</p>
                </div>
              </div>

              {/* Gold Pulse */}
              <div className="p-5 rounded-xl bg-theme-surface border border-theme-border flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-golden-xp/20 border border-golden-xp/40 flex items-center justify-center text-3xl animate-pulse-gold">
                  🔥
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-theme-text">animate-pulse-gold</h4>
                  <p className="text-xs text-theme-muted mt-0.5">Active streak fire & bonus XP badge</p>
                </div>
              </div>

              {/* Bounce */}
              <div className="p-5 rounded-xl bg-theme-surface border border-theme-border flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-coral-alert/20 border border-coral-alert/40 flex items-center justify-center text-3xl animate-bounce">
                  ⚡
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-theme-text">animate-bounce</h4>
                  <p className="text-xs text-theme-muted mt-0.5">Level 4 alert & celebratory jumping</p>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* 6. MASCOT TAB */}
        {activeTab === 'mascot' && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-display font-bold text-theme-text mb-1">
                  Ribbit the Frog Mascot Suite
                </h2>
                <p className="text-xs text-theme-muted">
                  The visual personality of Posture Check! across 7 emotional states with GPU breathing motion.
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-theme-surface p-1 rounded-xl border border-theme-border text-xs">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPreviewSize(s)}
                      className={`px-2.5 py-1 rounded-lg font-mono uppercase font-semibold transition-all ${
                        previewSize === s
                          ? 'bg-frog-green text-white shadow-xs'
                          : 'text-theme-muted hover:text-theme-text'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPreviewBreathing(!previewBreathing)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    previewBreathing
                      ? 'bg-frog-green/15 border-frog-green/40 text-frog-green'
                      : 'bg-theme-surface border-theme-border text-theme-muted'
                  }`}
                >
                  {previewBreathing ? 'Breathing ON' : 'Breathing OFF'}
                </button>
              </div>
            </div>

            {/* 7 States Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(
                [
                  'idle',
                  'reminding',
                  'encouraging',
                  'celebrating',
                  'concerned',
                  'sleeping',
                  'disappointed',
                ] as RibbitState[]
              ).map((state) => (
                <div
                  key={state}
                  className="p-5 rounded-2xl bg-theme-surface border border-theme-border hover:border-frog-green/50 transition-all flex flex-col items-center text-center group"
                >
                  <div className="h-44 w-full flex items-center justify-center bg-theme-bg/60 rounded-xl mb-4 p-3 border border-theme-border/50">
                    <RibbitMascot
                      state={state}
                      size={previewSize}
                      showBreathing={previewBreathing}
                    />
                  </div>
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <span className="capitalize font-display font-bold text-sm text-theme-text">
                        {state}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-frog-green/15 text-frog-green font-mono font-medium">
                        .svg
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted line-clamp-2">
                      {RIBBIT_STATE_DESCRIPTIONS[state]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
