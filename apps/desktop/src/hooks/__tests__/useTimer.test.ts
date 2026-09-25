import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useTimer, type UseTimerOptions } from '../useTimer';

let latestHookResult: ReturnType<typeof useTimer> | null = null;

function TestComponent({ options }: { options?: UseTimerOptions }) {
  const result = useTimer(options);
  latestHookResult = result;
  return React.createElement('div', { id: 'test-timer' }, result.formattedCountdown);
}

describe('useTimer Hook', () => {
  it('initializes and provides reactive timer state and actions', () => {
    const onReminder = vi.fn();
    const onTimerStateChange = vi.fn();

    const html = renderToString(
      React.createElement(TestComponent, { options: { onReminder, onTimerStateChange } })
    );

    expect(html).toBeDefined();
    expect(latestHookResult).toBeDefined();
    expect(typeof latestHookResult?.acknowledge).toBe('function');
    expect(typeof latestHookResult?.snooze).toBe('function');
    expect(typeof latestHookResult?.setInterval).toBe('function');
    expect(typeof latestHookResult?.setActiveHours).toBe('function');
    expect(typeof latestHookResult?.setActiveDays).toBe('function');
    expect(latestHookResult?.intervalMinutes).toBe(30);
    expect(latestHookResult?.currentEscalationLevel).toBe(1);
  });
});
