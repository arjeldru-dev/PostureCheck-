import React from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { calculateLevelFromXp, LEVEL_THRESHOLDS } from '@posture-check/shared';

export interface LevelBadgeProps {
  /** Level number (1 to 25) */
  level: number;
  /** Optional explicit title. Defaults to spec title for this level. */
  title?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a frog mascot or trophy icon */
  showIcon?: boolean;
  /** Whether to show subtitle or title text */
  showTitle?: boolean;
  className?: string;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  title,
  size = 'md',
  showIcon = true,
  showTitle = true,
  className = '',
}) => {
  // Resolve title from spec if not explicitly provided
  const resolvedTitle =
    title ||
    LEVEL_THRESHOLDS.find((t) => t.level === level)?.title ||
    calculateLevelFromXp(0).title;

  const isMasterTier = level >= 20;
  const isHighTier = level >= 10 && level < 20;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2.5',
  }[size];

  const pillTextSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  return (
    <div
      className={`inline-flex items-center rounded-xl border select-none transition-all duration-200 ${
        isMasterTier
          ? 'bg-golden-xp/10 border-golden-xp/40 text-golden-xp shadow-xs'
          : isHighTier
          ? 'bg-lily-pad/15 border-lily-pad/40 text-lily-pad shadow-xs'
          : 'bg-frog-green/10 border-frog-green/30 text-frog-green'
      } ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Level ${level}: ${resolvedTitle}`}
    >
      {/* Frog Theme Icon or Trophy */}
      {showIcon && (
        <span className="flex items-center justify-center shrink-0">
          {isMasterTier ? (
            <Trophy className="w-3.5 h-3.5 text-golden-xp animate-pulse" />
          ) : (
            <span className="text-sm leading-none" role="img" aria-label="frog">
              🐸
            </span>
          )}
        </span>
      )}

      {/* Level Number Pill */}
      <div className="flex items-center gap-1.5">
        <span
          className={`font-mono font-bold tracking-tight rounded-md px-1.5 py-0.5 ${
            isMasterTier
              ? 'bg-golden-xp/20 text-golden-xp'
              : 'bg-frog-green/20 text-frog-green'
          } ${pillTextSizes}`}
        >
          {`LVL ${level}`}
        </span>

        {/* Title text */}
        {showTitle && (
          <span className="font-display font-semibold text-theme-text tracking-tight truncate max-w-[160px]">
            {resolvedTitle}
          </span>
        )}
      </div>

      {isMasterTier && (
        <Sparkles className="w-3 h-3 text-golden-xp fill-golden-xp/30 shrink-0" />
      )}
    </div>
  );
};

export default LevelBadge;
