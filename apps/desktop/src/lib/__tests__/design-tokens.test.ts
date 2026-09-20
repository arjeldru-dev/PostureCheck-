import { describe, it, expect } from 'vitest';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  RADII,
  SHADOWS,
  ANIMATIONS,
  useThemeStore,
} from '@posture-check/shared';

describe('Design Tokens', () => {
  it('should export all required palette colors with exact hex values', () => {
    expect(COLORS.frogGreen).toBe('#4CAF50');
    expect(COLORS.frogGreenSecondary).toBe('#66BB6A');
    expect(COLORS.lilyPad).toBe('#81C784');
    expect(COLORS.pondDark).toBe('#1A2332');
    expect(COLORS.pondLight).toBe('#F5F7FA');
    expect(COLORS.goldenXp).toBe('#FFD54F');
    expect(COLORS.coralAlert).toBe('#FF7043');
    expect(COLORS.skyBlue).toBe('#42A5F5');
    expect(COLORS.surfaceDark).toBe('#243447');
    expect(COLORS.surfaceLight).toBe('#FFFFFF');
    expect(COLORS.textPrimaryDark).toBe('#E8ECF0');
    expect(COLORS.textPrimaryLight).toBe('#1A2332');
  });

  it('should export font size scale from xs to 5xl', () => {
    expect(FONT_SIZES.xs).toBe('0.75rem');
    expect(FONT_SIZES.sm).toBe('0.875rem');
    expect(FONT_SIZES.base).toBe('1rem');
    expect(FONT_SIZES.lg).toBe('1.125rem');
    expect(FONT_SIZES.xl).toBe('1.25rem');
    expect(FONT_SIZES['2xl']).toBe('1.5rem');
    expect(FONT_SIZES['5xl']).toBe('3rem');
  });

  it('should export spacing scale including minimum touch target (44px)', () => {
    expect(SPACING['0.5']).toBe('0.125rem');
    expect(SPACING['4']).toBe('1rem');
    expect(SPACING['11']).toBe('2.75rem'); // 44px
    expect(SPACING['24']).toBe('6rem');
  });

  it('should export rounded radii and shadows', () => {
    expect(RADII.full).toBe('9999px');
    expect(SHADOWS.glowGreen).toContain('rgba(76, 175, 80');
    expect(SHADOWS.glowGold).toContain('rgba(255, 213, 79');
    expect(ANIMATIONS.breathe).toContain('breathe');
  });

  it('should update theme mode in useThemeStore', () => {
    const store = useThemeStore.getState();
    expect(store.mode).toBeDefined();

    store.setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedMode).toBe('light');

    store.setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedMode).toBe('dark');
  });
});
