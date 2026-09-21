import React from 'react';
import type { RibbitState, MascotSize } from '@posture-check/shared';
import { RIBBIT_SIZE_MAP, RIBBIT_STATE_DESCRIPTIONS } from '@posture-check/shared';

import idleSvg from '@/assets/mascot/ribbit-idle.svg';
import remindingSvg from '@/assets/mascot/ribbit-reminding.svg';
import encouragingSvg from '@/assets/mascot/ribbit-encouraging.svg';
import celebratingSvg from '@/assets/mascot/ribbit-celebrating.svg';
import concernedSvg from '@/assets/mascot/ribbit-concerned.svg';
import sleepingSvg from '@/assets/mascot/ribbit-sleeping.svg';
import disappointedSvg from '@/assets/mascot/ribbit-disappointed.svg';

const RIBBIT_SVGS: Record<RibbitState, string> = {
  idle: idleSvg,
  reminding: remindingSvg,
  encouraging: encouragingSvg,
  celebrating: celebratingSvg,
  concerned: concernedSvg,
  sleeping: sleepingSvg,
  disappointed: disappointedSvg,
};

export interface RibbitMascotProps {
  /** The current emotional state of Ribbit */
  state: RibbitState;
  /** Size preset ('sm' | 'md' | 'lg' | 'xl') or exact pixel size */
  size?: MascotSize;
  /** Additional CSS class names */
  className?: string;
  /** Whether to apply the subtle idle breathing animation (default: true) */
  showBreathing?: boolean;
  /** Custom accessible alt text description */
  alt?: string;
  /** Optional click handler */
  onClick?: () => void;
}

export const RibbitMascot: React.FC<RibbitMascotProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  showBreathing = true,
  alt,
  onClick,
}) => {
  const pixelSize = typeof size === 'number' ? size : RIBBIT_SIZE_MAP[size] ?? 96;
  const svgSource = RIBBIT_SVGS[state] || RIBBIT_SVGS.idle;
  const description = alt || `Ribbit the Frog (${state}): ${RIBBIT_STATE_DESCRIPTIONS[state] || state}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        showBreathing ? 'animate-breathe' : ''
      } ${
        onClick
          ? 'cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-frog-green rounded-xl transition-transform active:scale-95'
          : ''
      } ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        transformOrigin: 'center bottom',
      }}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={description}
    >
      <img
        src={svgSource}
        alt={description}
        width={pixelSize}
        height={pixelSize}
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm transition-transform duration-300"
        draggable={false}
        loading="eager"
      />
    </div>
  );
};

export default RibbitMascot;
