import React, { useEffect, useId, useRef, useState } from 'react';
import { Lock, X, Sparkles } from 'lucide-react';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementDefinition,
} from '@posture-check/shared';

export interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  isUnlocked: boolean;
  /** UTC ISO-8601 unlock timestamp */
  unlockedAt?: string | null;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatUnlockDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  isUnlocked,
  unlockedAt,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const titleId = useId();
  const unlockedLabel = formatUnlockDate(unlockedAt);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  // Escape closes; Tab / Shift+Tab stay inside the dialog (focus trap)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Return focus to the badge that opened the dialog
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-describedby={tooltipId}
        aria-label={`${achievement.name} — ${isUnlocked ? 'unlocked' : 'locked'}`}
        data-unlocked={isUnlocked}
        className={`group relative flex flex-col items-center text-center gap-2 p-4 rounded-2xl border cursor-pointer
          transition-transform duration-200 motion-safe:hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-golden-xp
          ${
            isUnlocked
              ? 'bg-golden-xp/10 border-golden-xp/40 shadow-[0_0_18px_-6px_var(--color-golden-xp)]'
              : 'bg-theme-surface border-theme-border'
          } ${className}`}
      >
        {/* Icon */}
        <div
          className={`relative w-14 h-14 rounded-full flex items-center justify-center text-3xl leading-none
            ${isUnlocked ? 'bg-golden-xp/20 ring-2 ring-golden-xp/50' : 'bg-theme-card ring-1 ring-theme-border'}`}
        >
          <span
            role="img"
            aria-hidden="true"
            className={isUnlocked ? '' : 'grayscale opacity-50'}
          >
            {achievement.icon}
          </span>
          {!isUnlocked && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-theme-card border border-theme-border flex items-center justify-center">
              <Lock className="w-3 h-3 text-theme-muted" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Name + description / hint */}
        <div className="space-y-0.5">
          <p
            className={`font-display font-bold text-sm ${
              isUnlocked ? 'text-theme-text' : 'text-theme-muted'
            }`}
          >
            {achievement.name}
          </p>
          <p className="text-[11px] leading-snug text-theme-muted">
            {isUnlocked ? achievement.description : achievement.hint}
          </p>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
            isUnlocked ? 'bg-golden-xp/20 text-golden-xp' : 'bg-theme-card text-theme-muted'
          }`}
        >
          {`+${achievement.xpReward} XP`}
        </span>

        {/* Hover tooltip: condition + reward */}
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 w-48 px-3 py-2 rounded-xl
            bg-pond-dark text-pond-light text-[11px] leading-snug shadow-xl border border-white/10
            opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
        >
          <span className="block font-semibold">{achievement.hint}</span>
          <span className="block text-golden-xp font-mono mt-0.5">
            {`Reward: +${achievement.xpReward} XP`}
          </span>
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={dialogRef}
            className={`w-full max-w-sm bg-theme-card border rounded-3xl p-6 shadow-2xl text-theme-text relative motion-safe:animate-scale-in ${
              isUnlocked ? 'border-golden-xp/50' : 'border-theme-border'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-theme-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-golden-xp"
              aria-label="Close"
              autoFocus
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl ${
                  isUnlocked
                    ? 'bg-golden-xp/20 ring-2 ring-golden-xp/60'
                    : 'bg-theme-surface ring-1 ring-theme-border'
                }`}
              >
                <span
                  role="img"
                  aria-hidden="true"
                  className={isUnlocked ? '' : 'grayscale opacity-50'}
                >
                  {achievement.icon}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">
                  {ACHIEVEMENT_CATEGORY_LABELS[achievement.category]}
                </span>
                <h3 id={titleId} className="font-display font-bold text-xl">
                  {achievement.name}
                </h3>
                <p className="text-sm text-theme-muted mt-1">{achievement.description}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-theme-surface border border-theme-border p-2.5">
                  <span className="block text-theme-muted">Reward</span>
                  <span className="font-mono font-bold text-golden-xp">
                    {`+${achievement.xpReward} XP`}
                  </span>
                </div>
                <div className="rounded-xl bg-theme-surface border border-theme-border p-2.5">
                  <span className="block text-theme-muted">Status</span>
                  <span
                    className={`font-semibold inline-flex items-center gap-1 ${
                      isUnlocked ? 'text-frog-green' : 'text-theme-muted'
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Unlocked
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" aria-hidden="true" /> Locked
                      </>
                    )}
                  </span>
                </div>
              </div>

              <p className="text-xs text-theme-muted">
                {isUnlocked
                  ? unlockedLabel
                    ? `Unlocked on ${unlockedLabel}`
                    : 'Unlocked'
                  : `How to earn it: ${achievement.hint}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AchievementBadge;
