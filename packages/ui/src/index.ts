import { COLOR_TOKENS, type IntensityLevel, type MascotState } from '@posture-check/shared';

/**
 * UI Theme Tokens exported for web & mobile consumers
 */
export const UI_TOKENS = {
  colors: COLOR_TOKENS,
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    glow: '0 0 15px rgba(76, 175, 80, 0.35)',
  },
} as const;

export interface MascotDisplayProps {
  state: MascotState;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export interface NotificationBannerProps {
  intensity: IntensityLevel;
  message: string;
  onAcknowledge: () => void;
  onSnooze?: () => void;
}
