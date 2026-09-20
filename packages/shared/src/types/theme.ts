/**
 * Theme Modes
 */
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

/**
 * Color Palette Tokens
 */
export interface ColorPalette {
  // Brand & Accent
  frogGreen: string;
  frogGreenSecondary: string;
  lilyPad: string;
  goldenXp: string;
  coralAlert: string;
  skyBlue: string;

  // Backgrounds & Surfaces
  pondDark: string;
  pondLight: string;
  surfaceDark: string;
  surfaceLight: string;
  surfaceCard: string;

  // Typography
  textPrimaryDark: string;
  textPrimaryLight: string;
  textMutedDark: string;
  textMutedLight: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Typography Tokens
 */
export interface TypographyTokens {
  fontFamilies: {
    display: string;
    sans: string;
    mono: string;
  };
  fontSizes: Record<
    'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl',
    {
      fontSize: string;
      lineHeight: string;
      letterSpacing?: string;
    }
  >;
  fontWeights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
}

/**
 * Spacing Tokens (rem-based)
 */
export type SpacingScale = Record<
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '14'
  | '16'
  | '20'
  | '24',
  string
>;

/**
 * Border Radius Tokens
 */
export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

/**
 * Shadow Tokens
 */
export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
  glowGreen: string;
  glowGold: string;
}

/**
 * Animation Tokens
 */
export interface AnimationTokens {
  breathe: string;
  pulseGold: string;
  fadeIn: string;
  slideUp: string;
  slideDown: string;
  scaleIn: string;
  bounce: string;
}

/**
 * Complete Design Tokens Schema
 */
export interface DesignTokens {
  colors: ColorPalette;
  typography: TypographyTokens;
  spacing: SpacingScale;
  radii: RadiusTokens;
  shadows: ShadowTokens;
  animations: AnimationTokens;
}

/**
 * Theme Store State
 */
export interface ThemeStoreState {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
}
