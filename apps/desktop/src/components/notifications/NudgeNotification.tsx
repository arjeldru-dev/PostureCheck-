import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RibbitState } from '@posture-check/shared';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { Check, Moon, X } from 'lucide-react';
import {
  slideRightVariants,
  reducedMotionFadeVariants,
  isReducedMotion,
  buttonMotion,
  ghostButtonMotion,
} from './animations';
import { twMerge } from 'tailwind-merge';

export interface NudgeNotificationProps {
  message: string;
  title?: string;
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
 * Level 2 — Nudge notification
 * Standard toast notification with personality. 360px wide, positioned at bottom-right corner.
 * Features a 48px Ribbit mascot waving on the left, lily-pad green left accent border,
 * and responsive action buttons: "✓ Got it!" and "💤 Snooze". Auto-dismiss pauses on hover.
 */
export const NudgeNotification: React.FC<NudgeNotificationProps> = ({
  message,
  title = 'Posture Check!',
  ribbitState = 'encouraging',
  onAcknowledge,
  onSnooze,
  onDismiss,
  autoDismissSeconds = 30,
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

  const handleAcknowledge = () => {
    setVisible(false);
    onAcknowledge?.();
  };

  const handleSnooze = () => {
    setVisible(false);
    onSnooze?.();
  };

  const handleClose = () => {
    setVisible(false);
    onDismiss?.();
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

  const variants = isReducedMotion() ? reducedMotionFadeVariants : slideRightVariants;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Posture nudge notification"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={twMerge(
            `${positionClasses} z-50 w-[360px] max-w-[calc(100vw-32px)] select-none rounded-xl border border-theme-border border-l-4 border-l-lily-pad bg-theme-surface/95 backdrop-blur-md p-4 shadow-xl shadow-black/25 overflow-hidden transition-colors`,
            className
          )}
        >
          {/* Top Row: Mascot, Message, and Close button */}
          <div className="flex items-start gap-3">
            {/* 48px Ribbit Mascot waving/encouraging */}
            <div className="shrink-0 pt-0.5">
              <RibbitMascot state={ribbitState} size={48} showBreathing={true} />
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-xs uppercase tracking-wider text-lily-pad">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Dismiss notification"
                  className="text-theme-muted hover:text-theme-text transition-colors p-0.5 rounded-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-frog-green"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="font-sans text-xs leading-relaxed text-theme-text line-clamp-3">
                {message}
              </p>
            </div>
          </div>

          {/* Bottom Action Buttons: "✓ Got it!" & "💤 Snooze" */}
          <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-theme-border/50">
            <motion.button
              type="button"
              onClick={handleAcknowledge}
              {...buttonMotion}
              className="flex-1 py-1.5 px-3 rounded-lg bg-frog-green hover:bg-frog-green-secondary text-white font-display font-semibold text-xs tracking-wide shadow-sm shadow-frog-green/20 cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Got it!</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={handleSnooze}
              {...ghostButtonMotion}
              className="py-1.5 px-3 rounded-lg bg-theme-bg/60 hover:bg-theme-bg text-theme-muted hover:text-theme-text border border-theme-border font-display font-medium text-xs tracking-wide cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Snooze</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NudgeNotification;
