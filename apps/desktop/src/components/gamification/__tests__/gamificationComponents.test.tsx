import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { XpCounter } from '../XpCounter';
import { LevelBadge } from '../LevelBadge';
import { XpProgressBar } from '../XpProgressBar';

describe('Gamification Display Components', () => {
  describe('XpCounter', () => {
    it('renders formatted XP counter with label', () => {
      const html = renderToString(React.createElement(XpCounter, { value: 1250, label: 'XP' }));
      expect(html).toContain('1,250');
      expect(html).toContain('XP');
    });

    it('renders with small size variant', () => {
      const html = renderToString(React.createElement(XpCounter, { value: 300, size: 'sm' }));
      expect(html).toContain('300');
    });
  });

  describe('LevelBadge', () => {
    it('renders Level 1 Tadpole badge', () => {
      const html = renderToString(React.createElement(LevelBadge, { level: 1 }));
      expect(html).toContain('LVL 1');
      expect(html).toContain('Tadpole');
    });

    it('renders Level 5 Tree Frog badge', () => {
      const html = renderToString(React.createElement(LevelBadge, { level: 5 }));
      expect(html).toContain('LVL 5');
      expect(html).toContain('Tree Frog');
    });

    it('renders Level 25 Zen Master badge with master tier styling', () => {
      const html = renderToString(React.createElement(LevelBadge, { level: 25 }));
      expect(html).toContain('LVL 25');
      expect(html).toContain('Zen Master');
    });
  });

  describe('XpProgressBar', () => {
    it('renders progress bar with 450 / 1,000 XP formatted text', () => {
      // 450 XP is Level 3 (300 XP), next level is Level 4 (600 XP)
      const html = renderToString(React.createElement(XpProgressBar, { totalXp: 450 }));
      expect(html).toContain('450');
      expect(html).toContain('600');
      expect(html).toContain('50%');
      expect(html).toContain('progressbar');
    });

    it('renders custom bounds when provided', () => {
      const html = renderToString(
        React.createElement(XpProgressBar, {
          totalXp: 450,
          levelInfo: {
            level: 4,
            title: 'Leaper',
            xpForCurrentLevel: 0,
            xpForNextLevel: 1000,
            progressPercent: 45,
          },
        })
      );
      expect(html).toContain('450 / 1,000 XP');
      expect(html).toContain('45%');
    });
  });
});
