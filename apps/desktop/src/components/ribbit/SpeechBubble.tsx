import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { RibbitState } from '@posture-check/shared';

export interface SpeechBubbleProps {
  /** The message text to display in the speech bubble */
  message: string | null;
  /** Current Ribbit state to influence accents or icons */
  state?: RibbitState;
  /** Time in ms before automatically fading out. Pass null for persistent messages. Default: 5000 */
  autoHideMs?: number | null;
  /** Callback fired when dismissed either via auto-hide or user click */
  onDismiss?: () => void;
  /** Additional custom classes */
  className?: string;
  /** Whether to show a tiny close button in the corner */
  showCloseButton?: boolean;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  message,
  state = 'idle',
  autoHideMs = 5000,
  onDismiss,
  className = '',
  showCloseButton = true,
}) => {
  const [visible, setVisible] = useState(Boolean(message));
  const [currentText, setCurrentText] = useState<string | null>(message);

  useEffect(() => {
    if (message) {
      setCurrentText(message);
      setVisible(true);

      if (autoHideMs !== null && autoHideMs > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, autoHideMs);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [message, autoHideMs, onDismiss]);

  if (!visible || !currentText) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    onDismiss?.();
  };

  // Distinct border & glow based on emotional state
  const { bubbleClass, tailBorder } = (() => {
    switch (state) {
      case 'concerned':
        return {
          bubbleClass: 'border-coral-alert/50 shadow-coral-alert/10',
          tailBorder: 'border-coral-alert/50',
        };
      case 'celebrating':
        return {
          bubbleClass: 'border-golden-xp/60 shadow-golden-xp/20',
          tailBorder: 'border-golden-xp/60',
        };
      case 'sleeping':
        return {
          bubbleClass: 'border-sky-blue/40 shadow-sky-blue/10',
          tailBorder: 'border-sky-blue/40',
        };
      case 'disappointed':
        return {
          bubbleClass: 'border-theme-border shadow-black/10',
          tailBorder: 'border-theme-border',
        };
      case 'reminding':
        return {
          bubbleClass: 'border-frog-green shadow-frog-green/20',
          tailBorder: 'border-frog-green',
        };
      default:
        return {
          bubbleClass: 'border-frog-green/40 shadow-frog-green/10',
          tailBorder: 'border-frog-green/40',
        };
    }
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative inline-block max-w-sm px-4 py-2.5 rounded-2xl bg-theme-surface/95 backdrop-blur-md border ${bubbleClass} text-theme-text text-sm font-sans shadow-lg select-none animate-pop-in transition-all duration-200 z-10 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <p className="font-medium text-xs sm:text-sm leading-snug flex-1 pr-1 text-balance">
          {currentText}
        </p>
        {showCloseButton && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss message"
            className="text-theme-muted hover:text-theme-text rounded-md p-0.5 hover:bg-theme-bg/60 transition-colors shrink-0 -mr-1 -mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Downward pointing speech bubble tail pointing to Ribbit below */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden pointer-events-none">
        <div
          className={`w-3 h-3 bg-theme-surface border-r border-b ${tailBorder} rotate-45 transform origin-top-left translate-x-1 -translate-y-1 shadow-xs`}
        />
      </div>
    </div>
  );
};

export default SpeechBubble;
