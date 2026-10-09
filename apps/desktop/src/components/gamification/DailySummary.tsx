import React from 'react';
import { CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import { calculatePostureScore } from '@posture-check/shared';

export interface DailySummaryProps {
  /** Number of posture checks fired today */
  totalChecksToday: number;
  /** Number of posture checks acknowledged today */
  acknowledgedToday: number;
  /** Acknowledgment threshold percentage required to count toward streak (default: 80) */
  thresholdPercent?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional container class */
  className?: string;
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  totalChecksToday,
  acknowledgedToday,
  thresholdPercent = 80,
  size = 'md',
  className = '',
}) => {
  const rate =
    totalChecksToday > 0
      ? calculatePostureScore(acknowledgedToday, totalChecksToday)
      : 0;

  const hasFiredChecks = totalChecksToday > 0;
  const isGoalMet = hasFiredChecks && rate >= thresholdPercent;
  const isWarning = hasFiredChecks && rate >= 50 && rate < thresholdPercent;

  // Resolve color scheme based on rate
  const colorScheme = !hasFiredChecks
    ? {
        hex: '#8A9BB5',
        textClass: 'text-theme-muted',
        borderClass: 'border-theme-border/60',
        bgClass: 'bg-theme-surface/60',
        badgeClass: 'bg-theme-surface text-theme-muted border-theme-border',
      }
    : isGoalMet
    ? {
        hex: '#4CAF50',
        textClass: 'text-frog-green',
        borderClass: 'border-frog-green/40',
        bgClass: 'bg-frog-green/5',
        badgeClass: 'bg-frog-green/15 text-frog-green border-frog-green/30',
      }
    : isWarning
    ? {
        hex: '#FFD54F',
        textClass: 'text-golden-xp',
        borderClass: 'border-golden-xp/40',
        bgClass: 'bg-golden-xp/5',
        badgeClass: 'bg-golden-xp/15 text-golden-xp border-golden-xp/30',
      }
    : {
        hex: '#FF7043',
        textClass: 'text-coral-alert',
        borderClass: 'border-coral-alert/40',
        bgClass: 'bg-coral-alert/5',
        badgeClass: 'bg-coral-alert/15 text-coral-alert border-coral-alert/30',
      };

  // SVG Progress Ring Geometry
  const ringSize = { sm: 64, md: 84, lg: 104 }[size];
  const strokeWidth = { sm: 6, md: 8, lg: 9 }[size];
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-center gap-4 transition-all duration-200 select-none ${colorScheme.bgClass} ${colorScheme.borderClass} ${className}`}
      role="region"
      aria-label="Daily Posture Summary"
    >
      {/* Circular Progress Ring */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={ringSize}
          height={ringSize}
          className="transform -rotate-90 transition-transform duration-500"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-theme-border/50"
          />
          {/* Animated Value Stroke */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="transparent"
            stroke={colorScheme.hex}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-sm sm:text-base font-bold tabular-nums text-theme-text">
            {hasFiredChecks ? `${rate}%` : '—'}
          </span>
          <span className="text-[10px] font-sans text-theme-muted uppercase tracking-wider">
            score
          </span>
        </div>
      </div>

      {/* Details & Streak Qualification Status */}
      <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
        {/* Main Posture Score Headline */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-base sm:text-lg text-theme-text">
            {hasFiredChecks
              ? `${acknowledgedToday}/${totalChecksToday} checks (${rate}%) ${
                  isGoalMet ? '✅' : isWarning ? '⚠️' : '🚨'
                }`
              : '0/0 checks (Ready) 🐸'}
          </span>
        </div>

        {/* Status explanation */}
        <p className="text-xs text-theme-muted mb-2 max-w-sm">
          {!hasFiredChecks
            ? 'No reminders have fired yet today. Acknowledge ≥80% to keep your streak burning!'
            : isGoalMet
            ? 'Awesome job! Today qualifies and maintains your active streak! 🌟'
            : isWarning
            ? `You need ≥${thresholdPercent}% acknowledgment for today to count toward your streak.`
            : 'Acknowledgment rate is below 50%. Take regular posture breaks!'}
        </p>

        {/* Counts Toward Streak Badge */}
        <div className="flex items-center gap-2">
          {isGoalMet ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorScheme.badgeClass}`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Counts toward streak! 🔥</span>
            </span>
          ) : hasFiredChecks ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorScheme.badgeClass}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{`Not counting yet (need ≥${thresholdPercent}%)`}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-theme-surface border border-theme-border text-theme-muted">
              <CheckCircle2 className="w-3.5 h-3.5 opacity-60" />
              <span>Goal: ≥80% checks acknowledged</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
