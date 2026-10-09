import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Coffee,
  Sparkles,
} from 'lucide-react';
import RibbitMascot from '@/components/ribbit/RibbitMascot';
import SpeechBubble from '@/components/ribbit/SpeechBubble';
import ConfettiEffect from '@/components/ribbit/ConfettiEffect';
import CountdownTimer from '@/components/dashboard/CountdownTimer';
import QuickStats from '@/components/dashboard/QuickStats';
import {
  LevelBadge,
  XpProgressBar,
  StreakCounter,
  DailySummary,
} from '@/components/gamification';
import { useRibbitState } from '@/hooks/useRibbitState';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore } from '@/stores/timerStore';
import { useTrayState } from '@/hooks/useTrayState';
import { useGamificationStore } from '@/stores/gamificationStore';
import { getProgress, getTodayStats, type UserProgressPayload, type TodayStatsPayload } from '@/lib/tauri';
import { playAcknowledgeSound, playCelebrationSound } from '@/lib/audio';
import { defaultRotationEngine } from '@posture-check/shared';

export interface DashboardProps {
  onOpenSettings?: () => void;
  onOpenDesignSystem?: () => void;
  onShowFeedback?: (text: string, isError?: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenSettings: _onOpenSettings,
  onOpenDesignSystem: _onOpenDesignSystem,
  onShowFeedback,
}) => {
  // 1. Core Timer and Tray Hooks
  const timer = useTimer();
  const {
    formattedCountdown,
    secondsRemaining,
    intervalMinutes,
    status: timerStatus,
    acknowledge,
    snooze,
    syncWithBackend: syncTimer,
  } = timer;
  const activeReminder = timer.activeReminder ?? useTimerStore.getState().activeReminder;

  const {
    isDnd,
    isActive,
    togglePause,
  } = useTrayState();

  // 2. Ribbit Mascot State Machine
  const {
    state: ribbitState,
    message: ribbitMessage,
    isCelebrating,
    triggerEncouraging,
    triggerCelebrating,
    triggerDisappointed,
    dismissMessage,
    setMessage,
  } = useRibbitState({ activeReminder });

  // 3. User Gamification and Today Stats
  const [progress, setProgress] = useState<UserProgressPayload>({
    id: 1,
    totalXp: 1250,
    currentLevel: 6,
    currentStreak: 5,
    longestStreak: 12,
    totalChecks: 42,
    streakFreezeAvailable: true,
    updatedAt: new Date().toISOString(),
  });

  const [todayStats, setTodayStats] = useState<TodayStatsPayload>({
    totalChecksToday: 8,
    acknowledgedToday: 7,
    acknowledgmentRate: 0.875,
    xpEarnedToday: 70,
  });

  const totalXp = useGamificationStore((s) => s.totalXp);
  const currentLevel = useGamificationStore((s) => s.currentLevel);
  const levelTitle = useGamificationStore((s) => s.levelTitle);
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const streakFreezeAvailable = useGamificationStore((s) => s.streakFreezeAvailable);
  const freezeUsedThisWeek = useGamificationStore((s) => s.freezeUsedThisWeek);

  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Fetch updated stats from SQLite or mock
  const refreshStats = useCallback(async () => {
    try {
      const [prog, stats] = await Promise.all([
        getProgress(),
        getTodayStats().catch(() => null),
      ]);
      if (prog) setProgress(prog);
      if (stats) setTodayStats(stats);
      return { prog, stats };
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Listen for streak events (milestone, broken, freeze used)
  useEffect(() => {
    const handleMilestone = (e: Event) => {
      const detail = (e as CustomEvent<{ streak: number }>).detail;
      const streak = detail?.streak ?? 7;
      playCelebrationSound();
      const streakMsg =
        streak >= 30
          ? defaultRotationEngine.getGoldenFrogMessage()
          : defaultRotationEngine.getStreakMessage(streak);
      triggerCelebrating(streakMsg);
      onShowFeedback?.(`🔥 Milestone: ${streak}-day streak reached!`);
    };

    const handleBroken = () => {
      triggerDisappointed('Aww, streak broken... 🥺');
      setTimeout(() => {
        triggerEncouraging("Don't worry! Let's start a new streak today! 🐸");
      }, 2500);
      onShowFeedback?.('Streak reset. Ready for a fresh start! 🌱');
    };

    const handleFreezeUsed = (e: Event) => {
      const detail = (e as CustomEvent<{ streak: number }>).detail;
      onShowFeedback?.(
        `🛡️ Streak Freeze protected your ${detail?.streak ?? ''} day streak!`
      );
    };

    window.addEventListener('streak-milestone', handleMilestone);
    window.addEventListener('streak-broken', handleBroken);
    window.addEventListener('streak-freeze-used', handleFreezeUsed);

    return () => {
      window.removeEventListener('streak-milestone', handleMilestone);
      window.removeEventListener('streak-broken', handleBroken);
      window.removeEventListener('streak-freeze-used', handleFreezeUsed);
    };
  }, [triggerCelebrating, triggerDisappointed, triggerEncouraging, onShowFeedback]);

  // Handle reminder acknowledgment
  const handleAcknowledge = async () => {
    if (isAcknowledging) return;
    setIsAcknowledging(true);
    try {
      const prevLevel = currentLevel || progress.currentLevel;
      const prevStreak = currentStreak || progress.currentStreak;

      const res = await acknowledge();
      const fresh = await refreshStats();
      const newProg = fresh?.prog;

      const hasLeveledUp = Boolean(newProg && newProg.currentLevel > prevLevel);
      const hitStreakMilestone = Boolean(
        newProg &&
          newProg.currentStreak > prevStreak &&
          [7, 14, 30, 60, 100].includes(newProg.currentStreak)
      );

      const xpEarned = res?.xpEarned || 10;

      if (hasLeveledUp && newProg) {
        playCelebrationSound();
        triggerCelebrating(
          `🌟 LEVEL UP! You reached Level ${newProg.currentLevel}! Golden lily pad unlocked! 🏆🎉`
        );
        onShowFeedback?.(`🎉 Level Up! You reached Level ${newProg.currentLevel}!`);
      } else if (!hitStreakMilestone) {
        // Milestone celebration is handled by the 'streak-milestone' event listener
        playAcknowledgeSound();
        const ackMsg = defaultRotationEngine.getAcknowledgmentMessage();
        triggerEncouraging(`+${xpEarned} XP! 🐸 ${ackMsg}`);
        onShowFeedback?.(`✓ Posture verified! +${xpEarned} XP earned 🎉`);
      }
    } catch (err) {
      console.error('Failed to acknowledge posture check:', err);
      onShowFeedback?.('Failed to acknowledge check-in', true);
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Handle snooze
  const handleSnooze = async (mins: number) => {
    try {
      await snooze(mins);
      dismissMessage();
      playAcknowledgeSound();
      onShowFeedback?.(`Snoozed for ${mins} minutes 💤`);
      await refreshStats();
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      onShowFeedback?.('Failed to snooze', true);
    }
  };

  // Handle quick pause toggle
  const handleTogglePause = async () => {
    try {
      await togglePause();
      await syncTimer();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
      onShowFeedback?.('Failed to update pause state', true);
    }
  };

  // Mascot click interaction: Ribbit chirps or encourages
  const handleRibbitClick = () => {
    if (ribbitState === 'sleeping') {
      setMessage("Zzz... Ribbit is taking a quick frog nap 😴");
      return;
    }
    const chirps = [
      "Ribbit! Feeling good, sitting tall! 🐸✨",
      "Shoulders down, neck relaxed, you've got this!",
      "Ribbit is cheering for your spinal health! 💚",
      "Hop! Every minute sitting upright counts!",
    ];
    const picked = chirps[Math.floor(Math.random() * chirps.length)];
    setMessage(picked);
  };

  // Descriptive state banner text below Ribbit
  const stateDescriptionText = (() => {
    switch (ribbitState) {
      case 'reminding':
        return 'Time for a posture check! Sit up straight! 🐸';
      case 'concerned':
        return "Ribbit noticed you've been sitting a while... Stretch out! 🥺";
      case 'encouraging':
        return 'Great posture habit! Ribbit is proud of you! 👍';
      case 'celebrating':
        return 'Milestone achieved! Incredible posture discipline! 🥳🎉';
      case 'sleeping':
        return 'Ribbit is resting peacefully. Reminders are paused. 😴';
      case 'disappointed':
        return 'Streak paused, but ready for a fresh new day! 🌱';
      case 'idle':
      default:
        return 'Ribbit is watching your posture! 🐸';
    }
  })();

  const effectiveStatus = isDnd ? 'dnd' : !isActive ? 'paused' : timerStatus;

  return (
    <div className="relative flex flex-col items-center justify-between min-h-full w-full mx-auto px-4 py-2 select-none">
      {/* Confetti Particle Layer during Celebration */}
      <ConfettiEffect active={isCelebrating} />

      {/* Centerpiece Container with comfortable min-height constraint */}
      <div className="flex-1 min-h-[460px] flex flex-col items-center justify-center w-full my-auto py-4">
        {/* Floating Speech Bubble Above Mascot */}
        <div className="min-h-16 flex items-end justify-center mb-3 w-full">
          <SpeechBubble
            message={ribbitMessage}
            state={ribbitState}
            autoHideMs={activeReminder ? null : 6000}
            onDismiss={dismissMessage}
          />
        </div>

        {/* Ribbit Mascot Prominently Centered (xl size: 240px) */}
        <div className="relative flex items-center justify-center my-1 group">
          {/* Subtle pond ripple circle underneath Ribbit */}
          <div className="absolute -bottom-2 w-48 sm:w-56 h-7 bg-frog-green/10 rounded-full blur-md group-hover:bg-frog-green/20 transition-all duration-500" />
          
          <RibbitMascot
            state={ribbitState}
            size="xl"
            showBreathing={ribbitState === 'idle'}
            onClick={handleRibbitClick}
            className="transition-transform duration-300 hover:scale-105 active:scale-95"
            alt={`Ribbit the Frog (${ribbitState})`}
          />
        </div>

        {/* Mascot State Headline */}
        <p className="mt-3 text-sm sm:text-base font-semibold text-theme-text text-center animate-fade-in">
          {stateDescriptionText}
        </p>

        {/* Countdown Timer Display */}
        <div className="mt-4">
          <CountdownTimer
            formattedCountdown={formattedCountdown}
            secondsRemaining={secondsRemaining}
            intervalMinutes={intervalMinutes}
            status={effectiveStatus}
            onTogglePause={handleTogglePause}
          />
        </div>

        {/* Primary Action Buttons (Appears prominently when reminder fires!) */}
        {activeReminder ? (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md animate-pop-in">
            <button
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-frog-green hover:bg-frog-green-secondary text-white font-bold text-base shadow-lg shadow-frog-green/25 hover:shadow-frog-green/40 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-97 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Sit Up Straight! (+10 XP)</span>
            </button>

            <button
              onClick={() => handleSnooze(5)}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-text font-medium text-sm transition-all duration-200 hover:border-frog-green/50 active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Coffee className="w-4 h-4 text-golden-xp" />
              <span>Snooze 5m</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={handleAcknowledge}
              className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-text hover:border-frog-green text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer active:scale-97 flex items-center gap-1.5"
              title="Manually log a good posture posture check and earn XP"
            >
              <Sparkles className="w-3.5 h-3.5 text-golden-xp" />
              <span>Quick Check-In</span>
            </button>

            <button
              onClick={() => handleSnooze(10)}
              className="px-3.5 py-2 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-muted hover:text-theme-text text-xs font-medium transition-colors cursor-pointer active:scale-97 flex items-center gap-1.5"
              title="Snooze next reminder by 10 minutes"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Snooze 10m</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Area: Streak & Daily Summary, Level Progress & Quick Stats */}
      <footer className="w-full flex flex-col items-center mt-6 pt-4 border-t border-theme-border/60 gap-3">
        {/* Streak & Daily Summary Cards */}
        <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StreakCounter
            streak={currentStreak || progress.currentStreak}
            longestStreak={progress.longestStreak}
            freezeAvailable={streakFreezeAvailable}
            freezeUsedThisWeek={freezeUsedThisWeek}
            level={currentLevel || progress.currentLevel}
            size="sm"
          />
          <DailySummary
            totalChecksToday={todayStats.totalChecksToday}
            acknowledgedToday={todayStats.acknowledgedToday}
            size="sm"
          />
        </div>

        {/* Level Progression & XP Bar */}
        <div className="w-full max-w-lg bg-theme-surface/70 border border-theme-border/80 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <LevelBadge
              level={currentLevel || progress.currentLevel}
              title={levelTitle}
              size="sm"
            />
            <span className="text-xs font-mono text-golden-xp font-semibold tabular-nums">
              {`${(totalXp || progress.totalXp).toLocaleString()} XP`}
            </span>
          </div>
          <XpProgressBar
            totalXp={totalXp || progress.totalXp}
            size="sm"
          />
        </div>

        <QuickStats
          todayChecks={todayStats.acknowledgedToday}
          currentStreak={currentStreak || progress.currentStreak}
          totalXp={totalXp || progress.totalXp}
          level={currentLevel || progress.currentLevel}
        />
      </footer>
    </div>
  );
};

export default Dashboard;
