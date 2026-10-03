import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';

export interface XpCounterProps {
  /** The target XP value to display */
  value: number;
  /** Duration of counting animation in milliseconds (default: 800) */
  duration?: number;
  /** Whether to show a floating badge with recent gain */
  showGainBadge?: boolean;
  /** Whether to display the golden XP lightning icon */
  showIcon?: boolean;
  /** Text label alongside or below (e.g. 'XP') */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const XpCounter: React.FC<XpCounterProps> = ({
  value,
  duration = 800,
  showGainBadge = true,
  showIcon = true,
  label = 'XP',
  size = 'md',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [recentGain, setRecentGain] = useState<number | null>(null);
  const [gainVisible, setGainVisible] = useState(false);

  const currentDisplayRef = useRef(displayValue);
  currentDisplayRef.current = displayValue;

  const animFrameRef = useRef<number | null>(null);
  const gainTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startValue = currentDisplayRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (diff > 0 && showGainBadge) {
      setRecentGain(diff);
      setGainVisible(true);
      if (gainTimeoutRef.current) clearTimeout(gainTimeoutRef.current);
      gainTimeoutRef.current = setTimeout(() => {
        setGainVisible(false);
      }, 2000);
    }

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    // Smooth counting up animation using requestAnimationFrame
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startValue + diff * easeProgress);

      setDisplayValue(currentVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration, showGainBadge]);

  useEffect(() => {
    return () => {
      if (gainTimeoutRef.current) clearTimeout(gainTimeoutRef.current);
    };
  }, []);

  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-xl sm:text-2xl font-bold',
    lg: 'text-3xl sm:text-4xl font-extrabold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 select-none ${className}`}
      role="status"
      aria-label={`${displayValue} ${label}`}
    >
      {showIcon && (
        <div className="flex items-center justify-center rounded-lg bg-golden-xp/15 text-golden-xp p-1">
          <Zap className={`${iconSizes} fill-golden-xp/30`} />
        </div>
      )}

      <span
        className={`font-mono tabular-nums text-theme-text tracking-tight transition-colors ${sizeClasses}`}
      >
        {displayValue.toLocaleString()}
      </span>

      {label && (
        <span className="text-xs font-sans font-semibold text-golden-xp uppercase tracking-wider">
          {label}
        </span>
      )}

      {/* Floating XP Gain Badge Animation */}
      {showGainBadge && recentGain !== null && gainVisible && (
        <span
          className="absolute -top-3 -right-6 px-1.5 py-0.5 rounded-full bg-golden-xp text-pond-dark font-mono text-[10px] font-bold shadow-xs animate-bounce"
          role="status"
          aria-live="polite"
        >
          +{recentGain}
        </span>
      )}
    </div>
  );
};

export default XpCounter;
