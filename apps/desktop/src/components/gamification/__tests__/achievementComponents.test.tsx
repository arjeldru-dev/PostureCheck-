import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getAchievementById } from '@posture-check/shared';
import { AchievementBadge } from '../AchievementBadge';
import { AchievementToast } from '../AchievementToast';

const weekWarrior = getAchievementById('week_warrior')!;

describe('AchievementBadge', () => {
  it('renders an unlocked badge with description and XP', () => {
    const html = renderToString(
      React.createElement(AchievementBadge, {
        achievement: weekWarrior,
        isUnlocked: true,
        unlockedAt: '2026-11-01T08:00:00Z',
      })
    );
    expect(html).toContain('Week Warrior');
    expect(html).toContain(weekWarrior.description);
    expect(html).toContain('+50 XP');
    expect(html).toContain('data-unlocked="true"');
    expect(html).not.toContain('grayscale');
  });

  it('renders a locked badge greyed out with its hint', () => {
    const html = renderToString(
      React.createElement(AchievementBadge, { achievement: weekWarrior, isUnlocked: false })
    );
    expect(html).toContain('data-unlocked="false"');
    expect(html).toContain('grayscale');
    expect(html).toContain(weekWarrior.hint);
    expect(html).toContain('locked');
  });
});

describe('AchievementToast', () => {
  it('renders nothing until an achievement is unlocked', () => {
    const html = renderToString(React.createElement(AchievementToast, {}));
    expect(html).toBe('');
  });
});
