import { create } from 'zustand';
import {
  calculateLevelFromXp,
  calculateStreakBonus,
  calculateDailyCompletionBonus,
  calculateXpForAcknowledge,
  getXpToNextLevel,
  isLevelUp,
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

export interface AcknowledgeResult {
  baseEarned: number;
  streakBonus: number;
  dailyBonus: number;
  totalEarned: number;
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
  streakFreezeAvailable: boolean;
  todayChecksCount: number;
  todayAcknowledgedCount: number;
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
  reset: () => void;
}

const initialLevelInfo = calculateLevelFromXp(0);

let unlistenProgressUpdated: (() => void) | null = null;

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
  todayChecksCount: 0,
  todayAcknowledgedCount: 0,
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

      set({
        totalXp: progress.totalXp,
        currentLevel: levelInfo.level,
        levelTitle: levelInfo.title,
        progressPercent: levelInfo.progressPercent,
        xpToNextLevel: getXpToNextLevel(progress.totalXp),
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        totalChecks: progress.totalChecks,
        streakFreezeAvailable: progress.streakFreezeAvailable,
        todayChecksCount: todayStats?.totalChecksToday ?? 0,
        todayAcknowledgedCount: todayStats?.acknowledgedToday ?? 0,
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
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
    const { currentStreak, todayAcknowledgedCount, todayChecksCount } = get();

    // 1. Base XP
    const baseEarned = calculateXpForAcknowledge();

    // 2. Streak bonus
    const streakBonus = calculateStreakBonus(currentStreak);

    // 3. Daily completion bonus (if acknowledging this reminder completes all checks)
    const nextAckCount = todayAcknowledgedCount + 1;
    const dailyBonus = calculateDailyCompletionBonus(nextAckCount, todayChecksCount);

    const totalEarned = baseEarned + streakBonus + dailyBonus;

    // 4. Update stats in store
    set((state) => ({
      totalChecks: state.totalChecks + 1,
      todayAcknowledgedCount: state.todayAcknowledgedCount + 1,
    }));

    // 5. Add XP (handles level-up detection, events, and persistence)
    const xpResult = await get().addXp(totalEarned, 'acknowledge');

    return {
      baseEarned,
      streakBonus,
      dailyBonus,
      totalEarned,
      leveledUp: xpResult.leveledUp,
      oldLevel: xpResult.oldLevel,
      newLevel: xpResult.newLevel,
      newTitle: xpResult.newTitle,
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
      todayChecksCount: 0,
      todayAcknowledgedCount: 0,
      isInitialized: false,
      isLoading: false,
      lastXpGain: null,
      error: null,
    });
  },
}));
