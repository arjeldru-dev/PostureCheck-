import React from 'react';
import { calculateLevelFromXp, type LevelInfo } from '@posture-check/shared';

export interface XpProgressBarProps {
  /** Total user XP */
  totalXp: number;
  /** Optional pre-computed level info */
  levelInfo?: LevelInfo;
  /** Whether to show the text label like "450 / 1,000 XP" */
  showText?: boolean;
  /** Whether to show the percentage badge */
  showPercent?: boolean;
  /** Height variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  totalXp,
  levelInfo: customLevelInfo,
  showText = true,
  showPercent = true,
  size = 'md',
  className = '',
}) => {
  const levelInfo = customLevelInfo || calculateLevelFromXp(totalXp);
  const { level, xpForNextLevel, progressPercent } = levelInfo;

  const isMaxLevel = level >= 25;

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }[size];

  return (
    <div
      className={`w-full select-none ${className}`}
      role="region"
      aria-label="Level XP Progress"
    >
      {/* Label Row */}
      {showText && (
        <div className="flex items-center justify-between text-xs font-mono mb-1.5 px-0.5">
          <div className="flex items-center gap-1 text-theme-muted font-medium">
            <span>Progress:</span>
            <span className="text-theme-text font-bold tabular-nums">
              {isMaxLevel ? (
                <span>{`${totalXp.toLocaleString()} XP (Max Level)`}</span>
              ) : (
                <span>{`${totalXp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`}</span>
              )}
            </span>
          </div>

          {showPercent && (
            <span className="text-[11px] font-bold text-frog-green tabular-nums">
              {`${progressPercent}%`}
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        className={`w-full rounded-full bg-theme-surface border border-theme-border/60 overflow-hidden p-0.5 shadow-inner ${heightClasses}`}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Level ${level} progress: ${progressPercent}%`}
      >
        {/* Animated Gradient Fill */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-frog-green via-frog-green-secondary to-lily-pad transition-[width] duration-500 ease-out shadow-xs"
          style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </div>
  );
};

export default XpProgressBar;
