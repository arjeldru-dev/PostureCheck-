import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { AchievementUnlockedPayload } from '@/stores/gamificationStore';

export const ACHIEVEMENT_TOAST_DURATION_MS = 5000;

export interface AchievementToastProps {
  /** Called when the toast body is clicked (open the Achievements page). */
  onOpen?: () => void;
  durationMs?: number;
}

/**
 * Listens for `achievement-unlocked` window events and shows one toast at a
 * time (multiple unlocks from the same action queue up).
 */
export const AchievementToast: React.FC<AchievementToastProps> = ({
  onOpen,
  durationMs = ACHIEVEMENT_TOAST_DURATION_MS,
}) => {
  const [queue, setQueue] = useState<AchievementUnlockedPayload[]>([]);
  const current = queue[0] ?? null;
  // Auto-dismiss pauses while hovered or focused (WCAG 2.2.1 Timing Adjustable)
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(durationMs);
  const startedAtRef = useRef(0);

  const dismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  useEffect(() => {
    const onUnlocked = (e: Event) => {
      const detail = (e as CustomEvent<AchievementUnlockedPayload>).detail;
      if (!detail?.achievementId) return;
      setQueue((q) =>
        q.some((p) => p.achievementId === detail.achievementId) ? q : [...q, detail]
      );
    };
    window.addEventListener('achievement-unlocked', onUnlocked);
    return () => window.removeEventListener('achievement-unlocked', onUnlocked);
  }, []);

  // Each new toast gets the full duration and starts un-paused (a dismissed
  // toast that had focus unmounts without firing blur)
  useEffect(() => {
    remainingRef.current = durationMs;
    setIsPaused(false);
  }, [current, durationMs]);

  useEffect(() => {
    if (!current || isPaused) return;
    startedAtRef.current = Date.now();
    const timer = setTimeout(dismiss, Math.max(0, remainingRef.current));
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [current, isPaused, dismiss]);

  if (!current) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(24rem,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsPaused(false);
      }}
    >
      <div
        key={current.achievementId}
        className="relative motion-safe:animate-slide-down rounded-2xl border border-golden-xp/60 bg-theme-card shadow-2xl
          shadow-golden-xp/20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-golden-xp/20 via-golden-xp/5 to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={() => {
            onOpen?.();
            dismiss();
          }}
          className="relative w-full flex items-center gap-3 p-3.5 pr-10 text-left cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-golden-xp"
        >
          <span className="w-12 h-12 shrink-0 rounded-full bg-golden-xp/25 ring-2 ring-golden-xp/60 flex items-center justify-center text-2xl motion-safe:animate-pulse-gold">
            <span role="img" aria-hidden="true">
              {current.icon}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-golden-xp">
              Achievement Unlocked!
            </span>
            <span className="block font-display font-bold text-theme-text truncate">
              {current.name}
            </span>
            <span className="block text-xs font-mono font-semibold text-golden-xp">
              {`+${current.xpReward} XP`}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1.5 rounded-full text-theme-muted hover:text-theme-text hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-golden-xp"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default AchievementToast;
