import React from 'react';
import { CheckCircle2, Flame } from 'lucide-react';
import { XpCounter } from '@/components/gamification/XpCounter';

export interface QuickStatsProps {
  /** Number of posture checks completed today */
  todayChecks: number;
  /** Current streak in consecutive days */
  currentStreak: number;
  /** Total XP earned by user */
  totalXp: number;
  /** User level */
  level?: number;
  className?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  todayChecks,
  currentStreak,
  totalXp,
  level = 1,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-3 gap-3 w-full max-w-lg select-none ${className}`}
      role="region"
      aria-label="User Quick Statistics"
    >
      {/* 1. Today's Checks */}
      <div className="bg-theme-surface/70 hover:bg-theme-surface border border-theme-border rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-200 hover:border-frog-green/40 group">
        <div className="w-8 h-8 rounded-xl bg-frog-green/15 text-frog-green flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <span className="font-mono text-xl sm:text-2xl font-bold text-theme-text tabular-nums">
          {todayChecks}
        </span>
        <span className="text-[11px] font-sans font-medium text-theme-muted uppercase tracking-wider mt-0.5">
          Today's Checks
        </span>
      </div>

      {/* 2. Current Streak with Animated Flickering Flame */}
      <div className="bg-theme-surface/70 hover:bg-theme-surface border border-theme-border rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-200 hover:border-coral-alert/40 group">
        <div className="w-8 h-8 rounded-xl bg-coral-alert/15 text-coral-alert flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
          <Flame className="w-4 h-4 text-coral-alert animate-flame" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl sm:text-2xl font-bold text-theme-text tabular-nums">
            {currentStreak}
          </span>
          <span className="text-xs font-sans text-coral-alert font-bold">d</span>
        </div>
        <span className="text-[11px] font-sans font-medium text-theme-muted uppercase tracking-wider mt-0.5">
          Current Streak
        </span>
      </div>

      {/* 3. Total XP and Level with Animated XpCounter */}
      <div className="bg-theme-surface/70 hover:bg-theme-surface border border-theme-border rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-200 hover:border-golden-xp/40 group">
        <XpCounter value={totalXp} showIcon={true} label="" size="md" />
        <span className="text-[11px] font-sans font-medium text-theme-muted uppercase tracking-wider mt-0.5 flex items-center gap-1">
          <span>XP</span>
          <span className="text-golden-xp font-semibold">{`• Lvl ${level}`}</span>
        </span>
      </div>
    </div>
  );
};

export default QuickStats;
