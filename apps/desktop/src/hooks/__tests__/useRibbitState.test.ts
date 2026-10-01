import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useRibbitState, type UseRibbitStateReturn } from '../useRibbitState';
import { useTimerStore } from '@/stores/timerStore';
import { useAppStore } from '@/stores/appStore';

let latestResult: UseRibbitStateReturn | null = null;

function TestComponent({ streakBroken }: { streakBroken?: boolean }) {
  const result = useRibbitState({ streakBroken });
  latestResult = result;
  return React.createElement('div', { id: 'test-ribbit' }, result.state);
}

describe('useRibbitState Hook', () => {
  beforeEach(() => {
    useTimerStore.setState({
      activeReminder: null,
      currentEscalationLevel: 1,
      status: 'active',
      isRunning: true,
    });
    useAppStore.setState({
      isActive: true,
      isDnd: false,
      status: 'active',
    });
  });

  it('initializes to idle state with default message when app is active', () => {
    const html = renderToString(React.createElement(TestComponent));
    expect(html).toContain('idle');
    expect(latestResult).toBeDefined();
    expect(latestResult?.state).toBe('idle');
    expect(latestResult?.message).toContain('Ribbit');
    expect(latestResult?.isCelebrating).toBe(false);
  });

  it('switches to sleeping state when DND is active or app is paused', () => {
    useAppStore.setState({ isDnd: true, status: 'dnd' });
    const html = renderToString(React.createElement(TestComponent));
    expect(html).toContain('sleeping');
    expect(latestResult?.state).toBe('sleeping');
  });

  it('switches to reminding or concerned when activeReminder is present', () => {
    useTimerStore.setState({
      activeReminder: {
        timestamp: new Date().toISOString(),
        level: 2,
        intervalMinutes: 30,
        message: 'Time to stretch!',
      },
      currentEscalationLevel: 1,
    });

    const html = renderToString(React.createElement(TestComponent));
    expect(html).toContain('reminding');
    expect(latestResult?.state).toBe('reminding');
    expect(latestResult?.message).toBe('Time to stretch!');

    // When escalation level >= 2, switches to concerned
    useTimerStore.setState({
      currentEscalationLevel: 2,
    });
    const concernedHtml = renderToString(React.createElement(TestComponent));
    expect(concernedHtml).toContain('concerned');
    expect(latestResult?.state).toBe('concerned');
  });

  it('provides triggers for encouraging, celebrating, and message dismissal', () => {
    renderToString(React.createElement(TestComponent));
    expect(typeof latestResult?.triggerEncouraging).toBe('function');
    expect(typeof latestResult?.triggerCelebrating).toBe('function');
    expect(typeof latestResult?.triggerDisappointed).toBe('function');
    expect(typeof latestResult?.triggerConcerned).toBe('function');
    expect(typeof latestResult?.dismissMessage).toBe('function');
  });
});
