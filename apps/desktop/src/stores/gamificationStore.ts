import { create } from 'zustand';
import {
  calculateLevelFromXp,
  calculateStreakBonus,
  calculateDailyCompletionBonus,
  calculateXpForAcknowledge,
  getXpToNextLevel,
  isLevelUp,
  shouldStreakBreak,
  getStreakMilestone,
  formatLocalDate,
  getYesterdayLocalDate,
  getIsoWeekKey,
  calculatePostureScore,
} from '@posture-check/shared';
import {
  getProgress,
  getTodayStats,
  updateProgress,
  subscribeToProgressUpdated,
  isTauriEnvironment,
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

export interface GamificationState {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  progressPercent: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalChecks: number;
  streakFreezeAvailable: boolean;
  freezeUsedThisWeek: boolean;
  lastFreezeWeek: string | null;
  lastCheckDate: string | null;
  lastEvaluatedDate: string;
  todayChecksCount: number;
  todayAcknowledgedCount: number;
  // Aliases for convenience matching spec
  todayChecks: number;
  todayAcknowledged: number;

  isInitialized: boolean;
  isLoading: boolean;
  lastXpGain: XpGainInfo | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  addXp: (amount: number, source: string) => Promise<{
    previousXp: number;
    newXp: number;
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newTitle: string;
  }>;
  handleAcknowledge: () => Promise<AcknowledgeResult>;
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

let unlistenProgressUpdated: (() => void) | null = null;
let midnightTimerId: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimerId: ReturnType<typeof setInterval> | null = null;
let isSleepWakeListenersAttached = false;

export const useGamificationStore = create<GamificationState>((set, get) => ({
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
      ]);

      const levelInfo = calculateLevelFromXp(progress.totalXp);
      const todayChecks = todayStats?.totalChecksToday ?? 0;
      const todayAcknowledged = todayStats?.acknowledgedToday ?? 0;
      const currentWeek = getIsoWeekKey();

      // Check weekly freeze: resets in any new ISO week if user is Level 5+
      const storedFreezeWeek = get().lastFreezeWeek;
      const freezeUsedInCurrentWeek = storedFreezeWeek === currentWeek;
      const streakFreezeAvailable =
        progress.streakFreezeAvailable ||
        (levelInfo.level >= 5 && !freezeUsedInCurrentWeek);

      set({
        totalXp: progress.totalXp,
        currentLevel: levelInfo.level,
        levelTitle: levelInfo.title,
        progressPercent: levelInfo.progressPercent,
        xpToNextLevel: getXpToNextLevel(progress.totalXp),
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        totalChecks: progress.totalChecks,
        streakFreezeAvailable,
        freezeUsedThisWeek: freezeUsedInCurrentWeek,
        lastCheckDate: progress.lastCheckDate ?? null,
        lastEvaluatedDate: formatLocalDate(),
        todayChecksCount: todayChecks,
        todayAcknowledgedCount: todayAcknowledged,
        todayChecks,
        todayAcknowledged,
        isInitialized: true,
        isLoading: false,
      });

      // Subscribe to external/background progress updates if not already subscribed
      if (!unlistenProgressUpdated) {
        subscribeToProgressUpdated((updated) => {
          get().syncWithProgress(updated);
        }).then((cleanup) => {
          unlistenProgressUpdated = cleanup;
        });
      }

      // Check streak continuity on app startup
      await get().checkStreakStatus();

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

  checkStreakStatus: async () => {
    const {
      currentStreak,
      streakFreezeAvailable,
      lastCheckDate,
      currentLevel,
      lastFreezeWeek,
    } = get();

    const todayStr = formatLocalDate();
    const currentWeek = getIsoWeekKey();

    // Check if a new calendar week arrived; reset freeze if Level 5+
    if (currentLevel >= 5 && lastFreezeWeek && lastFreezeWeek !== currentWeek) {
      await get().resetWeeklyFreeze();
    }

    if (currentStreak === 0) {
      return { streak: 0, broken: false, freezeUsed: false };
    }

    const check = shouldStreakBreak(lastCheckDate, todayStr, streakFreezeAvailable);

    if (check.broken) {
      // Streak broken
      const previousStreak = currentStreak;
      set({ currentStreak: 0, lastEvaluatedDate: todayStr });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('streak-broken', { detail: { previousStreak } })
        );
      }
      if (isTauriEnvironment()) {
        emit('streak-broken', { previousStreak }).catch((e) => {
          console.warn('Failed to emit streak-broken event:', e);
        });
      }

      updateProgress({ currentStreak: 0 }).catch((err) => {
        console.error('Failed to persist broken streak to SQLite:', err);
      });

      return { streak: 0, broken: true, freezeUsed: false };
    }

    if (check.freezeUsed) {
      // Consumed weekly streak freeze to protect yesterday's missed day
      // Advance lastCheckDate to yesterday to bridge the gap and prevent subsequent re-breaking today!
      const yesterdayStr = getYesterdayLocalDate();

      set({
        streakFreezeAvailable: false,
        freezeUsedThisWeek: true,
        lastFreezeWeek: currentWeek,
        lastCheckDate: yesterdayStr,
        lastEvaluatedDate: todayStr,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('streak-freeze-used', { detail: { streak: currentStreak } })
        );
      }
      if (isTauriEnvironment()) {
        emit('streak-freeze-used', { streak: currentStreak }).catch((e) => {
          console.warn('Failed to emit streak-freeze-used event:', e);
        });
      }

      updateProgress({
        streakFreezeAvailable: false,
        lastCheckDate: yesterdayStr,
      }).catch((err) => {
        console.error('Failed to persist used freeze to SQLite:', err);
      });

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

    await updateProgress({ streakFreezeAvailable: false }).catch((err) => {
      console.error('Failed to persist used freeze:', err);
    });

    return true;
  },

  resetWeeklyFreeze: async () => {
    const { currentLevel } = get();
    if (currentLevel >= 5) {
      set({
        streakFreezeAvailable: true,
        freezeUsedThisWeek: false,
        lastFreezeWeek: null,
      });

      await updateProgress({ streakFreezeAvailable: true }).catch((err) => {
        console.error('Failed to reset weekly freeze:', err);
      });
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
      // Midnight day rollover:
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
    const previousXp = get().totalXp;
    const newXp = previousXp + validAmount;
    const leveledUp = isLevelUp(previousXp, newXp);
    const oldLevel = get().currentLevel;
    const levelInfo = calculateLevelFromXp(newXp);
    const xpToNext = getXpToNextLevel(newXp);

    const now = new Date().toISOString();
    const xpGain: XpGainInfo = {
      amount: validAmount,
      source,
      timestamp: now,
    };

    const streakFreezeAvailable =
      get().streakFreezeAvailable || levelInfo.level >= 5;

    set({
      totalXp: newXp,
      currentLevel: levelInfo.level,
      levelTitle: levelInfo.title,
      progressPercent: levelInfo.progressPercent,
      xpToNextLevel: xpToNext,
      streakFreezeAvailable,
      lastXpGain: xpGain,
    });

    // 1. Emit XP gain event
    const xpPayload: XpGainedPayload = {
      amount: validAmount,
      source,
      totalXp: newXp,
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xp-gained', { detail: xpPayload }));
    }
    if (isTauriEnvironment()) {
      emit('xp-gained', xpPayload).catch((e) => {
        console.warn('Failed to emit xp-gained Tauri event:', e);
      });
    }

    // 2. If leveled up, emit level-up event
    if (leveledUp) {
      const levelPayload: LevelUpPayload = {
        oldLevel,
        newLevel: levelInfo.level,
        newTitle: levelInfo.title,
        totalXp: newXp,
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('level-up', { detail: levelPayload }));
      }
      if (isTauriEnvironment()) {
        emit('level-up', levelPayload).catch((e) => {
          console.warn('Failed to emit level-up Tauri event:', e);
        });
      }
    }

    // 3. Persist to SQLite asynchronously without blocking UI
    updateProgress({
      totalXp: newXp,
      currentLevel: levelInfo.level,
      streakFreezeAvailable,
    }).catch((err) => {
      console.error('Failed to persist XP to SQLite:', err);
    });

    return {
      previousXp,
      newXp,
      leveledUp,
      oldLevel,
      newLevel: levelInfo.level,
      newTitle: levelInfo.title,
    };
  },

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
      // Increments streak for completing today
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

    // If milestone reached, emit milestone event
    if (milestone && newStreak > currentStreak) {
      const milestonePayload: StreakMilestonePayload = { streak: milestone };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('streak-milestone', { detail: milestonePayload })
        );
      }
      if (isTauriEnvironment()) {
        emit('streak-milestone', milestonePayload).catch((e) => {
          console.warn('Failed to emit streak-milestone Tauri event:', e);
        });
      }
    }

    // 5. Add XP (handles level-up detection, events, and persistence)
    const xpResult = await get().addXp(totalEarned, 'acknowledge');

    // 6. Persist streak updates to SQLite
    updateProgress({
      currentStreak: newStreak,
      longestStreak: newLongest,
      totalChecks: get().totalChecks,
      lastCheckDate: newLastCheckDate,
    }).catch((err) => {
      console.error('Failed to persist streak to SQLite:', err);
    });

    return {
      baseEarned,
      streakBonus,
      dailyBonus,
      totalEarned,
      leveledUp: xpResult.leveledUp,
      oldLevel: xpResult.oldLevel,
      newLevel: xpResult.newLevel,
      newTitle: xpResult.newTitle,
      streak: newStreak,
      streakMilestone: milestone,
    };
  },

  syncWithProgress: (progress: UserProgressPayload) => {
    const prevLevel = get().currentLevel;
    const prevXp = get().totalXp;
    const levelInfo = calculateLevelFromXp(progress.totalXp);
    const leveledUp = levelInfo.level > prevLevel;
    const streakFreezeAvailable =
      progress.streakFreezeAvailable || levelInfo.level >= 5;

    set({
      totalXp: progress.totalXp,
      currentLevel: levelInfo.level,
      levelTitle: levelInfo.title,
      progressPercent: levelInfo.progressPercent,
      xpToNextLevel: getXpToNextLevel(progress.totalXp),
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      totalChecks: progress.totalChecks,
      streakFreezeAvailable,
      lastCheckDate: progress.lastCheckDate ?? null,
    });

    if (progress.totalXp > prevXp) {
      const gain = progress.totalXp - prevXp;
      const xpPayload: XpGainedPayload = {
        amount: gain,
        source: 'acknowledgment',
        totalXp: progress.totalXp,
      };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp-gained', { detail: xpPayload }));
      }
    }

    if (leveledUp) {
      const levelPayload: LevelUpPayload = {
        oldLevel: prevLevel,
        newLevel: levelInfo.level,
        newTitle: levelInfo.title,
        totalXp: progress.totalXp,
      };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('level-up', { detail: levelPayload }));
      }
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
      isInitialized: false,
      isLoading: false,
      lastXpGain: null,
      error: null,
    });
  },
}));
