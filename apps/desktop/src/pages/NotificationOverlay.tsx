import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauriEnvironment } from '@/lib/tauri';
import level4AudioUrl from '@/assets/sounds/alarm-level4.wav';
import { Check, Moon, Volume2, ShieldAlert } from 'lucide-react';
import {
  buttonMotion,
  ghostButtonMotion,
  modalScaleVariants,
  reducedMotionFadeVariants,
  isReducedMotion,
} from '@/components/notifications/animations';

interface OverlayNotificationData {
  id?: string;
  level?: number;
  title?: string;
  body?: string;
}

const DEFAULT_LEVEL_4_MESSAGES = [
  'ATTENTION: Serious slouch alert! Straighten your spine now! 🚨',
  'Ribbit is jumping with urgency! Back off the desk! 🐸⚡',
  "You've been hunched too long! Sit up straight and claim your XP!",
  'Posture emergency! Un-hunch immediately for your own good!',
  'Priority check: Lift your chest, pull back your chin.',
  'Your spine called—it wants its natural curve back right now!',
];

/**
 * Level 4 — Alert Overlay (500x300px centered window)
 * Premium redesign featuring:
 * - Coral-alert gradient background with dark card overlay
 * - Large 120px Ribbit mascot in an animated attention-getting pose
 * - Sound wave visualizer indicating active alarm audio
 * - Red-orange pulsing border animation
 * - Micro-animated buttons with spring press states
 * - Accessible keyboard shortcuts (Enter to acknowledge, Escape to snooze)
 */
export const NotificationOverlay: React.FC = () => {
  const [data, setData] = useState<OverlayNotificationData>(() => ({
    title: '⏰ Posture Alert!',
    body: DEFAULT_LEVEL_4_MESSAGES[Math.floor(Math.random() * DEFAULT_LEVEL_4_MESSAGES.length)],
  }));
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimerRef = useRef<number | null>(null);

  // Parse theme parameter from URL if provided (defaulting to dark mode)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const theme = params.get('theme');
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Play alarm sound: Rust audio engine manages playback in Tauri; Web Audio fallback for browser
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const playWebAudio = () => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(level4AudioUrl);
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});

        // Repeat every 30 seconds until acknowledged
        if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
        repeatTimerRef.current = window.setInterval(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }, 30000);
      } catch {
        // Audio playback unavailable or blocked by browser policy
      }
    };

    if (!isTauriEnvironment()) {
      playWebAudio();
    }

    // Listen for custom overlay payload events
    if (isTauriEnvironment()) {
      listen<OverlayNotificationData>('overlay-data', (event) => {
        if (event.payload) {
          setData((prev) => ({
            ...prev,
            ...event.payload,
            title: event.payload.title || '⏰ Posture Alert!',
          }));
        }
      }).then((unsub) => {
        unlisten = unsub;
      });
    }

    return () => {
      if (repeatTimerRef.current) {
        clearInterval(repeatTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleSittingUp = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTauriEnvironment()) {
        try {
          await invoke('stop_alarm_sound');
        } catch {
          // Continue even if audio stop errors
        }
        try {
          await invoke('handle_notification_action', {
            action: 'sitting_up',
            notificationId: data.id,
          });
        } catch {
          // Action recorded
        }
        await invoke('close_overlay');
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        window.close();
      }
    } catch {
      if (isTauriEnvironment()) {
        invoke('close_overlay').catch(() => {});
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, data.id]);

  const handleSnooze = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTauriEnvironment()) {
        try {
          await invoke('stop_alarm_sound');
        } catch {
          // Continue even if audio stop errors
        }
        try {
          await invoke('handle_notification_action', {
            action: 'snooze',
            notificationId: data.id,
          });
        } catch {
          // Action recorded
        }
        await invoke('close_overlay');
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        window.close();
      }
    } catch {
      if (isTauriEnvironment()) {
        invoke('close_overlay').catch(() => {});
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, data.id]);

  // Keyboard accessibility: Enter to acknowledge, Escape to snooze
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSittingUp();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSnooze();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSittingUp, handleSnooze]);

  const variants = isReducedMotion() ? reducedMotionFadeVariants : modalScaleVariants;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="overlay-alert-title"
      aria-describedby="overlay-alert-desc"
      className="w-[500px] h-[300px] bg-transparent p-2.5 box-border flex items-center justify-center select-none overflow-hidden font-sans"
    >
      {/* 500x300 Notification Window Container */}
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        className="w-full h-full rounded-3xl bg-gradient-to-br from-coral-alert/20 via-theme-surface/95 to-theme-card/98 backdrop-blur-2xl border-2 border-coral-alert p-5 flex flex-col justify-between shadow-2xl animate-pulse-coral relative overflow-hidden"
        style={{
          boxShadow: '0 0 30px rgba(255, 112, 67, 0.45), 0 12px 36px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Subtle decorative coral halo */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-coral-alert/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row: Alert Badge & Sound Wave Visualizer */}
        <div className="flex items-center justify-between z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-coral-alert/20 border border-coral-alert/40 text-coral-alert">
            <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] font-display font-bold uppercase tracking-wider">
              Level 4 · Urgent Alert
            </span>
          </div>

          {/* Sound wave visualizer indicating alarm sound is active */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10"
            title="Alarm sound active"
            aria-hidden="true"
          >
            <Volume2 className="w-3.5 h-3.5 text-coral-alert animate-pulse" />
            <div className="flex items-end gap-0.5 h-3.5 w-7">
              <span className="w-1 bg-coral-alert rounded-full animate-sound-wave-1 h-2" />
              <span className="w-1 bg-coral-alert rounded-full animate-sound-wave-2 h-3.5" />
              <span className="w-1 bg-coral-alert rounded-full animate-sound-wave-3 h-1.5" />
              <span className="w-1 bg-coral-alert rounded-full animate-sound-wave-1 h-3" />
            </div>
          </div>
        </div>

        {/* Middle Section: Mascot & Content */}
        <div className="flex items-center gap-4 z-10 my-auto py-1">
          {/* Large Ribbit (120px) with animated attention-getting wobble */}
          <div className="shrink-0 flex items-center justify-center pl-1">
            <RibbitMascot state="concerned" size={120} showBreathing={true} />
          </div>

          {/* Text Information on the right */}
          <div className="flex-1 min-w-0 pr-1">
            <h2
              id="overlay-alert-title"
              className="font-display font-black text-xl text-coral-alert tracking-tight mb-1"
            >
              {data.title || '⏰ Posture Alert!'}
            </h2>
            <p
              id="overlay-alert-desc"
              className="font-sans text-[13.5px] leading-snug font-medium text-theme-text line-clamp-3"
            >
              {data.body}
            </p>
          </div>
        </div>

        {/* Bottom Section: Action Buttons */}
        <div className="flex items-center gap-3 pt-2 z-10 border-t border-theme-border/50">
          {/* Primary Action Button: "✓ I'm sitting up!" (green) */}
          <motion.button
            type="button"
            onClick={handleSittingUp}
            disabled={isProcessing}
            {...buttonMotion}
            className="flex-1 py-2.5 px-4 rounded-xl bg-frog-green hover:bg-frog-green-secondary text-white font-display font-bold text-xs tracking-wider shadow-md shadow-frog-green/35 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>✓ I'm sitting up!</span>
          </motion.button>

          {/* Secondary Action Button: "💤 Snooze 5 min" */}
          <motion.button
            type="button"
            onClick={handleSnooze}
            disabled={isProcessing}
            {...ghostButtonMotion}
            className="px-4 py-2.5 rounded-xl bg-theme-bg/60 hover:bg-theme-bg border border-theme-border text-theme-muted hover:text-theme-text font-display font-semibold text-xs tracking-wide cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>💤 Snooze 5 min</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationOverlay;
