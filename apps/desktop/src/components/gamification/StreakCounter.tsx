import React from 'react';
import { Flame, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  getStreakFlameVisual,
  isStreakFreezeUnlocked,
} from '@posture-check/shared';

export interface StreakCounterProps {
  /** Current streak in consecutive days */
  streak: number;
  /** Longest all-time streak record */
  longestStreak?: number;
  /** Whether a streak freeze is currently held and ready for use */
  freezeAvailable?: boolean;
  /** Whether the weekly streak freeze was consumed this week */
  freezeUsedThisWeek?: boolean;
  /** User's current level (to check if streak freeze is unlocked) */
  level?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to display subtitle ("🔥 X-day streak!") */
  showSubtitle?: boolean;
  /** Whether to display the streak freeze shield indicator */
  showFreezeIndicator?: boolean;
  className?: string;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  streak,
  longestStreak,
  freezeAvailable = false,
  freezeUsedThisWeek = false,
  level = 1,
  size = 'md',
  showSubtitle = true,
  showFreezeIndicator = true,
  className = '',
}) => {
  const visual = getStreakFlameVisual(streak);
  const freezeUnlocked = isStreakFreezeUnlocked(level);

  // Dynamic sizing tokens
  const containerPadding = {
    sm: 'p-2.5',
    md: 'p-3.5',
    lg: 'p-5',
  }[size];

  const flameIconSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  const numberFontSize = {
    sm: 'text-lg',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-5xl',
  }[size];

  const subtitleFontSize = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  // Border & background accent according to flame tier
  const cardBorderClass = {
    dimmed: 'border-theme-border/60 bg-theme-surface/50 hover:border-theme-border',
    orange: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 shadow-xs shadow-amber-500/10',
    'bright-orange-red':
      'border-coral-alert/40 bg-coral-alert/10 hover:border-coral-alert/60 shadow-sm shadow-coral-alert/15',
    golden:
      'border-golden-xp/50 bg-golden-xp/10 hover:border-golden-xp/70 shadow-md shadow-golden-xp/20 animate-pulse-gold',
  }[visual.tier];

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 select-none ${cardBorderClass} ${containerPadding} ${className}`}
      role="status"
      aria-label={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}${freezeAvailable ? ', freeze protected' : freezeUsedThisWeek ? ', freeze used this week' : ''}`}
    >
      {/* Top Freeze Indicator Pill */}
      {showFreezeIndicator && (
        <div className="absolute top-2 right-2 flex items-center">
          {freezeUsedThisWeek ? (
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-theme-surface border border-theme-border/80 text-[10px] font-medium text-theme-muted"
              title="Streak freeze was used this week. Resets Monday!"
            >
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span>Used</span>
            </div>
          ) : freezeAvailable ? (
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-[10px] font-semibold text-sky-400 animate-pulse"
              title="Streak freeze active: protects 1 missed day per week!"
            >
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              <span>Protected</span>
            </div>
          ) : freezeUnlocked ? (
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-theme-surface border border-theme-border/60 text-[10px] text-theme-muted"
              title="Streak freeze ready to earn or reset on Monday"
            >
              <Shield className="w-3 h-3 opacity-60" />
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-theme-surface/50 border border-theme-border/40 text-[9px] text-theme-muted/70"
              title="Streak freeze unlocks at Level 5"
            >
              <Shield className="w-2.5 h-2.5 opacity-40" />
              <span>Lvl 5</span>
            </div>
          )}
        </div>
      )}

      {/* Flame Icon with Continuous Subtle Flicker Animation */}
      <div className="relative my-1 flex items-center justify-center">
        {streak > 0 && (
          <div
            className={`absolute inset-0 rounded-full blur-md transition-all duration-300 ${
              visual.tier === 'golden'
                ? 'bg-golden-xp/30'
                : visual.tier === 'bright-orange-red'
                ? 'bg-coral-alert/25'
                : 'bg-amber-500/20'
            }`}
          />
        )}
        <div className={`relative ${visual.glowClass} transition-transform duration-200`}>
          <Flame
            className={`${flameIconSize} ${
              streak > 0 ? 'animate-flame' : 'opacity-30'
            }`}
            style={{ color: visual.colorHex }}
          />
        </div>
      </div>

      {/* Main Streak Counter Number */}
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className={`font-mono font-bold tabular-nums tracking-tight text-theme-text ${numberFontSize}`}
        >
          {streak}
        </span>
        <span
          className={`font-sans font-semibold text-xs transition-colors ${
            streak > 0 ? 'text-coral-alert' : 'text-theme-muted'
          }`}
        >
          {streak === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Subtitle / Status Text */}
      {showSubtitle && (
        <span
          className={`font-medium tracking-tight text-center mt-1 transition-colors ${subtitleFontSize} ${
            streak === 0
              ? 'text-theme-muted'
              : visual.tier === 'golden'
              ? 'text-golden-xp font-semibold'
              : 'text-theme-text'
          }`}
        >
          {visual.label}
        </span>
      )}

      {/* Optional Longest Streak Footer */}
      {longestStreak !== undefined && longestStreak > 0 && (
        <span className="text-[10px] font-mono text-theme-muted mt-1 tabular-nums">
          {`Best: ${longestStreak}d`}
        </span>
      )}
    </div>
  );
};

export default StreakCounter;
