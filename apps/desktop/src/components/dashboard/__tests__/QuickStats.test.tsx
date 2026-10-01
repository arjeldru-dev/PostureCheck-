import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import QuickStats from '../QuickStats';

describe('QuickStats Component', () => {
  it('renders today checks, streak, and XP with level badge', () => {
    const html = renderToString(
      <QuickStats
        todayChecks={8}
        currentStreak={5}
        totalXp={1250}
        level={6}
      />
    );

    expect(html).toContain('Today&#x27;s Checks');
    expect(html).toContain('8');
    expect(html).toContain('Current Streak');
    expect(html).toContain('5');
    expect(html).toContain('animate-flame');
    expect(html).toContain('1,250');
    expect(html).toContain('Lvl 6');
  });
});
