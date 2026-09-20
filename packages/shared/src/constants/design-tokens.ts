import type {
  ColorPalette,
  DesignTokens,
  RadiusTokens,
  ShadowTokens,
  SpacingScale,
  TypographyTokens,
  AnimationTokens,
} from '../types/theme';

/**
 * Core Posture Check! Colors
 */
export const COLORS: ColorPalette = {
  // Brand & Accent
  frogGreen: '#4CAF50',
  frogGreenSecondary: '#66BB6A',
  lilyPad: '#81C784',
  goldenXp: '#FFD54F',
  coralAlert: '#FF7043',
  skyBlue: '#42A5F5',

  // Backgrounds & Surfaces
  pondDark: '#1A2332',
  pondLight: '#F5F7FA',
  surfaceDark: '#243447',
  surfaceLight: '#FFFFFF',
  surfaceCard: '#1f2c3d',

  // Typography
  textPrimaryDark: '#E8ECF0',
  textPrimaryLight: '#1A2332',
  textMutedDark: '#8A9BB5',
  textMutedLight: '#6B7C93',

  // Semantic
  success: '#4CAF50',
  warning: '#FFD54F',
  error: '#FF7043',
  info: '#42A5F5',
} as const;

/**
 * Opacity variants for overlays, borders, and glassmorphic elements
 */
export const COLOR_OPACITIES = {
  frogGreen10: 'rgba(76, 175, 80, 0.1)',
  frogGreen15: 'rgba(76, 175, 80, 0.15)',
  frogGreen20: 'rgba(76, 175, 80, 0.2)',
  frogGreen30: 'rgba(76, 175, 80, 0.3)',
  frogGreen40: 'rgba(76, 175, 80, 0.4)',
  frogGreen80: 'rgba(76, 175, 80, 0.8)',

  goldenXp10: 'rgba(255, 213, 79, 0.1)',
  goldenXp20: 'rgba(255, 213, 79, 0.2)',
  goldenXp40: 'rgba(255, 213, 79, 0.4)',

  coralAlert15: 'rgba(255, 112, 67, 0.15)',
  coralAlert25: 'rgba(255, 112, 67, 0.25)',
  coralAlert40: 'rgba(255, 112, 67, 0.4)',

  skyBlue10: 'rgba(66, 165, 245, 0.1)',
  skyBlue20: 'rgba(66, 165, 245, 0.2)',
  skyBlue30: 'rgba(66, 165, 245, 0.3)',

  surfaceDark40: 'rgba(36, 52, 71, 0.4)',
  surfaceDark80: 'rgba(36, 52, 71, 0.8)',
  pondDark40: 'rgba(26, 35, 50, 0.4)',
  pondDark80: 'rgba(26, 35, 50, 0.8)',
} as const;

/**
 * Typography Tokens
 */
export const TYPOGRAPHY: TypographyTokens = {
  fontFamilies: {
    display: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSizes: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em' }, // 12px
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },                     // 14px
    base: { fontSize: '1rem', lineHeight: '1.5rem' },                        // 16px
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },                     // 18px
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' }, // 20px
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.015em' }, // 24px
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em' }, // 30px
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.025em' }, // 36px
    '5xl': { fontSize: '3rem', lineHeight: '1.15', letterSpacing: '-0.03em' },       // 48px
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

/**
 * Direct mapping of font sizes for quick programmatic lookup
 */
export const FONT_SIZES = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const;

/**
 * Spacing Scale (rem values)
 */
export const SPACING: SpacingScale = {
  '0.5': '0.125rem', // 2px
  '1': '0.25rem',    // 4px
  '1.5': '0.375rem', // 6px
  '2': '0.5rem',     // 8px
  '2.5': '0.625rem', // 10px
  '3': '0.75rem',    // 12px
  '3.5': '0.875rem', // 14px
  '4': '1rem',       // 16px
  '5': '1.25rem',    // 20px
  '6': '1.5rem',     // 24px
  '7': '1.75rem',    // 28px
  '8': '2rem',       // 32px
  '9': '2.25rem',    // 36px
  '10': '2.5rem',    // 40px
  '11': '2.75rem',   // 44px (touch target)
  '12': '3rem',      // 48px
  '14': '3.5rem',    // 56px
  '16': '4rem',      // 64px
  '20': '5rem',      // 80px
  '24': '6rem',      // 96px
} as const;

/**
 * Border Radii
 */
export const RADII: RadiusTokens = {
  none: '0px',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Shadows tailored for the Pond dark theme & light surfaces
 */
export const SHADOWS: ShadowTokens = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.35)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.45)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.25)',
  glowGreen: '0 0 16px rgba(76, 175, 80, 0.35)',
  glowGold: '0 0 16px rgba(255, 213, 79, 0.45)',
} as const;

/**
 * Animation tokens
 */
export const ANIMATIONS: AnimationTokens = {
  breathe: 'breathe 3.5s ease-in-out infinite',
  pulseGold: 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  fadeIn: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  slideUp: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  slideDown: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  scaleIn: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'bounce 1s infinite',
} as const;

/**
 * Consolidated Design Tokens Object
 */
export const DESIGN_TOKENS: DesignTokens = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radii: RADII,
  shadows: SHADOWS,
  animations: ANIMATIONS,
} as const;
