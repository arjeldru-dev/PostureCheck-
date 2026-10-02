import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RibbitState } from '@posture-check/shared';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { fadeInVariants, reducedMotionFadeVariants, isReducedMotion } from './animations';
import { twMerge } from 'tailwind-merge';

export interface WhisperNotificationProps {
  message: string;
  ribbitState?: RibbitState;
  onAcknowledge?: () => void;
  onSnooze?: () => void;
  onDismiss?: () => void;
  autoDismissSeconds?: number;
  position?: 'bottom-right' | 'top-right' | 'inline' | 'none';
  className?: string;
  isDismissed?: boolean;
}

/**
 * Level 1 — Whisper notification
 * Minimal, subtle tooltip-style notification that appears near the system tray.
 * Features a small 32px Ribbit winking/smiling next to a quiet message.
 * Tap anywhere to dismiss or automatically dismisses after 10s (pauses on hover).
 */
export const WhisperNotification: React.FC<WhisperNotificationProps> = ({
  message,
  ribbitState = 'encouraging',
  onAcknowledge,
  onDismiss,
  autoDismissSeconds = 10,
  position = 'bottom-right',
  className = '',
  isDismissed = false,
}) => {
  const [visible, setVisible] = useState(!isDismissed);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(!isDismissed);
  }, [isDismissed]);

  useEffect(() => {
    if (autoDismissSeconds <= 0 || !visible || isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissSeconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoDismissSeconds, visible, isHovered, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    if (onAcknowledge) {
      onAcknowledge();
    } else {
      onDismiss?.();
    }
  };

  const positionClasses = (() => {
    switch (position) {
      case 'top-right':
        return 'fixed top-5 right-5';
      case 'inline':
      case 'none':
        return 'static';
      case 'bottom-right':
      default:
        return 'fixed bottom-5 right-5';
    }
  })();

  const variants = isReducedMotion() ? reducedMotionFadeVariants : fadeInVariants;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          tabIndex={0}
          onClick={handleDismiss}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              handleDismiss();
            }
          }}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={twMerge(
            `${positionClasses} z-50 max-w-xs cursor-pointer select-none rounded-2xl bg-theme-surface/95 backdrop-blur-md border border-theme-border px-3.5 py-2.5 shadow-lg shadow-black/25 hover:border-frog-green/40 transition-colors duration-150 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green`,
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            {/* 32px Ribbit Mascot winking/smiling */}
            <div className="shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-150">
              <RibbitMascot state={ribbitState} size={32} showBreathing={false} />
            </div>

            {/* Muted short message */}
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug font-sans text-theme-muted line-clamp-2">
                {message}
              </p>
            </div>

            {/* Subtle dismiss dot hint */}
            <div
              className="w-1.5 h-1.5 rounded-full bg-frog-green/60 group-hover:bg-frog-green shrink-0 transition-colors"
              title="Click anywhere to dismiss"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhisperNotification;
