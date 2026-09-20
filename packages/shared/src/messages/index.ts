import type { IntensityLevel, MascotMessage, MascotState, MascotTone } from '../types/index.js';

export const RIBBIT_MESSAGES: readonly MascotMessage[] = [
  // --- Level 1: Whisper (Subtle, gentle, quiet) ---
  {
    id: 'w1',
    text: "Psst! How's your back feeling? 🐸",
    state: 'reminding',
    intensityLevel: 1,
    tone: 'encouraging',
  },
  {
    id: 'w2',
    text: 'Gentle check-in from your friendly frog.',
    state: 'reminding',
    intensityLevel: 1,
    tone: 'minimal',
  },
  {
    id: 'w3',
    text: 'Soft reminder: relax your shoulders. ✨',
    state: 'reminding',
    intensityLevel: 1,
    tone: 'encouraging',
  },
  {
    id: 'w4',
    text: 'Just a tiny whisper: align your spine! 🌿',
    state: 'reminding',
    intensityLevel: 1,
    tone: 'encouraging',
  },
  {
    id: 'w5',
    text: 'Unclench your jaw, soften your neck.',
    state: 'reminding',
    intensityLevel: 1,
    tone: 'minimal',
  },
  {
    id: 'w6',
    text: 'A little frog wink for your posture 😉',
    state: 'reminding',
    intensityLevel: 1,
    tone: 'encouraging',
  },

  // --- Level 2: Nudge (Friendly, toast, casual) ---
  {
    id: 'n1',
    text: 'Ribbit! Time to sit up straight! 🐸',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },
  {
    id: 'n2',
    text: 'Quick posture check! You got this 💪',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },
  {
    id: 'n3',
    text: 'Hey friend, your spine says thank you! 💚',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },
  {
    id: 'n4',
    text: 'Stretch break? Even frogs need to hop around! 🐸',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },
  {
    id: 'n5',
    text: 'Roll those shoulders back. Ah, much better!',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },
  {
    id: 'n6',
    text: 'Are you turning into a shrimp? Sit tall! 🦐',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'sassy',
  },
  {
    id: 'n7',
    text: 'Take a deep breath and reset your back.',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'minimal',
  },
  {
    id: 'n8',
    text: 'Your future self will thank you for sitting straight now.',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
  },

  // --- Level 3: Reminder (Standard banner, screen tap) ---
  {
    id: 'r1',
    text: 'Hey! Ribbit is tapping on your glass: Posture check! 🪟🐸',
    state: 'reminding',
    intensityLevel: 3,
    tone: 'encouraging',
  },
  {
    id: 'r2',
    text: "Don't ignore me! Your spine needs a quick adjustment.",
    state: 'reminding',
    intensityLevel: 3,
    tone: 'sassy',
  },
  {
    id: 'r3',
    text: 'Time to level up your posture! Sit tall and tap acknowledge.',
    state: 'reminding',
    intensityLevel: 3,
    tone: 'encouraging',
  },
  {
    id: 'r4',
    text: 'Slouching detected in spirit! Straighten up, champion.',
    state: 'reminding',
    intensityLevel: 3,
    tone: 'encouraging',
  },
  {
    id: 'r5',
    text: "Feet flat on the floor, back supported. Let's do this!",
    state: 'reminding',
    intensityLevel: 3,
    tone: 'minimal',
  },
  {
    id: 'r6',
    text: 'Posture reminder: ears over shoulders, eyes level.',
    state: 'reminding',
    intensityLevel: 3,
    tone: 'minimal',
  },
  {
    id: 'r7',
    text: "I see that monitor hunch. Don't make me hop over there!",
    state: 'reminding',
    intensityLevel: 3,
    tone: 'sassy',
  },
  {
    id: 'r8',
    text: 'Spinal health is wealth! Take 5 seconds to adjust.',
    state: 'reminding',
    intensityLevel: 3,
    tone: 'encouraging',
  },

  // --- Level 4: Alert (Large overlay, alarm, urgent) ---
  {
    id: 'a1',
    text: 'ATTENTION: Serious slouch alert! Straighten your spine now! 🚨',
    state: 'reminding',
    intensityLevel: 4,
    tone: 'sassy',
  },
  {
    id: 'a2',
    text: 'Ribbit is jumping with urgency! Back off the desk! 🐸⚡',
    state: 'reminding',
    intensityLevel: 4,
    tone: 'encouraging',
  },
  {
    id: 'a3',
    text: "You've been hunched too long! Sit up straight and claim your XP!",
    state: 'reminding',
    intensityLevel: 4,
    tone: 'encouraging',
  },
  {
    id: 'a4',
    text: 'Posture emergency! Un-hunch immediately for your own good!',
    state: 'reminding',
    intensityLevel: 4,
    tone: 'sassy',
  },
  {
    id: 'a5',
    text: 'Priority check: Lift your chest, pull back your chin.',
    state: 'reminding',
    intensityLevel: 4,
    tone: 'minimal',
  },
  {
    id: 'a6',
    text: 'Your spine called—it wants its natural curve back right now!',
    state: 'reminding',
    intensityLevel: 4,
    tone: 'sassy',
  },

  // --- Level 5: Wake Up! (Full screen overlay, blocking) ---
  {
    id: 'u1',
    text: 'WAKE UP! FULL STOP! Sit up straight, stretch your arms, and breathe! 🛑🐸',
    state: 'reminding',
    intensityLevel: 5,
    tone: 'encouraging',
  },
  {
    id: 'u2',
    text: 'EMERGENCY POSTURE INTERVENTION! Ribbit is panicking! Straighten up!',
    state: 'reminding',
    intensityLevel: 5,
    tone: 'sassy',
  },
  {
    id: 'u3',
    text: 'Screen blocked for your spinal safety! Roll your neck, align your back.',
    state: 'reminding',
    intensityLevel: 5,
    tone: 'minimal',
  },
  {
    id: 'u4',
    text: 'No more excuses! Sit up like royalty before you continue.',
    state: 'reminding',
    intensityLevel: 5,
    tone: 'sassy',
  },
  {
    id: 'u5',
    text: 'CRITICAL RESET: Stand or sit upright. Ribbit demands spine justice!',
    state: 'reminding',
    intensityLevel: 5,
    tone: 'encouraging',
  },

  // --- Encouraging (User acknowledges reminder) ---
  {
    id: 'e1',
    text: 'Awesome job! Sitting tall looks great on you! 👍🐸',
    state: 'encouraging',
    tone: 'encouraging',
  },
  {
    id: 'e2',
    text: '+10 XP! Your spine sends its warmest regards.',
    state: 'encouraging',
    tone: 'encouraging',
  },
  {
    id: 'e3',
    text: 'Nailed it! Ribbit is proud of you! ✨',
    state: 'encouraging',
    tone: 'encouraging',
  },
  {
    id: 'e4',
    text: 'Keep that habit going strong! Great posture!',
    state: 'encouraging',
    tone: 'encouraging',
  },
  {
    id: 'e5',
    text: 'Posture logged! You are on fire today! 🔥',
    state: 'encouraging',
    tone: 'encouraging',
  },
  {
    id: 'e6',
    text: 'Look at you sitting like a majestic tree frog! 🌿',
    state: 'encouraging',
    tone: 'sassy',
  },

  // --- Celebrating (Milestone, level up, achievement) ---
  {
    id: 'c1',
    text: 'HOORAY! LEVEL UP! Confetti flies everywhere! 🎉🐸🥳',
    state: 'celebrating',
    tone: 'encouraging',
  },
  {
    id: 'c2',
    text: 'NEW ACHIEVEMENT UNLOCKED! Ribbit is doing backflips! 🏆',
    state: 'celebrating',
    tone: 'encouraging',
  },
  {
    id: 'c3',
    text: 'STREAK MILESTONE! The posture flame burns brightly! 🔥',
    state: 'celebrating',
    tone: 'encouraging',
  },
  {
    id: 'c4',
    text: 'PERFECT SCORE TODAY! You are an absolute posture legend!',
    state: 'celebrating',
    tone: 'encouraging',
  },
  {
    id: 'c5',
    text: 'Ribbit presents you with a golden lily pad badge! 🌟',
    state: 'celebrating',
    tone: 'encouraging',
  },

  // --- Concerned (Long time without acknowledgment / missed checks) ---
  {
    id: 'cn1',
    text: "Hey... are you okay? Ribbit hasn't heard from you in a while. 🥺",
    state: 'concerned',
    tone: 'encouraging',
  },
  {
    id: 'cn2',
    text: "Don't forget to stretch, friend. Don't push yourself too hard.",
    state: 'concerned',
    tone: 'encouraging',
  },
  {
    id: 'cn3',
    text: 'Long focus session? Remember to blink and ease your neck.',
    state: 'concerned',
    tone: 'minimal',
  },
  {
    id: 'cn4',
    text: "I'm worried about your lower back. Take a 30-second stand break?",
    state: 'concerned',
    tone: 'encouraging',
  },

  // --- Sleeping (DND / Paused) ---
  {
    id: 's1',
    text: 'Zzz... Ribbit is resting on a lily pad. DND active. 😴',
    state: 'sleeping',
    tone: 'minimal',
  },
  {
    id: 's2',
    text: 'Shhh... Quiet hours. Rest well and recharge.',
    state: 'sleeping',
    tone: 'encouraging',
  },
  {
    id: 's3',
    text: 'Do Not Disturb mode. Ribbit will wake up when you are ready.',
    state: 'sleeping',
    tone: 'minimal',
  },

  // --- Disappointed (Broken streak) ---
  {
    id: 'd1',
    text: 'Aww, streak broken... but Ribbit believes in your fresh start! 🌱',
    state: 'disappointed',
    tone: 'encouraging',
  },
  {
    id: 'd2',
    text: "Don't be discouraged! Every master had to restart once. Day 1 starts now!",
    state: 'disappointed',
    tone: 'encouraging',
  },
  {
    id: 'd3',
    text: "A bump on the lily pad! Let's build that streak right back up. 🐸💪",
    state: 'disappointed',
    tone: 'encouraging',
  },

  // --- Idle (Dashboard resting) ---
  {
    id: 'i1',
    text: 'Ribbit is chilling on the lily pad. Ready whenever you are! 🐸',
    state: 'idle',
    tone: 'encouraging',
  },
  { id: 'i2', text: 'All quiet on the pond. Looking good today!', state: 'idle', tone: 'minimal' },
  {
    id: 'i3',
    text: 'Remember to drink some water between hops! 💧',
    state: 'idle',
    tone: 'encouraging',
  },
  { id: 'i4', text: 'Ribbit says: Healthy back, healthy mind.', state: 'idle', tone: 'minimal' },

  // --- Golden Frog Messages (> 30-day streak) ---
  {
    id: 'g1',
    text: '🌟 GOLDEN RIBBIT: 30+ days of immaculate posture! You are a Zen Master! 👑',
    state: 'reminding',
    intensityLevel: 2,
    tone: 'encouraging',
    isGoldenFrog: true,
  },
  {
    id: 'g2',
    text: '🌟 Golden Frog blessing: Your dedication shines across the entire pond!',
    state: 'celebrating',
    tone: 'encouraging',
    isGoldenFrog: true,
  },
  {
    id: 'g3',
    text: '🌟 True spinal mastery achieved. Even the golden frogs bow in respect.',
    state: 'idle',
    tone: 'encouraging',
    isGoldenFrog: true,
  },
] as const;

export interface GetRibbitMessageOptions {
  state?: MascotState;
  intensityLevel?: IntensityLevel;
  tone?: MascotTone;
  lastMessageId?: string;
  isGoldenFrog?: boolean;
}

/**
 * Returns a randomized Ribbit message matching the filter options,
 * ensuring no immediate back-to-back repetitions.
 */
export function getRandomRibbitMessage(options: GetRibbitMessageOptions = {}): MascotMessage {
  const {
    state = 'reminding',
    intensityLevel,
    tone,
    lastMessageId,
    isGoldenFrog = false,
  } = options;

  let pool = RIBBIT_MESSAGES.filter((msg) => {
    if (msg.state !== state) return false;
    if (intensityLevel !== undefined && msg.intensityLevel !== undefined) {
      if (msg.intensityLevel !== intensityLevel) return false;
    }
    if (tone !== undefined && msg.tone !== tone) return false;
    if (msg.isGoldenFrog && !isGoldenFrog) return false;
    return true;
  });

  // Fallback to state match if criteria is too strict
  if (pool.length === 0) {
    pool = RIBBIT_MESSAGES.filter((msg) => msg.state === state);
  }

  // Fallback to full pool if still empty
  if (pool.length === 0) {
    pool = [...RIBBIT_MESSAGES];
  }

  // Filter out the last message ID if more than 1 option exists
  const candidates =
    pool.length > 1 && lastMessageId ? pool.filter((msg) => msg.id !== lastMessageId) : pool;

  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected || RIBBIT_MESSAGES[0];
}
