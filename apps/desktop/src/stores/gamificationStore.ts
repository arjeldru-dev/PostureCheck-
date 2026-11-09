import { create } from 'zustand';
import {
  calculateLevelFromXp,
  calculateStreakBonus,
  calculateDailyCompletionBonus,
  calculateXpForAcknowledge,
  getXpToNextLevel,
  shouldStreakBreak,
  getStreakMilestone,
  formatLocalDate,
  getYesterdayLocalDate,
  getIsoWeekKey,
  calculatePostureScore,
  checkAchievements,
  isStreakFreezeAvailable,
  type AchievementDefinition,
  type AchievementUnlock,
  type GameAction,
  type GameState,
} from '@posture-check/shared';
import {
  getProgress,
  getTodayStats,
  getAchievements,
  unlockAchievement,
  addXpBackend,
  patchProgress,
  subscribeToProgressUpdated,
  subscribeToNotificationAcknowledged,
  isTauriEnvironment,
  type NotificationAcknowledgedPayload,
  type UserProgressPayload,
} from '@/lib/tauri';
import { emit } from '@tauri-apps/api/event';

export interface XpGainInfo {
  amount: number;
  source: string;
  timestamp: string;
}

export interface LevelUpPayload {
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  totalXp: number;
}

export interface XpGainedPayload {
  amount: number;
  source: string;
  totalXp: number;
}

export interface StreakMilestonePayload {
  streak: number;
}

export interface StreakBrokenPayload {
  previousStreak: number;
}

export interface AchievementUnlockedPayload {
  achievementId: AchievementDefinition['id'];
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  /** UTC ISO-8601 */
  unlockedAt: string;
}

export interface AcknowledgeResult {
  baseEarned: number;
  streakBonus: number;
  dailyBonus: number;
  totalEarned: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  streak: number;
  streakMilestone: number | null;
}

export interface AddXpResult {
  previousXp: number;
  newXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
}

export interface GamificationState {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  progressPercent: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalChecks: number;
  /** Derived: Level 5+ and no freeze used in the current ISO week. */
  streakFreezeAvailable: boolean;
  freezeUsedThisWeek: boolean;
  /** ISO week key of the last freeze use (persisted in SQLite). */
  lastFreezeWeek: string | null;
  lastCheckDate: string | null;
  lastEvaluatedDate: string;
  todayChecksCount: number;
  todayAcknowledgedCount: number;
  // Aliases for convenience matching spec
  todayChecks: number;
  todayAcknowledged: number;

  /** Unlocked achievement IDs → UTC unlock timestamp. */
  unlockedAchievements: Record<string, string>;
  /** Set when loading achievements from SQLite failed (gallery shows a retry). */
  achievementsError: string | null;
  /**
   * Unlocks Ribbit hasn't celebrated yet. Kept in the store so a celebration
   * isn't lost when the Dashboard (where Ribbit lives) isn't mounted.
   */
  pendingCelebrations: AchievementUnlockedPayload[];

  isInitialized: boolean;
  isLoading: boolean;
  lastXpGain: XpGainInfo | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  addXp: (amount: number, source: string) => Promise<AddXpResult>;
  handleAcknowledge: () => Promise<AcknowledgeResult>;
  /**
   * Called for every `notification-acknowledged` event (the Rust backend has
   * already awarded XP/streak). Refreshes counts and evaluates achievements.
   */
  handleBackendAcknowledged: (payload: NotificationAcknowledgedPayload) => Promise<void>;
  /** Load unlocks from SQLite. Returns false (and sets `achievementsError`) on failure. */
  loadAchievements: () => Promise<boolean>;
  /**
   * Run the shared detection engine for `action`, persist any new unlocks
   * (unlock + XP grant are one SQLite transaction) and emit
   * `achievement-unlocked`. Calls are serialized.
   */
  evaluateAchievements: (action: GameAction) => Promise<AchievementUnlock[]>;
  /** Returns and clears the unlocks waiting for a Ribbit celebration. */
  consumeCelebrations: () => AchievementUnlockedPayload[];
  syncWithProgress: (progress: UserProgressPayload) => void;
  checkStreakStatus: () => Promise<{
    streak: number;
    broken: boolean;
    freezeUsed: boolean;
  }>;
  useStreakFreeze: () => Promise<boolean>;
  resetWeeklyFreeze: () => Promise<void>;
  scheduleMidnightCheck: () => void;
  reconcileSleepWakeRollover: () => Promise<void>;
  reset: () => void;
}

const initialLevelInfo = calculateLevelFromXp(0);

// Subscriptions are stored as promises and assigned synchronously, so a
// second `initialize()` (e.g. React StrictMode) can't subscribe twice.
let progressSubscription: Promise<() => void> | null = null;
let ackSubscription: Promise<() => void> | null = null;
// Serializes achievement evaluation so concurrent triggers can't double-grant XP.
let achievementQueue: Promise<unknown> = Promise.resolve();
let midnightTimerId: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimerId: ReturnType<typeof setInterval> | null = null;
let isSleepWakeListenersAttached = false;

function dispatchAppEvent<T>(name: string, payload: T) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }
  if (isTauriEnvironment()) {
    emit(name, payload).catch((e) => {
      console.warn(`Failed to emit ${name} Tauri event:`, e);
    });
  }
}

function deriveFreezeState(level: number, lastFreezeWeek: string | null) {
  return {
    streakFreezeAvailable: isStreakFreezeAvailable(level, lastFreezeWeek),
    freezeUsedThisWeek: lastFreezeWeek === getIsoWeekKey(),
  };
}

export const useGamificationStore = create<GamificationState>((set, get) => {
  /**
   * Apply an XP gain to the store and emit `xp-gained` / `level-up`.
   * With `authoritative` (the SQLite row after an atomic increment) the
   * totals come from the database; otherwise (browser/test mode) the gain
   * is applied to the store's own total.
   */
  const applyXpGain = (
    amount: number,
    source: string,
    authoritative: UserProgressPayload | null
  ): AddXpResult => {
    const oldLevel = get().currentLevel;
    const newXp = authoritative ? authoritative.totalXp : get().totalXp + amount;
    const previousXp = Math.max(0, newXp - amount);
    const levelInfo = calculateLevelFromXp(newXp);
    const leveledUp = levelInfo.level > oldLevel;
    const lastFreezeWeek =
      authoritative && authoritative.lastFreezeWeek !== undefined
        ? authoritative.lastFreezeWeek ?? null
        : get().lastFreezeWeek;

    set({
      totalXp: newXp,
      currentLevel: levelInfo.level,
      levelTitle: levelInfo.title,
      progressPercent: levelInfo.progressPercent,
      xpToNextLevel: getXpToNextLevel(newXp),
      lastFreezeWeek,
      ...deriveFreezeState(levelInfo.level, lastFreezeWeek),
      lastXpGain: { amount, source, timestamp: new Date().toISOString() },
    });

    dispatchAppEvent<XpGainedPayload>('xp-gained', { amount, source, totalXp: newXp });

    if (leveledUp) {
      dispatchAppEvent<LevelUpPayload>('level-up', {
        oldLevel,
        newLevel: levelInfo.level,
        newTitle: levelInfo.title,
        totalXp: newXp,
      });
    }

    return {
      previousXp,
      newXp,
      leveledUp,
      oldLevel,
      newLevel: levelInfo.level,
      newTitle: levelInfo.title,
    };
  };

  return {
    totalXp: 0,
    currentLevel: initialLevelInfo.level,
    levelTitle: initialLevelInfo.title,
    progressPercent: initialLevelInfo.progressPercent,
    xpToNextLevel: getXpToNextLevel(0),
    currentStreak: 0,
    longestStreak: 0,
    totalChecks: 0,
    streakFreezeAvailable: false,
    freezeUsedThisWeek: false,
    lastFreezeWeek: null,
    lastCheckDate: null,
    lastEvaluatedDate: formatLocalDate(),
    todayChecksCount: 0,
    todayAcknowledgedCount: 0,
    todayChecks: 0,
    todayAcknowledged: 0,
    unlockedAchievements: {},
    achievementsError: null,
    pendingCelebrations: [],
    isInitialized: false,
    isLoading: false,
    lastXpGain: null,
    error: null,

    initialize: async () => {
      set({ isLoading: true, error: null });
      try {
        const [progress, todayStats] = await Promise.all([
          getProgress(),
          getTodayStats().catch(() => null),
          get().loadAchievements(),
        ]);

        const levelInfo = calculateLevelFromXp(progress.totalXp);
        const todayChecks = todayStats?.totalChecksToday ?? 0;
        const todayAcknowledged = todayStats?.acknowledgedToday ?? 0;
        const lastFreezeWeek = progress.lastFreezeWeek ?? null;

        set({
          totalXp: progress.totalXp,
          currentLevel: levelInfo.level,
          levelTitle: levelInfo.title,
          progressPercent: levelInfo.progressPercent,
          xpToNextLevel: getXpToNextLevel(progress.totalXp),
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          totalChecks: progress.totalChecks,
          lastFreezeWeek,
          ...deriveFreezeState(levelInfo.level, lastFreezeWeek),
          lastCheckDate: progress.lastCheckDate ?? null,
          lastEvaluatedDate: formatLocalDate(),
          todayChecksCount: todayChecks,
          todayAcknowledgedCount: todayAcknowledged,
          todayChecks,
          todayAcknowledged,
          isInitialized: true,
          isLoading: false,
        });

        // Progress changed by the backend itself (Rust acknowledgment)
        if (!progressSubscription) {
          progressSubscription = subscribeToProgressUpdated((updated) => {
            get().syncWithProgress(updated);
          });
        }

        // Reminders acknowledged anywhere (dashboard, OS toast, overlay window)
        // are processed by Rust, which then emits `notification-acknowledged`.
        if (!ackSubscription) {
          ackSubscription = subscribeToNotificationAcknowledged((payload) => {
            get()
              .handleBackendAcknowledged(payload)
              .catch((err) =>
                console.error('Failed to evaluate achievements after acknowledgment:', err)
              );
          });
        }

        // Check streak continuity on app startup
        await get().checkStreakStatus();

        // Backfill state-based achievements (streak / total / level) already earned
        await get().evaluateAchievements({ type: 'sync' });

        // Schedule midnight check and sleep/wake recovery listeners
        get().scheduleMidnightCheck();

        // Setup window focus / visibility wake-up listener once
        if (typeof window !== 'undefined' && !isSleepWakeListenersAttached) {
          isSleepWakeListenersAttached = true;
          const handleWake = () => {
            get().reconcileSleepWakeRollover().catch(console.error);
          };
          window.addEventListener('focus', handleWake);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              handleWake();
            }
          });

          // 15-minute background heartbeat to recover gracefully from deep OS sleep
          if (!heartbeatTimerId) {
            heartbeatTimerId = setInterval(() => {
              get().reconcileSleepWakeRollover().catch(console.error);
            }, 15 * 60 * 1000);
          }
        }
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    handleBackendAcknowledged: async (payload) => {
      // Test notifications never count toward XP, stats or achievements
      if (payload.isTest) return;

      const [fresh, stats] = await Promise.all([
        getProgress(),
        getTodayStats().catch(() => null),
      ]);
      get().syncWithProgress(fresh);
      if (stats) {
        set({
          todayChecksCount: stats.totalChecksToday,
          todayAcknowledgedCount: stats.acknowledgedToday,
          todayChecks: stats.totalChecksToday,
          todayAcknowledged: stats.acknowledgedToday,
        });
      }
      await get().evaluateAchievements({ type: 'acknowledge', at: new Date() });
    },

    checkStreakStatus: async () => {
      const { currentLevel, lastFreezeWeek } = get();

      const todayStr = formatLocalDate();
      const currentWeek = getIsoWeekKey();

      // A new ISO week makes the freeze available again (derived, nothing to persist)
      if (currentLevel >= 5 && lastFreezeWeek && lastFreezeWeek !== currentWeek) {
        await get().resetWeeklyFreeze();
      }

      const { currentStreak, streakFreezeAvailable, lastCheckDate } = get();

      if (currentStreak === 0) {
        return { streak: 0, broken: false, freezeUsed: false };
      }

      const check = shouldStreakBreak(lastCheckDate, todayStr, streakFreezeAvailable);

      if (check.broken) {
        const previousStreak = currentStreak;
        set({ currentStreak: 0, lastEvaluatedDate: todayStr });

        dispatchAppEvent<StreakBrokenPayload>('streak-broken', { previousStreak });

        patchProgress({ currentStreak: 0 }).catch((err) => {
          console.error('Failed to persist broken streak to SQLite:', err);
        });

        return { streak: 0, broken: true, freezeUsed: false };
      }

      if (check.freezeUsed) {
        // Consumed this week's freeze to protect yesterday's missed day.
        // Advance lastCheckDate to yesterday so later checks today don't re-break.
        const yesterdayStr = getYesterdayLocalDate();

        set({
          streakFreezeAvailable: false,
          freezeUsedThisWeek: true,
          lastFreezeWeek: currentWeek,
          lastCheckDate: yesterdayStr,
          lastEvaluatedDate: todayStr,
        });

        dispatchAppEvent('streak-freeze-used', { streak: currentStreak });

        patchProgress({ lastFreezeWeek: currentWeek, lastCheckDate: yesterdayStr }).catch(
          (err) => {
            console.error('Failed to persist used freeze to SQLite:', err);
          }
        );

        return { streak: currentStreak, broken: false, freezeUsed: true };
      }

      set({ lastEvaluatedDate: todayStr });
      return { streak: currentStreak, broken: false, freezeUsed: false };
    },

    useStreakFreeze: async () => {
      const { streakFreezeAvailable } = get();
      if (!streakFreezeAvailable) return false;

      const currentWeek = getIsoWeekKey();
      set({
        streakFreezeAvailable: false,
        freezeUsedThisWeek: true,
        lastFreezeWeek: currentWeek,
      });

      await patchProgress({ lastFreezeWeek: currentWeek }).catch((err) => {
        console.error('Failed to persist used freeze:', err);
      });

      return true;
    },

    resetWeeklyFreeze: async () => {
      // Availability is derived from the persisted freeze week, so a new week
      // needs no write — just recompute.
      const { currentLevel } = get();
      if (currentLevel >= 5) {
        set({ streakFreezeAvailable: true, freezeUsedThisWeek: false });
      }
    },

    reconcileSleepWakeRollover: async () => {
      const todayStr = formatLocalDate();
      if (get().lastEvaluatedDate !== todayStr) {
        // Calendar date rolled over while machine was sleeping or suspended
        await get().checkStreakStatus();
        set({
          lastEvaluatedDate: todayStr,
          todayChecksCount: 0,
          todayAcknowledgedCount: 0,
          todayChecks: 0,
          todayAcknowledged: 0,
        });
        get().scheduleMidnightCheck();
      }
      // Safety net: if any acknowledgment event was missed while the window
      // was hidden, state-based achievements still unlock on wake/focus.
      if (get().isInitialized) {
        await get().evaluateAchievements({ type: 'sync' });
      }
    },

    scheduleMidnightCheck: () => {
      if (midnightTimerId) {
        clearTimeout(midnightTimerId);
        midnightTimerId = null;
      }

      const now = new Date();
      // Use local constructor which inherently handles DST transition offsets
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        2 // 2 seconds past midnight to ensure date increment
      );

      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

      midnightTimerId = setTimeout(async () => {
        // 1. Evaluate yesterday's streak continuity
        await get().checkStreakStatus();

        // 2. Reset daily counts for the new calendar day
        set({
          lastEvaluatedDate: formatLocalDate(),
          todayChecksCount: 0,
          todayAcknowledgedCount: 0,
          todayChecks: 0,
          todayAcknowledged: 0,
        });

        // 3. Schedule next midnight
        get().scheduleMidnightCheck();
      }, msUntilMidnight);
    },

    addXp: async (amount: number, source: string) => {
      const validAmount = Math.max(0, Math.round(amount));
      // Atomic increment in SQLite; the returned row is authoritative. Outside
      // Tauri this resolves to null and the store applies the gain itself.
      let authoritative: UserProgressPayload | null = null;
      try {
        authoritative = await addXpBackend(validAmount);
      } catch (err) {
        console.error('Failed to persist XP to SQLite:', err);
      }
      return applyXpGain(validAmount, source, authoritative);
    },

    // Store-side acknowledgment (browser mode and tests). In the Tauri app the
    // Rust `acknowledge_reminder` command owns XP, totals and streaks, and the
    // store reacts via `handleBackendAcknowledged`.
    handleAcknowledge: async () => {
      const {
        currentStreak,
        longestStreak,
        todayAcknowledgedCount,
        todayChecksCount,
        lastCheckDate,
      } = get();

      // 1. Base XP
      const baseEarned = calculateXpForAcknowledge();

      // 2. Streak bonus
      const streakBonus = calculateStreakBonus(currentStreak);

      // 3. Daily completion bonus (if acknowledging this reminder completes all checks)
      const nextAckCount = todayAcknowledgedCount + 1;
      const dailyBonus = calculateDailyCompletionBonus(nextAckCount, todayChecksCount);

      const totalEarned = baseEarned + streakBonus + dailyBonus;

      // 4. Update stats in store
      const todayStr = formatLocalDate();
      let newStreak = currentStreak;
      let newLongest = longestStreak;
      let newLastCheckDate = lastCheckDate;

      // Check if acknowledgment satisfies streak goal today (>= 80%)
      const nextRate = calculatePostureScore(nextAckCount, Math.max(1, todayChecksCount));
      if (nextRate >= 80 && lastCheckDate !== todayStr) {
        newStreak = currentStreak + 1;
        newLongest = Math.max(longestStreak, newStreak);
        newLastCheckDate = todayStr;
      }

      const milestone = getStreakMilestone(newStreak);

      set((state) => ({
        totalChecks: state.totalChecks + 1,
        todayAcknowledgedCount: nextAckCount,
        todayAcknowledged: nextAckCount,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckDate: newLastCheckDate,
      }));

      if (milestone && newStreak > currentStreak) {
        dispatchAppEvent<StreakMilestonePayload>('streak-milestone', { streak: milestone });
      }

      // 5. Add XP (atomic increment, level-up detection, events)
      const xpResult = await get().addXp(totalEarned, 'acknowledge');

      // 6. Persist streak bookkeeping (patch; never overwrites XP/totals)
      if (newLastCheckDate) {
        patchProgress({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastCheckDate: newLastCheckDate,
        }).catch((err) => {
          console.error('Failed to persist streak to SQLite:', err);
        });
      }

      // 7. Achievements (may grant extra XP, so read the level afterwards)
      await get().evaluateAchievements({ type: 'acknowledge', at: new Date() });
      const finalLevel = get().currentLevel;

      return {
        baseEarned,
        streakBonus,
        dailyBonus,
        totalEarned,
        leveledUp: finalLevel > xpResult.oldLevel,
        oldLevel: xpResult.oldLevel,
        newLevel: finalLevel,
        newTitle: get().levelTitle,
        streak: newStreak,
        streakMilestone: milestone,
      };
    },

    loadAchievements: async () => {
      try {
        const rows = await getAchievements();
        const fromDb: Record<string, string> = {};
        for (const row of rows) {
          if (row.isUnlocked) {
            fromDb[row.id] = row.unlockedAt ?? new Date().toISOString();
          }
        }
        // Merge rather than replace: an unlock confirmed while this load was
        // in flight must not flicker back to "locked".
        set((st) => ({
          unlockedAchievements: { ...fromDb, ...st.unlockedAchievements },
          achievementsError: null,
        }));
        return true;
      } catch (err) {
        console.error('Failed to load achievements from SQLite:', err);
        set({ achievementsError: err instanceof Error ? err.message : String(err) });
        return false;
      }
    },

    evaluateAchievements: (action: GameAction) => {
      const run = async (): Promise<AchievementUnlock[]> => {
        const granted: AchievementUnlock[] = [];
        let current: GameAction = action;

        // Achievement XP can push the user over a level threshold, which can in
        // turn unlock Frog Whisperer; re-check until nothing new unlocks.
        for (let pass = 0; pass < 4; pass++) {
          const s = get();
          const gameState: GameState = {
            unlockedIds: Object.keys(s.unlockedAchievements),
            totalChecks: s.totalChecks,
            currentStreak: s.currentStreak,
            currentLevel: s.currentLevel,
            todayChecks: s.todayChecksCount,
            todayAcknowledged: s.todayAcknowledgedCount,
          };
          const candidates = checkAchievements(gameState, current);
          if (candidates.length === 0) break;

          let grantedThisPass = 0;
          for (const candidate of candidates) {
            const { achievement } = candidate;
            let result;
            try {
              // Unlock + XP grant happen in one SQLite transaction
              result = await unlockAchievement(achievement.id);
            } catch (err) {
              console.error(`Failed to persist achievement ${achievement.id}:`, err);
              continue;
            }

            const unlockedAt = result.unlockedAt ?? candidate.unlockedAt;
            set((st) => ({
              unlockedAchievements: { ...st.unlockedAchievements, [achievement.id]: unlockedAt },
            }));

            // Already recorded in SQLite (another window or an earlier run): no XP.
            if (!result.newlyUnlocked) continue;

            applyXpGain(result.xpReward, 'achievement', result.progress);

            const payload: AchievementUnlockedPayload = {
              achievementId: achievement.id,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              xpReward: result.xpReward,
              unlockedAt,
            };
            set((st) => ({ pendingCelebrations: [...st.pendingCelebrations, payload] }));
            dispatchAppEvent('achievement-unlocked', payload);

            granted.push({ achievement, unlockedAt });
            grantedThisPass++;
          }

          if (grantedThisPass === 0) break;
          current = { type: 'level_up', at: action.at };
        }

        return granted;
      };

      const next = achievementQueue.then(run, run);
      achievementQueue = next.catch(() => undefined);
      return next;
    },

    consumeCelebrations: () => {
      const pending = get().pendingCelebrations;
      if (pending.length > 0) set({ pendingCelebrations: [] });
      return pending;
    },

    syncWithProgress: (progress: UserProgressPayload) => {
      const prevLevel = get().currentLevel;
      const prevXp = get().totalXp;
      const levelInfo = calculateLevelFromXp(progress.totalXp);
      const leveledUp = levelInfo.level > prevLevel;
      const lastFreezeWeek =
        progress.lastFreezeWeek !== undefined ? progress.lastFreezeWeek ?? null : get().lastFreezeWeek;

      set({
        totalXp: progress.totalXp,
        currentLevel: levelInfo.level,
        levelTitle: levelInfo.title,
        progressPercent: levelInfo.progressPercent,
        xpToNextLevel: getXpToNextLevel(progress.totalXp),
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        totalChecks: progress.totalChecks,
        lastFreezeWeek,
        ...deriveFreezeState(levelInfo.level, lastFreezeWeek),
        lastCheckDate: progress.lastCheckDate ?? null,
      });

      if (progress.totalXp > prevXp && typeof window !== 'undefined') {
        const xpPayload: XpGainedPayload = {
          amount: progress.totalXp - prevXp,
          source: 'acknowledgment',
          totalXp: progress.totalXp,
        };
        window.dispatchEvent(new CustomEvent('xp-gained', { detail: xpPayload }));
      }

      if (leveledUp && typeof window !== 'undefined') {
        const levelPayload: LevelUpPayload = {
          oldLevel: prevLevel,
          newLevel: levelInfo.level,
          newTitle: levelInfo.title,
          totalXp: progress.totalXp,
        };
        window.dispatchEvent(new CustomEvent('level-up', { detail: levelPayload }));
      }
    },

    reset: () => {
      if (midnightTimerId) {
        clearTimeout(midnightTimerId);
        midnightTimerId = null;
      }
      if (heartbeatTimerId) {
        clearInterval(heartbeatTimerId);
        heartbeatTimerId = null;
      }
      const defaultInfo = calculateLevelFromXp(0);
      set({
        totalXp: 0,
        currentLevel: defaultInfo.level,
        levelTitle: defaultInfo.title,
        progressPercent: defaultInfo.progressPercent,
        xpToNextLevel: getXpToNextLevel(0),
        currentStreak: 0,
        longestStreak: 0,
        totalChecks: 0,
        streakFreezeAvailable: false,
        freezeUsedThisWeek: false,
        lastFreezeWeek: null,
        lastCheckDate: null,
        lastEvaluatedDate: formatLocalDate(),
        todayChecksCount: 0,
        todayAcknowledgedCount: 0,
        todayChecks: 0,
        todayAcknowledged: 0,
        unlockedAchievements: {},
        achievementsError: null,
        pendingCelebrations: [],
        isInitialized: false,
        isLoading: false,
        lastXpGain: null,
        error: null,
      });
    },
  };
});
