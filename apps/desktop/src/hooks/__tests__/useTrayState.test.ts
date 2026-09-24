import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useTrayState, type UseTrayStateOptions } from '../useTrayState';

let latestHookResult: ReturnType<typeof useTrayState> | null = null;

function TestComponent({ options }: { options: UseTrayStateOptions }) {
  const result = useTrayState(options);
  latestHookResult = result;
  return React.createElement('div', { id: 'test' }, result.status);
}

describe('useTrayState Hook', () => {
  it('initializes and provides tray state and action dispatchers', () => {
    const onNavigate = vi.fn();
    const onStateChange = vi.fn();

    const html = renderToString(
      React.createElement(TestComponent, { options: { onNavigate, onStateChange } })
    );

    expect(html).toContain('active');
    expect(latestHookResult).toBeDefined();
    expect(typeof latestHookResult?.togglePause).toBe('function');
    expect(typeof latestHookResult?.setDnd).toBe('function');
    expect(typeof latestHookResult?.cancelDnd).toBe('function');
    expect(typeof latestHookResult?.setIntervalMinutes).toBe('function');
  });

  it('renders across multiple iterations with inline callbacks without errors', () => {
    let callCount = 0;

    const html1 = renderToString(
      React.createElement(TestComponent, {
        options: {
          onNavigate: () => {
            callCount++;
          },
        },
      })
    );
    expect(html1).toContain('active');

    const html2 = renderToString(
      React.createElement(TestComponent, {
        options: {
          onNavigate: () => {
            callCount += 2;
          },
        },
      })
    );
    expect(html2).toContain('active');
    expect(callCount).toBe(0);
  });
});
