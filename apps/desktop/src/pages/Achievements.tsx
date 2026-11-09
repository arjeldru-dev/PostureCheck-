import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, RotateCw, Trophy } from 'lucide-react';
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
} from '@posture-check/shared';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { useGamificationStore } from '@/stores/gamificationStore';

export interface AchievementsPageProps {
  onBack?: () => void;
}

const CATEGORY_ORDER: AchievementCategory[] = ['milestones', 'habits', 'actions'];

export const Achievements: React.FC<AchievementsPageProps> = ({ onBack }) => {
  const unlockedAchievements = useGamificationStore((s) => s.unlockedAchievements);
  const loadAchievements = useGamificationStore((s) => s.loadAchievements);
  const achievementsError = useGamificationStore((s) => s.achievementsError);
  const [isRetrying, setIsRetrying] = useState(false);

  // Refresh from SQLite whenever the gallery opens
  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await loadAchievements();
    } finally {
      setIsRetrying(false);
    }
  };

  const total = ACHIEVEMENT_DEFINITIONS.length;
  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter((a) => unlockedAchievements[a.id]).length;
  const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text transition-colors cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="font-display font-bold text-2xl text-theme-text flex items-center gap-2">
              <Trophy className="w-5 h-5 text-golden-xp" aria-hidden="true" />
              Achievements
            </h2>
            <p className="text-xs text-theme-muted">
              Earn badges for posture habits. Each one is a one-time XP bonus.
            </p>
          </div>
        </div>

        <div className="min-w-[12rem]">
          <p className="text-sm font-semibold text-theme-text text-right" aria-live="polite">
            <span className="font-mono text-golden-xp">{unlockedCount}</span> / {total} achievements
            unlocked
          </p>
          <div
            className="mt-1.5 h-2 rounded-full bg-theme-surface border border-theme-border overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={unlockedCount}
            aria-label="Achievements unlocked"
          >
            <div
              className="h-full bg-golden-xp rounded-full transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {achievementsError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-coral-alert/40 bg-coral-alert/10 p-3 text-xs text-coral-alert"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            Couldn't load your achievements. Badges below may show as locked.
          </span>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-coral-alert/40 bg-coral-alert/15 hover:bg-coral-alert/25 font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <RotateCw
              className={`w-3 h-3 ${isRetrying ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* Categories */}
      {CATEGORY_ORDER.map((category) => {
        const items = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
        if (items.length === 0) return null;
        const catUnlocked = items.filter((a) => unlockedAchievements[a.id]).length;
        return (
          <section key={category} aria-labelledby={`ach-cat-${category}`} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3
                id={`ach-cat-${category}`}
                className="text-xs font-bold uppercase tracking-wider text-theme-muted"
              >
                {ACHIEVEMENT_CATEGORY_LABELS[category]}
              </h3>
              <span className="text-[11px] font-mono text-theme-muted">
                {catUnlocked}/{items.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={Boolean(unlockedAchievements[achievement.id])}
                  unlockedAt={unlockedAchievements[achievement.id] ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Achievements;
