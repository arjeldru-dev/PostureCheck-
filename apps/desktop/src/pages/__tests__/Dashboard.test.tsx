import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Dashboard from '../Dashboard';
import { useTimerStore } from '@/stores/timerStore';
import { useAppStore } from '@/stores/appStore';

describe('Dashboard Page', () => {
  beforeEach(() => {
    useTimerStore.setState({
      activeReminder: null,
      currentEscalationLevel: 1,
      secondsRemaining: 754,
      intervalMinutes: 30,
      status: 'active',
      isRunning: true,
    });
    useAppStore.setState({
      isActive: true,
      isDnd: false,
      status: 'active',
    });
  });

  it('renders Ribbit mascot centerpiece, countdown, and quick stats', () => {
    const onOpenSettings = vi.fn();
    const onShowFeedback = vi.fn();

    const html = renderToString(
      <Dashboard
        onOpenSettings={onOpenSettings}
        onShowFeedback={onShowFeedback}
      />
    );

    // Mascot is present
    expect(html).toContain('Ribbit the Frog');
    // Countdown present
    expect(html).toContain('Next check in');
    // Quick stats present
    expect(html).toContain('Today&#x27;s Checks');
    expect(html).toContain('Current Streak');
  });

  it('renders prominent acknowledge action when an active reminder is present', () => {
    useTimerStore.setState({
      activeReminder: {
        timestamp: new Date().toISOString(),
        level: 2,
        intervalMinutes: 30,
        message: 'Time to sit up straight! 🐸',
      },
    });

    const html = renderToString(<Dashboard />);
    expect(html).toContain('Sit Up Straight!');
    expect(html).toContain('Snooze 5m');
  });
});
