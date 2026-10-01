import React from 'react';
import { Clock, Pause, Moon, Play } from 'lucide-react';

export interface CountdownTimerProps {
  /** Formatted countdown string (e.g. "12:34", "Paused", "DND") */
  formattedCountdown: string;
  /** Seconds remaining until next check */
  secondsRemaining: number | null;
  /** Total interval in minutes */
  intervalMinutes: number;
  /** Timer status ('active' | 'paused' | 'dnd') */
  status: 'active' | 'paused' | 'dnd';
  /** Optional click handler or pause toggle */
  onTogglePause?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  formattedCountdown,
  secondsRemaining,
  intervalMinutes,
  status,
  onTogglePause,
  className = '',
}) => {
  const totalSeconds = Math.max(1, intervalMinutes * 60);
  const remaining = Math.max(0, secondsRemaining ?? totalSeconds);
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100));

  const statusConfig = (() => {
    switch (status) {
      case 'dnd':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-sky-blue" />,
          label: 'Do Not Disturb',
          dotClass: 'bg-sky-blue',
          borderClass: 'border-sky-blue/30 bg-sky-blue/10 text-sky-blue',
        };
      case 'paused':
        return {
          icon: <Pause className="w-3.5 h-3.5 text-golden-xp" />,
          label: 'Timer Paused',
          dotClass: 'bg-golden-xp',
          borderClass: 'border-golden-xp/30 bg-golden-xp/10 text-golden-xp',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-frog-green" />,
          label: 'Watching Posture',
          dotClass: 'bg-frog-green animate-pulse',
          borderClass: 'border-frog-green/30 bg-frog-green/10 text-frog-green',
        };
    }
  })();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 select-none ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`Next posture check countdown: ${formattedCountdown}`}
    >
      {/* Top Status Pill */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${statusConfig.borderClass} transition-colors duration-200`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
        <span>{statusConfig.label}</span>
      </div>

      {/* Main Countdown Display */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs sm:text-sm font-medium text-theme-muted uppercase tracking-wider font-sans">
          Next check in
        </span>
        <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-theme-text tabular-nums">
          {formattedCountdown}
        </span>
      </div>

      {/* Subtle Progress Bar */}
      <div className="w-48 sm:w-60 h-1.5 bg-theme-border/60 rounded-full overflow-hidden mt-1">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            status === 'active'
              ? 'bg-gradient-to-r from-frog-green to-lily-pad'
              : status === 'paused'
              ? 'bg-golden-xp'
              : 'bg-sky-blue'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Pause/Resume Quick Toggle button */}
      {onTogglePause && (
        <button
          onClick={onTogglePause}
          className="mt-1 flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-text transition-colors px-2.5 py-1 rounded-lg hover:bg-theme-surface border border-transparent hover:border-theme-border cursor-pointer active:scale-97"
          title={status === 'paused' ? 'Resume Timer' : 'Pause Timer'}
        >
          {status === 'paused' ? (
            <>
              <Play className="w-3 h-3 text-frog-green fill-frog-green" />
              <span>Resume Timer</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3" />
              <span>Pause Reminders</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CountdownTimer;
