import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CountdownTimer from '../CountdownTimer';

describe('CountdownTimer Component', () => {
  it('renders countdown and role timer attributes correctly', () => {
    const html = renderToString(
      <CountdownTimer
        formattedCountdown="12:34"
        secondsRemaining={754}
        intervalMinutes={30}
        status="active"
      />
    );

    expect(html).toContain('role="timer"');
    expect(html).toContain('12:34');
    expect(html).toContain('Next check in');
    expect(html).toContain('Watching Posture');
  });

  it('renders paused status appropriately', () => {
    const html = renderToString(
      <CountdownTimer
        formattedCountdown="Paused"
        secondsRemaining={null}
        intervalMinutes={30}
        status="paused"
      />
    );

    expect(html).toContain('Timer Paused');
    expect(html).toContain('Paused');
  });

  it('renders DND status appropriately', () => {
    const html = renderToString(
      <CountdownTimer
        formattedCountdown="DND"
        secondsRemaining={null}
        intervalMinutes={30}
        status="dnd"
      />
    );

    expect(html).toContain('Do Not Disturb');
  });
});
