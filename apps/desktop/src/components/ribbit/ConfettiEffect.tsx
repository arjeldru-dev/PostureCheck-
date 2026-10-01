import React, { useEffect, useRef } from 'react';

export interface ConfettiEffectProps {
  /** Whether the confetti animation is actively running */
  active?: boolean;
  /** Duration in milliseconds before auto-stopping (default: 4500) */
  duration?: number;
  /** Maximum number of particles (default: 45 to guarantee 60fps without frame drops) */
  particleCount?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = [
  '#4CAF50', // Frog green
  '#FFD54F', // Golden XP
  '#81C784', // Lily pad
  '#42A5F5', // Sky blue
  '#FF7043', // Coral
  '#FFFFFF', // Crisp white
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  active = true,
  duration = 4500,
  particleCount = 45,
  onComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();

    // Resize canvas to parent container or window
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = (rect.width || 360) * dpr;
      canvas.height = (rect.height || 360) * dpr;
      ctx.scale(dpr, dpr);
    };

    updateSize();

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 360;

    // Initialize 45 lightweight particles exploding upward from Ribbit center
    const particles: Particle[] = Array.from({ length: particleCount }).map(() => {
      const angle = (Math.random() * Math.PI) / 1.2 + Math.PI / 10; // upward spread
      const speed = Math.random() * 6 + 4;
      return {
        x: width / 2 + (Math.random() * 40 - 20),
        y: height * 0.65,
        vx: (Math.random() - 0.5) * speed * 1.5,
        vy: -Math.abs(Math.sin(angle) * speed),
        size: Math.random() * 6 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      };
    });

    const gravity = 0.16;
    const friction = 0.985;

    const render = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        onComplete?.();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Fade out near the end
      const globalAlpha = elapsed > duration - 1000 ? Math.max(0, (duration - elapsed) / 1000) : 1;

      particles.forEach((p) => {
        p.vy += gravity;
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity * globalAlpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, duration, particleCount, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full z-20 ${className}`}
    />
  );
};

export default ConfettiEffect;
