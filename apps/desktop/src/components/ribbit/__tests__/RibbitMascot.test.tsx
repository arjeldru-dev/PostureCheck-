import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import RibbitMascot from '../RibbitMascot';
import type { RibbitState } from '@posture-check/shared';

describe('RibbitMascot Component', () => {
  const allStates: RibbitState[] = [
    'idle',
    'reminding',
    'encouraging',
    'celebrating',
    'concerned',
    'sleeping',
    'disappointed',
  ];

  it('renders all 7 emotional states with descriptive aria-labels', () => {
    for (const state of allStates) {
      const html = renderToString(<RibbitMascot state={state} />);
      expect(html).toContain('role="img"');
      expect(html).toContain(`Ribbit the Frog (${state})`);
      expect(html).toContain('<img');
    }
  });

  it('correctly maps size presets to pixel dimensions', () => {
    const smHtml = renderToString(<RibbitMascot state="idle" size="sm" />);
    expect(smHtml).toContain('width:48px');
    expect(smHtml).toContain('height:48px');

    const mdHtml = renderToString(<RibbitMascot state="idle" size="md" />);
    expect(mdHtml).toContain('width:96px');
    expect(mdHtml).toContain('height:96px');

    const lgHtml = renderToString(<RibbitMascot state="idle" size="lg" />);
    expect(lgHtml).toContain('width:160px');
    expect(lgHtml).toContain('height:160px');

    const xlHtml = renderToString(<RibbitMascot state="idle" size="xl" />);
    expect(xlHtml).toContain('width:240px');
    expect(xlHtml).toContain('height:240px');

    const customHtml = renderToString(<RibbitMascot state="idle" size={72} />);
    expect(customHtml).toContain('width:72px');
    expect(customHtml).toContain('height:72px');
  });

  it('toggles breathing animation class based on showBreathing prop', () => {
    const breathingHtml = renderToString(<RibbitMascot state="idle" showBreathing={true} />);
    expect(breathingHtml).toContain('animate-breathe');

    const staticHtml = renderToString(<RibbitMascot state="idle" showBreathing={false} />);
    expect(staticHtml).not.toContain('animate-breathe');
  });

  it('renders accessible interactive attributes when onClick is provided', () => {
    const dummyClick = vi.fn();
    const interactiveHtml = renderToString(
      <RibbitMascot state="encouraging" onClick={dummyClick} />
    );
    expect(interactiveHtml).toContain('role="button"');
    expect(interactiveHtml).toContain('tabindex="0"');
    expect(interactiveHtml).toContain('cursor-pointer');
  });

  it('supports custom alt text override', () => {
    const customAltHtml = renderToString(
      <RibbitMascot state="celebrating" alt="Custom frog celebration badge" />
    );
    expect(customAltHtml).toContain('aria-label="Custom frog celebration badge"');
    expect(customAltHtml).toContain('alt="Custom frog celebration badge"');
  });
});
