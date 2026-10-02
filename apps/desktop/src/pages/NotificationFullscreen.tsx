import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauriEnvironment } from '@/lib/tauri';
import level5AudioUrl from '@/assets/sounds/alarm-level5.wav';
import { Sparkles, Check, AlertOctagon } from 'lucide-react';
import {
  buttonMotion,
  modalScaleVariants,
  reducedMotionFadeVariants,
  isReducedMotion,
} from '@/components/notifications/animations';

interface FullscreenNotificationData {
  id?: string;
  level?: number;
  title?: string;
  body?: string;
}

const DEFAULT_LEVEL_5_MESSAGES = [
  'WAKE UP! FULL STOP! Sit up straight, stretch your arms, and breathe! 🛑🐸',
  'EMERGENCY POSTURE INTERVENTION! Ribbit is panicking! Straighten up!',
  'Screen blocked for your spinal safety! Roll your neck, align your back.',
  'No more excuses! Sit up like royalty before you continue.',
  'CRITICAL RESET: Stand or sit upright. Ribbit demands spine justice!',
];

/**
 * Level 5 — Wake Up! Fullscreen Overlay
 * Premium fullscreen experience:
 * - Ambient backdrop with slow-moving frog-green and coral aurora waves
 * - Centered frosted-glass card (600×450px) with coral emergency border
 * - Extra-large 200px Ribbit mascot in panicking / concerned animation
 * - High-contrast white typography
 * - Oversized glowing green button with satisfying spring press feedback
 * - Interactive "+10 XP" reward indicator
 * - Accessible keyboard shortcuts (Enter / Space to acknowledge)
 */
export const NotificationFullscreen: React.FC = () => {
  const [data, setData] = useState<FullscreenNotificationData>(() => ({
    title: '🚨 POSTURE CHECK! 🚨',
    body: DEFAULT_LEVEL_5_MESSAGES[Math.floor(Math.random() * DEFAULT_LEVEL_5_MESSAGES.length)],
  }));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Audio: Rust audio engine manages playback in Tauri; Web Audio fallback for browser
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const playWebAudio = () => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(level5AudioUrl);
          audioRef.current.loop = true;
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {
        // Audio playback unavailable or blocked by browser policy
      }
    };

    if (!isTauriEnvironment()) {
      playWebAudio();
    }

    // Listen for custom fullscreen payload events
    if (isTauriEnvironment()) {
      listen<FullscreenNotificationData>('overlay-data', (event) => {
        if (event.payload) {
          setData((prev) => ({
            ...prev,
            ...event.payload,
            title: event.payload.title || '🚨 POSTURE CHECK! 🚨',
          }));
        }
      }).then((unsub) => {
        unlisten = unsub;
      });
    }

    return () => {
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
    setIsButtonPressed(true);
    setIsProcessing(true);

    try {
      // Allow brief moment for satisfying button press and XP pop animation
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (isTauriEnvironment()) {
        try {
          await invoke('stop_alarm_sound');
        } catch {
          // Continue
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

  // Keyboard accessibility: Enter or Space to sit up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSittingUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSittingUp]);

  const variants = isReducedMotion() ? reducedMotionFadeVariants : modalScaleVariants;

  return (
    // Covers the screen with ambient dark background & slow-moving aurora gradient waves
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreen-alert-title"
      aria-describedby="fullscreen-alert-desc"
      className="fixed inset-0 w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center select-none z-50 p-4 font-sans overflow-hidden"
      onClick={(e) => {
        // Prevent dismissal on clicking backdrop
        e.stopPropagation();
      }}
    >
      {/* Background Animated Gradient Waves (Slow-moving frog-green and coral aurora) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(76,175,80,0.35),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,112,67,0.35),transparent_40%),radial-gradient(circle_at_50%_50%,rgba(66,165,245,0.15),transparent_50%)] animate-aurora"
        style={{
          backgroundSize: '200% 200%',
        }}
      />

      {/* Centered card: frosted glass effect, 600×450px */}
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        className="w-[600px] max-w-[95vw] h-[450px] max-h-[92vh] rounded-3xl bg-theme-surface/90 backdrop-blur-2xl border-2 border-coral-alert p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden animate-pulse-coral z-10"
        style={{
          boxShadow: '0 0 45px rgba(255, 112, 67, 0.45), 0 24px 56px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative central emergency halo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-coral-alert/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Badge & Title */}
        <div className="text-center z-10 flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-alert/20 border border-coral-alert/40 text-coral-alert text-xs font-display font-black tracking-widest uppercase">
            <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Level 5 · Screen-Lock Intervention</span>
          </div>

          <h1
            id="fullscreen-alert-title"
            className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white dark:text-white light:text-slate-900 drop-shadow-md mt-1"
          >
            {data.title || '🚨 POSTURE CHECK! 🚨'}
          </h1>
        </div>

        {/* Center: Extra-large Ribbit (200px) with panicking / concerned animation */}
        <div className="flex flex-col items-center justify-center my-auto z-10 py-1">
          <div className="relative">
            <RibbitMascot state="concerned" size={200} showBreathing={true} />
            {/* Attention glow under mascot */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-coral-alert/25 rounded-full blur-md -z-10" />
          </div>

          {/* High-contrast urgent message */}
          <p
            id="fullscreen-alert-desc"
            className="font-sans font-semibold text-base sm:text-lg text-white dark:text-white light:text-slate-800 text-center mt-3 max-w-lg leading-snug px-3 drop-shadow-xs"
          >
            {data.body}
          </p>
        </div>

        {/* Bottom Section: Oversized Glowing Button & Animated XP Reward Badge */}
        <div className="w-full space-y-3 z-10 pt-2">
          {/* Oversized Button: Glowing green with satisfying press animation */}
          <motion.button
            type="button"
            onClick={handleSittingUp}
            disabled={isProcessing}
            {...buttonMotion}
            className="w-full py-4 px-6 rounded-2xl bg-frog-green hover:bg-frog-green-secondary text-white font-display font-black text-base sm:text-lg tracking-wide shadow-xl shadow-frog-green/45 hover:shadow-frog-green/60 active:scale-97 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 transition-all border border-frog-green-secondary/50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-frog-green/50"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>✓ I'm sitting up! Let me get back to work!</span>
          </motion.button>

          {/* XP Indicator: "+10 XP" badge that animates on press or hover */}
          <motion.div
            animate={isButtonPressed ? { scale: [1, 1.25, 1], rotate: [0, 4, -4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-2 text-xs font-display font-bold text-golden-xp tracking-wide"
          >
            <Sparkles className="w-4 h-4 text-golden-xp animate-spin-slow" />
            <span className="px-2 py-0.5 rounded-full bg-golden-xp/15 border border-golden-xp/30">
              +10 XP Check-in Reward
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationFullscreen;
