import type { IntensityLevel, MascotTone } from '../types/index';
import { MESSAGE_CATALOG, type MessageCatalogMap } from './catalog';
import {
  ACKNOWLEDGMENT_MESSAGES,
  getStreakMilestoneMessage,
  getRandomAcknowledgmentMessage,
} from './acknowledgments';
import { GOLDEN_FROG_MESSAGES, getRandomGoldenFrogMessage } from './golden-frog';

export interface MessageRotationEngineOptions {
  catalog?: MessageCatalogMap;
  maxRecentHistory?: number;
  acknowledgments?: readonly string[];
  goldenFrogMessages?: readonly string[];
}

/**
 * MessageRotationEngine manages the selection and delivery of personality-driven
 * reminder messages, acknowledgment responses, and streak celebrations.
 *
 * It enforces a sliding memory buffer (default: 5 messages) to guarantee no
 * immediate back-to-back repeats and maintain high message variety across checks.
 */
export class MessageRotationEngine {
  private catalog: MessageCatalogMap;
  private recentMessages: string[] = [];
  private readonly maxRecentHistory: number;
  private acknowledgments: readonly string[];
  private goldenFrogMessages: readonly string[];
  private lastAcknowledgment: string | null = null;

  constructor(options: MessageRotationEngineOptions = {}) {
    this.catalog = options.catalog ?? MESSAGE_CATALOG;
    this.maxRecentHistory = options.maxRecentHistory ?? 5;
    this.acknowledgments = options.acknowledgments ?? ACKNOWLEDGMENT_MESSAGES;
    this.goldenFrogMessages = options.goldenFrogMessages ?? GOLDEN_FROG_MESSAGES;
  }

  /**
   * Retrieves the next reminder message for the given intensity level and mascot tone.
   * If streakDays exceeds 30, selects from the unlocked Golden Frog special message pool.
   * Guarantees no back-to-back repeats by checking recent history.
   *
   * @param level - IntensityLevel (1 to 5)
   * @param tone - MascotTone ('encouraging' | 'sassy' | 'minimal')
   * @param streakDays - Optional consecutive days streak count
   * @returns Formatted reminder message string
   */
  public getNextMessage(
    level: IntensityLevel,
    tone: MascotTone = 'encouraging',
    streakDays?: number
  ): string {
    // 1. Golden frog unlock check (>30 days streak)
    if (streakDays !== undefined && streakDays > 30) {
      return this.selectFromPool(this.goldenFrogMessages);
    }

    // 2. Resolve pool for intensity level and tone
    const levelPools = this.catalog[level] ?? this.catalog[2];
    const pool = levelPools[tone] ?? levelPools.encouraging;

    if (!pool || pool.length === 0) {
      return 'Ribbit! Time for a quick posture check 🐸';
    }

    return this.selectFromPool(pool);
  }

  /**
   * Selects a random message from the pool, avoiding recent messages in history.
   * Automatically resets or prunes history if the pool is exhausted.
   */
  private selectFromPool(pool: readonly string[]): string {
    // Filter out candidates currently in recent history
    let candidates = pool.filter((msg) => !this.recentMessages.includes(msg));

    // If pool is exhausted (all messages shown recently), reset tracker
    if (candidates.length === 0) {
      const lastShown = this.recentMessages[this.recentMessages.length - 1];
      this.recentMessages = [];
      // Even upon reset, ensure no immediate identical back-to-back repeat if pool > 1
      candidates = pool.length > 1 && lastShown ? pool.filter((m) => m !== lastShown) : [...pool];
      if (candidates.length === 0) {
        candidates = [...pool];
      }
    }

    // Random selection among eligible candidates
    const selected = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];

    // Track recently shown message
    this.recentMessages.push(selected);
    if (this.recentMessages.length > this.maxRecentHistory) {
      this.recentMessages.shift();
    }

    return selected;
  }

  /**
   * Returns a positive response message for when the user acknowledges a reminder.
   */
  public getAcknowledgmentMessage(): string {
    const msg = getRandomAcknowledgmentMessage(this.lastAcknowledgment ?? undefined);
    this.lastAcknowledgment = msg;
    return msg;
  }

  /**
   * Returns a streak-specific celebration message.
   * @param streakDays - Number of consecutive streak days
   */
  public getStreakMessage(streakDays: number): string {
    return getStreakMilestoneMessage(streakDays);
  }

  /**
   * Returns a special Golden Frog message directly.
   */
  public getGoldenFrogMessage(): string {
    return getRandomGoldenFrogMessage(this.recentMessages[this.recentMessages.length - 1]);
  }

  /**
   * Returns an array of recent messages tracked by the rotation engine.
   */
  public getRecentMessages(): readonly string[] {
    return [...this.recentMessages];
  }

  /**
   * Resets the recent messages history buffer.
   */
  public reset(): void {
    this.recentMessages = [];
    this.lastAcknowledgment = null;
  }
}

/**
 * Default global singleton instance of MessageRotationEngine.
 */
export const defaultRotationEngine = new MessageRotationEngine();
