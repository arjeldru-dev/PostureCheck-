import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Settings from '../Settings';

describe('Settings Page Layout & Scrollability Regression Tests', () => {
  it('renders root container with flexible layout for desktop window scrolling', () => {
    const html = renderToString(<Settings />);

    // Verify root container has flexible classes to prevent clipping inside desktop window
    expect(html).toContain('min-h-full');
    expect(html).toContain('w-full');
    expect(html).toContain('flex-col');
  });

  it('renders fixed/sticky header with shrink-0', () => {
    const html = renderToString(<Settings />);

    expect(html).toContain('sticky top-0');
    expect(html).toContain('shrink-0');
  });

  it('renders navigation tabs and tabpanel with responsive layout', () => {
    const html = renderToString(<Settings />);

    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('Timing');
    expect(html).toContain('Notifications');
    expect(html).toContain('Schedule');
    expect(html).toContain('Do Not Disturb');
    expect(html).toContain('General');
  });
});
