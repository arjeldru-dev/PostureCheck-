/**
 * Lightweight Web Audio Sound Synthesizer
 * Zero dependencies, works offline in desktop Tauri and browser.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a warm two-tone chime when posture check is acknowledged
 */
export function playAcknowledgeSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.35);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.4);
}

/**
 * Play a celebratory rising arpeggio when a milestone is achieved
 */
export function playCelebrationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.14, noteTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.45);
  });
}

/**
 * Play a gentle reminder bell
 */
export function playReminderSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.55);
}
