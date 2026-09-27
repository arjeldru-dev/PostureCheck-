import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useNotifications } from '../useNotifications';

let latestResult: ReturnType<typeof useNotifications> | null = null;

function TestComponent() {
  const result = useNotifications();
  latestResult = result;
  return React.createElement('div', { id: 'notif-test' }, result.history.length);
}

describe('useNotifications Hook', () => {
  it('initializes and provides notification dispatchers and history', () => {
    const html = renderToString(React.createElement(TestComponent));
    expect(html).toBeDefined();
    expect(latestResult).toBeDefined();
    expect(typeof latestResult?.testNotification).toBe('function');
    expect(typeof latestResult?.setIntensityLevel).toBe('function');
    expect(typeof latestResult?.refreshHistory).toBe('function');
    expect(typeof latestResult?.handleAction).toBe('function');
    expect(typeof latestResult?.acknowledge).toBe('function');
    expect(typeof latestResult?.snooze).toBe('function');
    expect(typeof latestResult?.dismiss).toBe('function');
    expect(typeof latestResult?.isPermissionDenied).toBe('boolean');
  });

  it('provides action handlers for acknowledge, snooze and dismiss', async () => {
    renderToString(React.createElement(TestComponent));
    expect(latestResult).toBeDefined();
    if (latestResult) {
      const ackRes = await latestResult.handleAction('sitting_up', 'test-1');
      expect(ackRes.success).toBe(true);
      expect(ackRes.action).toBe('sitting_up');

      const snoozeRes = await latestResult.handleAction('snooze', 'test-1');
      expect(snoozeRes.success).toBe(true);
      expect(snoozeRes.action).toBe('snooze');

      const dismissRes = await latestResult.handleAction('dismiss', 'test-1');
      expect(dismissRes.success).toBe(true);
      expect(dismissRes.action).toBe('dismiss');
    }
  });
});
