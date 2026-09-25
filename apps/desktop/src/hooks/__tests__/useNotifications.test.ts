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
  });
});
