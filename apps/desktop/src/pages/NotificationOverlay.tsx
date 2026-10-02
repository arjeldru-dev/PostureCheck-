import React, { useEffect, useState, useRef } from 'react';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauriEnvironment } from '@/lib/tauri';
import level4AudioUrl from '@/assets/sounds/alarm-level4.wav';
import { Check, Moon } from 'lucide-react';

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

export const NotificationOverlay: React.FC = () => {
  const [data, setData] = useState<OverlayNotificationData>(() => ({
    title: '⏰ Posture Check!',
    body: DEFAULT_LEVEL_4_MESSAGES[Math.floor(Math.random() * DEFAULT_LEVEL_4_MESSAGES.length)],
  }));
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimerRef = useRef<number | null>(null);

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
      } catch {}
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
            title: event.payload.title || '⏰ Posture Check!',
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

  const handleSittingUp = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTauriEnvironment()) {
        await invoke('stop_alarm_sound');
        await invoke('handle_notification_action', {
          action: 'sitting_up',
          notificationId: data.id,
        });
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
  };

  const handleSnooze = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTauriEnvironment()) {
        await invoke('stop_alarm_sound');
        await invoke('handle_notification_action', {
          action: 'snooze',
          notificationId: data.id,
        });
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
  };

  return (
    <div className="w-[500px] h-[300px] bg-transparent p-2 box-border flex items-center justify-center select-none overflow-hidden font-sans">
      {/* 500x300 Notification Window Container with pulsing frog-green border */}
      <div
        className="w-full h-full rounded-3xl bg-(--color-theme-bg)/95 backdrop-blur-2xl border-2 border-(--color-frog-green) p-5 flex flex-col justify-between shadow-2xl animate-fade-in animate-pulse-green relative overflow-hidden"
        style={{
          boxShadow: '0 0 25px rgba(76, 175, 80, 0.45), 0 8px 32px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Subtle decorative glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-(--color-frog-green)/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Section: Mascot & Content */}
        <div className="flex items-center gap-5">
          {/* Large Ribbit (reminding state, ~120px) on the left */}
          <div className="shrink-0 flex items-center justify-center pl-1">
            <RibbitMascot state="reminding" size={120} showBreathing={true} />
          </div>

          {/* Text Information on the right */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">⏰</span>
              <h2 className="font-display font-bold text-2xl text-(--color-frog-green) tracking-tight">
                {data.title || '⏰ Posture Check!'}
              </h2>
            </div>
            <p className="font-sans text-[15px] leading-snug text-(--color-theme-text)/90 line-clamp-3">
              {data.body}
            </p>
          </div>
        </div>

        {/* Bottom Section: Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {/* Primary Action Button: "✓ I'm sitting up!" (green) */}
          <button
            type="button"
            onClick={handleSittingUp}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-xl bg-(--color-frog-green) hover:bg-(--color-frog-green-secondary) text-white font-display font-bold text-sm tracking-wide shadow-md shadow-(--color-frog-green)/30 transition-all active:scale-97 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>✓ I'm sitting up!</span>
          </button>

          {/* Secondary Action Button: "💤 Snooze 5 min" (gray) */}
          <button
            type="button"
            onClick={handleSnooze}
            disabled={isProcessing}
            className="px-4 py-3 rounded-xl bg-(--color-theme-surface) hover:bg-(--color-theme-card) border border-(--color-theme-border) text-(--color-theme-muted) hover:text-(--color-theme-text) font-display font-semibold text-xs tracking-wide transition-all active:scale-97 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>💤 Snooze 5 min</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationOverlay;
