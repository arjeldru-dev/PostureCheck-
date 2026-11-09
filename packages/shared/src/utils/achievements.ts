import { ACHIEVEMENTS } from '../constants/index';
import type { Achievement } from '../types/index';

/**
 * Achievement detection engine (Feature 3.7 — Achievements).
 *
 * Pure and platform-agnostic: the same rules run on desktop and mobile.
 * Persistence, XP grants and UI side effects live in the app stores.
 */

export type AchievementId =
  | 'first_ribbit'
  | 'week_warrior'
  | 'month_master'
  | 'early_bird'
  | 'night_owl'
  | 'perfect_day'
  | 'phone_friend'
  | 'customizer'
  | 'centurion'
  | 'frog_whisperer';

export type AchievementCategory = 'milestones' | 'habits' | 'actions';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  conditionType: Achievement['condition_type'];
  conditionValue: number;
  category: AchievementCategory;
  /** Short "how to earn it" text shown on locked badges. */
  hint: string;
}

/** Early Bird window (local time): [4 AM, 7 AM). Earlier hours are "still up", not early. */
export const EARLY_BIRD_START_HOUR = 4;
export const EARLY_BIRD_END_HOUR = 7;
/** Local hour from which an acknowledgment counts for Night Owl (11 PM). */
export const NIGHT_OWL_HOUR = 23;
/**
 * Minimum reminders in a day before Perfect Day can unlock, so that a single
 * 1-of-1 acknowledgment first thing in the morning doesn't count as a "day".
 */
export const PERFECT_DAY_MIN_CHECKS = 3;

const CATEGORY_BY_ID: Record<AchievementId, AchievementCategory> = {
  first_ribbit: 'milestones',
  centurion: 'milestones',
  frog_whisperer: 'milestones',
  week_warrior: 'habits',
  month_master: 'habits',
  perfect_day: 'habits',
  early_bird: 'habits',
  night_owl: 'habits',
  customizer: 'actions',
  phone_friend: 'actions',
};

const HINT_BY_ID: Record<AchievementId, string> = {
  first_ribbit: 'Acknowledge any posture reminder.',
  week_warrior: 'Keep your posture streak going for 7 days in a row.',
  month_master: 'Keep your posture streak going for 30 days in a row.',
  early_bird: 'Acknowledge a reminder between 4 AM and 7 AM.',
  night_owl: 'Acknowledge a reminder at or after 11 PM.',
  perfect_day: `Acknowledge every reminder in a day without snoozing (at least ${PERFECT_DAY_MIN_CHECKS}).`,
  phone_friend: 'Set up PC-to-phone reminder routing.',
  customizer: 'Change your notification intensity in Settings.',
  centurion: 'Acknowledge 100 reminders in total.',
  frog_whisperer: 'Reach Level 10.',
};

function assertAchievementId(id: string): asserts id is AchievementId {
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_BY_ID, id) ||
      !Object.prototype.hasOwnProperty.call(HINT_BY_ID, id)) {
    // Fail fast (at import time, so in every test run) instead of silently
    // rendering a badge with no category or hint.
    throw new Error(
      `Achievement "${id}" is in ACHIEVEMENTS but missing from CATEGORY_BY_ID / HINT_BY_ID`
    );
  }
}

/** The 10 achievements, in display order, with camelCase fields. */
export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = ACHIEVEMENTS.map(
  (a) => {
    const id: string = a.id;
    assertAchievementId(id);
    return {
      id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      xpReward: a.xp_reward,
      conditionType: a.condition_type,
      conditionValue: a.condition_value,
      category: CATEGORY_BY_ID[id],
      hint: HINT_BY_ID[id],
    };
  }
);

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  milestones: 'Milestones',
  habits: 'Habits',
  actions: 'Actions',
};

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
}

/** Snapshot of the gamification state the detector reads. */
export interface GameState {
  /** IDs already unlocked; these are never returned again. */
  unlockedIds: ReadonlySet<string> | readonly string[];
  /** Lifetime acknowledged reminders (including the one just acknowledged). */
  totalChecks: number;
  currentStreak: number;
  currentLevel: number;
  /** Reminders fired today (local day). */
  todayChecks: number;
  /** Reminders acknowledged today (local day). */
  todayAcknowledged: number;
}

/**
 * The event that just happened.
 *
 * `sync` re-evaluates only the state-based conditions (streak / total / level);
 * use it on app start to backfill anything already earned.
 */
export type GameAction =
  | { type: 'acknowledge'; at?: Date | string }
  | { type: 'streak_update'; at?: Date | string }
  | { type: 'level_up'; at?: Date | string }
  | { type: 'setting_change'; setting: string; at?: Date | string }
  | { type: 'phone_routing_setup'; at?: Date | string }
  | { type: 'sync'; at?: Date | string };

export interface AchievementUnlock {
  achievement: AchievementDefinition;
  /** UTC ISO-8601 timestamp of the unlock. */
  unlockedAt: string;
}

function toDate(at: Date | string | undefined): Date {
  if (at instanceof Date) return at;
  if (typeof at === 'string') {
    const parsed = new Date(at);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Is the condition for `id` met by this state + action?
 *
 * State-based conditions (streak, total checks, level) are evaluated on every
 * action: they only depend on the numbers, so checking them more often can't
 * produce a false unlock, and it catches cases where e.g. achievement XP
 * itself pushes the user over Level 10.
 *
 * Action-based conditions only fire on their own action. Time-of-day checks
 * use the *local* hour, not UTC.
 */
function isConditionMet(
  def: AchievementDefinition,
  state: GameState,
  action: GameAction,
  when: Date
): boolean {
  switch (def.conditionType) {
    case 'streak':
      return state.currentStreak >= def.conditionValue;
    case 'total_checks':
      return state.totalChecks >= def.conditionValue;
    case 'level':
      return state.currentLevel >= def.conditionValue;
    case 'action':
      break;
  }

  switch (def.id) {
    case 'first_ribbit':
      return action.type === 'acknowledge' && state.totalChecks >= 1;
    case 'early_bird':
      return (
        action.type === 'acknowledge' &&
        when.getHours() >= EARLY_BIRD_START_HOUR &&
        when.getHours() < EARLY_BIRD_END_HOUR
      );
    case 'night_owl':
      return action.type === 'acknowledge' && when.getHours() >= NIGHT_OWL_HOUR;
    case 'perfect_day':
      return (
        action.type === 'acknowledge' &&
        state.todayChecks >= PERFECT_DAY_MIN_CHECKS &&
        state.todayAcknowledged >= state.todayChecks
      );
    case 'customizer':
      return action.type === 'setting_change' && action.setting === 'intensity';
    case 'phone_friend':
      return action.type === 'phone_routing_setup';
    default:
      return false;
  }
}

/**
 * Returns the achievements newly unlocked by `action` given `state`.
 *
 * Idempotent: anything in `state.unlockedIds` is skipped, so calling this
 * twice with the same input never yields the same achievement twice once the
 * caller records the first result.
 */
export function checkAchievements(state: GameState, action: GameAction): AchievementUnlock[] {
  const unlocked =
    state.unlockedIds instanceof Set
      ? (state.unlockedIds as ReadonlySet<string>)
      : new Set(state.unlockedIds as readonly string[]);
  const when = toDate(action.at);
  const unlockedAt = when.toISOString();

  return ACHIEVEMENT_DEFINITIONS.filter(
    (def) => !unlocked.has(def.id) && isConditionMet(def, state, action, when)
  ).map((achievement) => ({ achievement, unlockedAt }));
}
