import { describe, it, expect } from 'vitest';
import {
  RIBBIT_SIZE_MAP,
  RIBBIT_STATE_DESCRIPTIONS,
  type RibbitState,
} from '@posture-check/shared';

describe('Ribbit Mascot Constants & Contracts', () => {
  const allStates: RibbitState[] = [
    'idle',
    'reminding',
    'encouraging',
    'celebrating',
    'concerned',
    'sleeping',
    'disappointed',
  ];

  it('should define all 7 required emotional states in the description dictionary', () => {
    expect(allStates).toHaveLength(7);
    for (const state of allStates) {
      expect(RIBBIT_STATE_DESCRIPTIONS[state]).toBeDefined();
      expect(typeof RIBBIT_STATE_DESCRIPTIONS[state]).toBe('string');
      expect(RIBBIT_STATE_DESCRIPTIONS[state].length).toBeGreaterThan(5);
    }
  });

  it('should define correct pixel mappings for all 4 mascot size presets', () => {
    expect(RIBBIT_SIZE_MAP.sm).toBe(48);
    expect(RIBBIT_SIZE_MAP.md).toBe(96);
    expect(RIBBIT_SIZE_MAP.lg).toBe(160);
    expect(RIBBIT_SIZE_MAP.xl).toBe(240);
  });

  it('should guarantee all 7 mobile mascot SVG strings are valid SVG DOM vectors', async () => {
    // Dynamically import mobile SVG strings to verify cross-platform parity
    const { RIBBIT_SVG_STRINGS } = await import(
      '../../../../mobile/components/ribbit/ribbit-svg-strings'
    );
    for (const state of allStates) {
      const svg = RIBBIT_SVG_STRINGS[state];
      expect(svg).toBeDefined();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('viewBox="0 0 200 200"');
      expect(svg).toContain('<defs>');
      expect(svg).toContain('</defs>');
    }
  });
});

