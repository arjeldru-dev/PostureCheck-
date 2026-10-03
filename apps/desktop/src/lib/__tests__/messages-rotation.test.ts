import { describe, it, expect, beforeEach } from 'vitest';
import {
  MessageRotationEngine,
  MESSAGE_CATALOG,
  ACKNOWLEDGMENT_MESSAGES,
  GOLDEN_FROG_MESSAGES,
  STREAK_MILESTONES,
  getRandomAcknowledgmentMessage,
  getRandomGoldenFrogMessage,
  type IntensityLevel,
  type MascotTone,
} from '@posture-check/shared';

describe('Message Rotation System (@posture-check/shared)', () => {
  let engine: MessageRotationEngine;

  beforeEach(() => {
    engine = new MessageRotationEngine();
  });

  describe('Message Catalog Completeness', () => {
    it('contains minimum required message counts per level and tone', () => {
      const levels: IntensityLevel[] = [1, 2, 3, 4, 5];
      const tones: MascotTone[] = ['encouraging', 'sassy', 'minimal'];

      const minCounts: Record<IntensityLevel, number> = {
        1: 10,
        2: 12,
        3: 12,
        4: 8,
        5: 6,
      };

      levels.forEach((lvl) => {
        tones.forEach((tone) => {
          const pool = MESSAGE_CATALOG[lvl][tone];
          expect(
            pool.length,
            `Expected Level ${lvl} tone '${tone}' to have >= ${minCounts[lvl]} messages, got ${pool.length}`
          ).toBeGreaterThanOrEqual(minCounts[lvl]);
        });
      });
    });

    it('has over 50+ total unique messages across all levels and tones', () => {
      const allMessages = new Set<string>();
      ([1, 2, 3, 4, 5] as IntensityLevel[]).forEach((lvl) => {
        (['encouraging', 'sassy', 'minimal'] as MascotTone[]).forEach((tone) => {
          MESSAGE_CATALOG[lvl][tone].forEach((msg) => allMessages.add(msg));
        });
      });
      expect(allMessages.size).toBeGreaterThan(100);
    });
  });

  describe('MessageRotationEngine - getNextMessage', () => {
    it('returns a Level 2 encouraging message when requested', () => {
      const msg = engine.getNextMessage(2, 'encouraging');
      expect(MESSAGE_CATALOG[2].encouraging).toContain(msg);
    });

    it('returns level-appropriate messages for all 5 levels', () => {
      ([1, 2, 3, 4, 5] as IntensityLevel[]).forEach((level) => {
        const msg = engine.getNextMessage(level, 'sassy');
        expect(MESSAGE_CATALOG[level].sassy).toContain(msg);
      });
    });

    it('never repeats back-to-back when called 10 times consecutively', () => {
      let previousMessage = '';
      for (let i = 0; i < 10; i++) {
        const currentMessage = engine.getNextMessage(2, 'encouraging');
        expect(currentMessage).not.toBe(previousMessage);
        previousMessage = currentMessage;
      }
    });

    it('enforces a sliding window buffer of at least 5 messages before repeat', () => {
      const shownSequence: string[] = [];
      for (let i = 0; i < 6; i++) {
        const msg = engine.getNextMessage(2, 'encouraging');
        shownSequence.push(msg);
      }
      // Check that among the first 5 messages, all are distinct
      const firstFive = shownSequence.slice(0, 5);
      const uniqueFirstFive = new Set(firstFive);
      expect(uniqueFirstFive.size).toBe(5);
    });

    it('unlocks Golden Frog special messages when streakDays > 30', () => {
      const regularMsg = engine.getNextMessage(3, 'encouraging', 15);
      expect(MESSAGE_CATALOG[3].encouraging).toContain(regularMsg);

      const goldenMsg = engine.getNextMessage(3, 'encouraging', 31);
      expect(GOLDEN_FROG_MESSAGES).toContain(goldenMsg);
    });
  });

  describe('Acknowledgment & Streak Messages', () => {
    it('returns a positive acknowledgment message', () => {
      const ack = engine.getAcknowledgmentMessage();
      expect(ACKNOWLEDGMENT_MESSAGES).toContain(ack);
      expect(ack.length).toBeGreaterThan(5);
    });

    it('returns appropriate streak celebration messages', () => {
      expect(engine.getStreakMessage(7)).toBe(STREAK_MILESTONES[7]);
      expect(engine.getStreakMessage(14)).toBe(STREAK_MILESTONES[14]);
      expect(engine.getStreakMessage(30)).toBe(STREAK_MILESTONES[30]);
      expect(engine.getStreakMessage(100)).toBe(STREAK_MILESTONES[100]);

      // Arbitrary day streak
      const day5Msg = engine.getStreakMessage(5);
      expect(day5Msg).toContain('5-day streak');
    });
  });

  describe('Helper Functions & Golden Frog Messages', () => {
    it('getRandomAcknowledgmentMessage avoids immediate repeat when possible', () => {
      const first = getRandomAcknowledgmentMessage();
      const second = getRandomAcknowledgmentMessage(first);
      if (ACKNOWLEDGMENT_MESSAGES.length > 1) {
        expect(second).not.toBe(first);
      }
    });

    it('getRandomGoldenFrogMessage avoids immediate repeat when possible', () => {
      const first = getRandomGoldenFrogMessage();
      const second = getRandomGoldenFrogMessage(first);
      if (GOLDEN_FROG_MESSAGES.length > 1) {
        expect(second).not.toBe(first);
      }
    });
  });
});
