import React, { useEffect, useState, useRef } from 'react';
import { RibbitMascot } from '@/components/ribbit/RibbitMascot';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauriEnvironment } from '@/lib/tauri';
import level5AudioUrl from '@/assets/sounds/alarm-level5.wav';
import { Sparkles, Check } from 'lucide-react';

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

export const NotificationFullscreen: React.FC = () => {
  const [data, setData] = useState<FullscreenNotificationData>(() => ({
    title: '🚨 POSTURE CHECK! 🚨',
    body: DEFAULT_LEVEL_5_MESSAGES[Math.floor(Math.random() * DEFAULT_LEVEL_5_MESSAGES.length)],
  }));
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      } catch {}
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

  return (
    // Covers the entire primary monitor with 80% opacity black overlay blocking all background interaction
    <div
      className="fixed inset-0 w-screen h-screen bg-black/80 backdrop-blur-md flex items-center justify-center select-none z-50 p-4 font-sans"
      onClick={(e) => {
        // Prevent dismissal on clicking backdrop
        e.stopPropagation();
      }}
    >
      {/* Centered notification card (600x400px) with rounded corners and coral warning border */}
      <div
        className="w-[600px] max-w-[95vw] h-[400px] max-h-[92vh] rounded-3xl bg-(--color-theme-bg)/95 border-2 border-(--color-coral-alert) p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden animate-scale-in animate-pulse-coral"
        style={{
          boxShadow: '0 0 35px rgba(255, 112, 67, 0.4), 0 20px 45px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background emergency pulse halo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-(--color-coral-alert)/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Title */}
        <div className="text-center z-10">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-wider text-(--color-coral-alert) drop-shadow-sm">
            {data.title || '🚨 POSTURE CHECK! 🚨'}
          </h1>
        </div>

        {/* Center: Extra-large Ribbit (concerned / panicking state, ~200px) */}
        <div className="flex flex-col items-center justify-center my-auto z-10">
          <RibbitMascot state="concerned" size={190} showBreathing={true} />
          {/* Urgent message in Inter, 18px */}
          <p className="font-sans font-medium text-base sm:text-lg text-(--color-theme-text) text-center mt-3 max-w-lg leading-relaxed px-2">
            {data.body}
          </p>
        </div>

        {/* Bottom Section: Single large button & XP reminder */}
        <div className="w-full space-y-2.5 z-10">
          {/* Single large button: "✓ I'm sitting up! Let me get back to work!" */}
          <button
            type="button"
            onClick={handleSittingUp}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl bg-(--color-frog-green) hover:bg-(--color-frog-green-secondary) text-white font-display font-bold text-base sm:text-lg tracking-wide shadow-lg shadow-(--color-frog-green)/35 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>✓ I'm sitting up! Let me get back to work!</span>
          </button>

          {/* XP reminder: "You'll earn +10 XP for checking in!" */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-(--color-golden-xp) font-medium">
            <Sparkles className="w-3.5 h-3.5 text-(--color-golden-xp)" />
            <span>You'll earn +10 XP for checking in!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationFullscreen;
