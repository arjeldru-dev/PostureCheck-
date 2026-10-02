import type { Variants, Transition } from 'framer-motion';

/**
 * Check if the user environment prefers reduced motion
 */
export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Custom motion curves and spring configs adhering to Emil Kowalski's
 * design engineering principles (strong ease-out, quick UI response,
 * no scale(0), interruptible transforms).
 */
export const EASINGS = {
  easeOut: [0.23, 1, 0.32, 1] as const,
  easeInOut: [0.77, 0, 0.175, 1] as const,
  springSnappy: { type: 'spring', damping: 25, stiffness: 350 } as const,
  springBouncy: { type: 'spring', damping: 20, stiffness: 280 } as const,
  springGentle: { type: 'spring', damping: 28, stiffness: 220 } as const,
};

/**
 * Level 1: Whisper entrance and exit (200ms subtle fade)
 */
export const fadeInVariants: Variants = {
  initial: {
    opacity: 0,
    transform: 'translateY(6px) scale(0.97)',
  },
  animate: {
    opacity: 1,
    transform: 'translateY(0px) scale(1)',
    transition: {
      duration: 0.2,
      ease: EASINGS.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transform: 'translateY(4px) scale(0.97)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Level 2: Nudge slide-in from right (300ms ease-out, exit 200ms)
 */
export const slideRightVariants: Variants = {
  initial: {
    opacity: 0,
    transform: 'translateX(40px) scale(0.96)',
  },
  animate: {
    opacity: 1,
    transform: 'translateX(0px) scale(1)',
    transition: {
      duration: 0.3,
      ease: EASINGS.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transform: 'translateX(35px) scale(0.96)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Level 3: Reminder slide-up with spring bounce (400ms spring, exit 200ms)
 */
export const slideUpVariants: Variants = {
  initial: {
    opacity: 0,
    transform: 'translateY(36px) scale(0.95)',
  },
  animate: {
    opacity: 1,
    transform: 'translateY(0px) scale(1)',
    transition: EASINGS.springBouncy,
  },
  exit: {
    opacity: 0,
    transform: 'translateY(24px) scale(0.96)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Modal / Dialog scale-in (Level 4 Overlay & Level 5 Card)
 */
export const modalScaleVariants: Variants = {
  initial: {
    opacity: 0,
    transform: 'scale(0.94) translateY(8px)',
  },
  animate: {
    opacity: 1,
    transform: 'scale(1) translateY(0px)',
    transition: EASINGS.springSnappy,
  },
  exit: {
    opacity: 0,
    transform: 'scale(0.96) translateY(4px)',
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Reduced motion fallback variants (pure opacity, zero spatial displacement)
 */
export const reducedMotionFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Subtle attention bounce for Ribbit mascot
 */
export const bounceVariants: Variants = {
  idle: {
    transform: 'translateY(0px)',
  },
  animate: {
    transform: ['translateY(0px)', 'translateY(-7px)', 'translateY(0px)'],
    transition: {
      duration: 0.65,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
};

/**
 * Subtle pulsing animation for buttons or indicators
 */
export const pulseVariants: Variants = {
  initial: {
    transform: 'scale(1)',
  },
  animate: {
    transform: ['scale(1)', 'scale(1.03)', 'scale(1)'],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
};

/**
 * Glowing effect for borders or badges
 */
export const glowVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 4px rgba(76, 175, 80, 0.3))',
  },
  animate: {
    filter: [
      'drop-shadow(0 0 4px rgba(76, 175, 80, 0.3))',
      'drop-shadow(0 0 16px rgba(76, 175, 80, 0.75))',
      'drop-shadow(0 0 4px rgba(76, 175, 80, 0.3))',
    ],
    transition: {
      duration: 2.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Interactive button press feedback props (Emil Kowalski :active scale-97 standard)
 */
export const buttonMotion = {
  whileHover: { scale: 1.025 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.14, ease: EASINGS.easeOut } as Transition,
};

export const ghostButtonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.14, ease: EASINGS.easeOut } as Transition,
};
