import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { WhisperNotification } from '../WhisperNotification';
import { NudgeNotification } from '../NudgeNotification';
import { ReminderNotification } from '../ReminderNotification';
import {
  fadeInVariants,
  slideRightVariants,
  slideUpVariants,
  modalScaleVariants,
  reducedMotionFadeVariants,
  bounceVariants,
  pulseVariants,
  glowVariants,
  EASINGS,
  isReducedMotion,
} from '../animations';

describe('Notification Components & Animations', () => {
  describe('Shared Animation Variants', () => {
    it('defines required Framer Motion variants and Emil Kowalski easings', () => {
      expect(fadeInVariants).toBeDefined();
      expect(fadeInVariants.initial).toBeDefined();
      expect(fadeInVariants.animate).toBeDefined();
      expect(fadeInVariants.exit).toBeDefined();

      expect(slideRightVariants).toBeDefined();
      expect(slideRightVariants.initial).toBeDefined();
      expect(slideRightVariants.animate).toBeDefined();
      expect(slideRightVariants.exit).toBeDefined();

      expect(slideUpVariants).toBeDefined();
      expect(slideUpVariants.initial).toBeDefined();
      expect(slideUpVariants.animate).toBeDefined();
      expect(slideUpVariants.exit).toBeDefined();

      expect(modalScaleVariants).toBeDefined();
      expect(reducedMotionFadeVariants).toBeDefined();
      expect(bounceVariants).toBeDefined();
      expect(pulseVariants).toBeDefined();
      expect(glowVariants).toBeDefined();

      expect(EASINGS.easeOut).toEqual([0.23, 1, 0.32, 1]);
      expect(typeof isReducedMotion).toBe('function');
    });
  });

  describe('Level 1 — WhisperNotification', () => {
    it('renders subtle tray notification with role="status" and message', () => {
      const html = renderToString(
        <WhisperNotification message="Psst... gentle posture check" ribbitState="encouraging" />
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('Psst... gentle posture check');
      expect(html).toContain('width:32px');
      expect(html).toContain('height:32px');
    });

    it('supports inline positioning without fixed positioning collision', () => {
      const html = renderToString(
        <WhisperNotification message="Inline notification" position="inline" />
      );
      expect(html).toContain('static');
      expect(html).not.toContain('fixed');
    });
  });

  describe('Level 2 — NudgeNotification', () => {
    it('renders toast notification with 48px Ribbit and action buttons', () => {
      const html = renderToString(
        <NudgeNotification
          title="Posture Check!"
          message="Time to lift your chest and roll your shoulders back."
          ribbitState="encouraging"
        />
      );

      expect(html).toContain('Posture Check!');
      expect(html).toContain('Time to lift your chest and roll your shoulders back.');
      expect(html).toContain('width:48px');
      expect(html).toContain('height:48px');
      expect(html).toContain('Got it!');
      expect(html).toContain('Snooze');
      expect(html).toContain('border-l-4');
    });

    it('supports inline positioning', () => {
      const html = renderToString(
        <NudgeNotification message="Inline nudge" position="inline" />
      );
      expect(html).toContain('static');
      expect(html).not.toContain('fixed');
    });
  });

  describe('Level 3 — ReminderNotification', () => {
    it('renders prominent banner notification with 64px Ribbit and glowing border', () => {
      const html = renderToString(
        <ReminderNotification
          title="Posture Check Reminder"
          message="Don't slouch into the keyboard! Align your neck."
          ribbitState="reminding"
        />
      );

      expect(html).toContain('Posture Check Reminder');
      expect(html).toContain("Don&#x27;t slouch into the keyboard! Align your neck.");
      expect(html).toContain('width:64px');
      expect(html).toContain('height:64px');
      expect(html).toContain('✓ Sitting up!');
      expect(html).toContain('💤 Snooze 5 min');
      expect(html).toContain('animate-pulse-glow');
    });

    it('supports inline positioning', () => {
      const html = renderToString(
        <ReminderNotification message="Inline reminder" position="inline" />
      );
      expect(html).toContain('static');
      expect(html).not.toContain('fixed');
    });
  });
});
