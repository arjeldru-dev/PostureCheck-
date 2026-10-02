import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RibbitState } from '@posture-check/shared';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { Check, Moon, X, Bell } from 'lucide-react';
import {
  slideUpVariants,
  reducedMotionFadeVariants,
  isReducedMotion,
  buttonMotion,
  ghostButtonMotion,
} from './animations';
import { twMerge } from 'tailwind-merge';

export interface ReminderNotificationProps {
  message: string;
  title?: string;
  ribbitState?: RibbitState;
  onAcknowledge?: () => void;
  onSnooze?: () => void;
  onDismiss?: () => void;
  position?: 'bottom-right' | 'top-right' | 'inline' | 'none';
  className?: string;
  isDismissed?: boolean;
}

/**
 * Level 3 — Reminder notification
 * Prominent banner notification (420px wide, taller than L2) anchored at the bottom-right corner.
 * Features a 64px Ribbit tapping screen pose (reminding), subtle frog-green gradient background,
 * gentle pulsing border glow, and high-contrast action buttons: "✓ Sitting up!" and "💤 Snooze 5 min".
 * Stays until acknowledged (persistent).
 */
export const ReminderNotification: React.FC<ReminderNotificationProps> = ({
  message,
  title = 'Posture Check Reminder',
  ribbitState = 'reminding',
  onAcknowledge,
  onSnooze,
  onDismiss,
  position = 'bottom-right',
  className = '',
  isDismissed = false,
}) => {
  const [visible, setVisible] = useState(!isDismissed);

  useEffect(() => {
    setVisible(!isDismissed);
  }, [isDismissed]);

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
        return 'fixed top-6 right-6';
      case 'inline':
      case 'none':
        return 'static';
      case 'bottom-right':
      default:
        return 'fixed bottom-6 right-6';
    }
  })();

  const variants = isReducedMotion() ? reducedMotionFadeVariants : slideUpVariants;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="reminder-title"
          aria-describedby="reminder-desc"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={twMerge(
            `${positionClasses} z-50 w-[420px] max-w-[calc(100vw-32px)] select-none rounded-2xl border-2 border-frog-green/70 bg-gradient-to-br from-frog-green/15 via-theme-surface/95 to-theme-card/98 backdrop-blur-xl p-5 shadow-2xl animate-pulse-glow overflow-hidden transition-colors`,
            className
          )}
        >
          {/* Subtle decorative glow orb */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-frog-green/20 rounded-full blur-xl pointer-events-none" />

          {/* Top Banner Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-frog-green/20 flex items-center justify-center text-frog-green">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3
                id="reminder-title"
                className="font-display font-bold text-sm tracking-wide text-frog-green"
              >
                {title}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close notification"
              className="text-theme-muted hover:text-theme-text transition-colors p-1 rounded-md focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-frog-green"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body: 64px Mascot + Message */}
          <div className="flex items-center gap-4 py-1">
            {/* 64px Ribbit Mascot tapping screen pose */}
            <div className="shrink-0 flex items-center justify-center p-1 bg-theme-bg/60 rounded-2xl border border-theme-border">
              <RibbitMascot state={ribbitState} size={64} showBreathing={true} />
            </div>

            {/* Emphasized Message */}
            <div className="flex-1 min-w-0">
              <p
                id="reminder-desc"
                className="font-sans text-sm font-medium leading-relaxed text-theme-text line-clamp-3"
              >
                {message}
              </p>
            </div>
          </div>

          {/* Bottom Action Buttons: Prominent "✓ Sitting up!" and text button "💤 Snooze 5 min" */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-theme-border/50">
            {/* Primary Action Button */}
            <motion.button
              type="button"
              onClick={handleAcknowledge}
              {...buttonMotion}
              className="flex-1 py-2.5 px-4 rounded-xl bg-frog-green hover:bg-frog-green-secondary text-white font-display font-bold text-xs tracking-wider shadow-md shadow-frog-green/30 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>✓ Sitting up!</span>
            </motion.button>

            {/* Ghost / Text Button */}
            <motion.button
              type="button"
              onClick={handleSnooze}
              {...ghostButtonMotion}
              className="py-2.5 px-3.5 rounded-xl bg-transparent hover:bg-theme-bg text-theme-muted hover:text-theme-text font-display font-medium text-xs tracking-wide cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>💤 Snooze 5 min</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReminderNotification;
