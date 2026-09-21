/**
 * Ribbit Mascot Emotional States & Configuration
 */

export type RibbitState =
  | 'idle'
  | 'reminding'
  | 'encouraging'
  | 'celebrating'
  | 'concerned'
  | 'sleeping'
  | 'disappointed';

export interface RibbitConfig {
  state: RibbitState;
  message?: string;
  showAnimation?: boolean;
}

export type MascotSize = 'sm' | 'md' | 'lg' | 'xl' | number;

export const RIBBIT_SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 48,
  md: 96,
  lg: 160,
  xl: 240,
};

export const RIBBIT_STATE_DESCRIPTIONS: Record<RibbitState, string> = {
  idle: 'Sitting calmly on lily pad, ready to help',
  reminding: 'Standing upright alertly, tapping to remind you',
  encouraging: 'Giving a cheerful thumbs up with a warm smile',
  celebrating: 'Jumping joyfully with confetti in triumph',
  concerned: 'Gently tilting head with a caring, worried look',
  sleeping: 'Dozing peacefully with gentle Zzz bubbles',
  disappointed: 'Slumped slightly sad after a missed check-in',
};
