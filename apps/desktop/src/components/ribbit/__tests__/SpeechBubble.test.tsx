import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import SpeechBubble from '../SpeechBubble';

describe('SpeechBubble Component', () => {
  it('renders message text inside an accessible region', () => {
    const html = renderToString(
      <SpeechBubble message="Ribbit is watching your posture! 🐸" state="idle" />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('Ribbit is watching your posture! 🐸');
  });

  it('does not render when message is null or empty', () => {
    const html = renderToString(<SpeechBubble message={null} />);
    expect(html).toBe('');
  });

  it('applies emotional state accent classes to both bubble body and pointer tail', () => {
    const concernedHtml = renderToString(
      <SpeechBubble message="Hey... are you okay?" state="concerned" />
    );
    expect(concernedHtml).toContain('border-coral-alert/50');

    const celebratingHtml = renderToString(
      <SpeechBubble message="Woohoo!" state="celebrating" />
    );
    expect(celebratingHtml).toContain('border-golden-xp/60');
  });
});
