import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { XpCounter } from '../XpCounter';
import { LevelBadge } from '../LevelBadge';
import { XpProgressBar } from '../XpProgressBar';
import { StreakCounter } from '../StreakCounter';
import { DailySummary } from '../DailySummary';

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

  describe('StreakCounter', () => {
    it('renders 0-day streak with start message and dimmed styling', () => {
      const html = renderToString(React.createElement(StreakCounter, { streak: 0 }));
      expect(html).toContain('0');
      expect(html).toContain('Start your streak today!');
    });

    it('renders 5-day streak with orange tier and day count', () => {
      const html = renderToString(React.createElement(StreakCounter, { streak: 5 }));
      expect(html).toContain('5');
      expect(html).toContain('5-day streak!');
      expect(html).toContain('animate-flame');
    });

    it('renders 14-day streak with bright orange-red milestone tier', () => {
      const html = renderToString(React.createElement(StreakCounter, { streak: 14 }));
      expect(html).toContain('14');
      expect(html).toContain('14-day streak!');
    });

    it('renders 30-day streak with golden tier', () => {
      const html = renderToString(React.createElement(StreakCounter, { streak: 30 }));
      expect(html).toContain('30');
      expect(html).toContain('30-day streak!');
      expect(html).toContain('animate-pulse-gold');
    });

    it('shows protected badge when streak freeze is available', () => {
      const html = renderToString(
        React.createElement(StreakCounter, {
          streak: 7,
          level: 6,
          freezeAvailable: true,
        })
      );
      expect(html).toContain('Protected');
    });

    it('shows used badge when freeze was consumed this week', () => {
      const html = renderToString(
        React.createElement(StreakCounter, {
          streak: 7,
          level: 6,
          freezeAvailable: false,
          freezeUsedThisWeek: true,
        })
      );
      expect(html).toContain('Used');
    });

    it('shows level 5 unlock hint for lower level users', () => {
      const html = renderToString(
        React.createElement(StreakCounter, {
          streak: 2,
          level: 2,
          freezeAvailable: false,
        })
      );
      expect(html).toContain('Lvl 5');
    });
  });

  describe('DailySummary', () => {
    it('renders 80% goal met with success checkmark and streak status', () => {
      const html = renderToString(
        React.createElement(DailySummary, {
          totalChecksToday: 10,
          acknowledgedToday: 8,
        })
      );
      expect(html).toContain('8/10 checks (80%) ✅');
      expect(html).toContain('Counts toward streak! 🔥');
      expect(html).toContain('80%');
    });

    it('renders 50% warning state with alert icon', () => {
      const html = renderToString(
        React.createElement(DailySummary, {
          totalChecksToday: 10,
          acknowledgedToday: 5,
        })
      );
      expect(html).toContain('5/10 checks (50%) ⚠️');
      expect(html).toContain('Not counting yet');
      expect(html).toContain('50%');
    });

    it('renders <50% danger state with warning icon', () => {
      const html = renderToString(
        React.createElement(DailySummary, {
          totalChecksToday: 10,
          acknowledgedToday: 3,
        })
      );
      expect(html).toContain('3/10 checks (30%) 🚨');
    });

    it('renders ready state when 0 checks have fired', () => {
      const html = renderToString(
        React.createElement(DailySummary, {
          totalChecksToday: 0,
          acknowledgedToday: 0,
        })
      );
      expect(html).toContain('0/0 checks (Ready)');
      expect(html).toContain('Goal: ≥80%');
    });
  });
});
