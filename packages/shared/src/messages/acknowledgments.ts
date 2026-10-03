// ============================================================================
// Acknowledgment Messages (Shown when user acknowledges reminder)
// ============================================================================

export const ACKNOWLEDGMENT_MESSAGES: readonly string[] = [
  "Great job! Your back thanks you! 🐸",
  "That's what I'm talking about! 💪",
  "Ribbit! You're a posture champion!",
  "Posture logged! Spine aligned and shining! ✨",
  "Look at that royal posture! Long live your spine! 👑",
  "Smooth adjustment! Ribbit nods in deep approval.",
  "+10 XP secured! Feeling tall and proud. 🌟",
  "Spine aligned, mind focused! Back to crushing it! 🚀",
  "Awesome job! Sitting tall looks great on you! 👍🐸",
  "Habit point claimed! Every little check counts!",
  "A majestic reset! The lily pad salutes you 🪷",
  "Ribbit is doing a happy hop! Fantastic posture! 🐸🎉",
  "Your back is rejoicing right now! Keep it up!",
  "Posture master in the making! Streak safe and sound!",
  "Spinal harmony restored. Carry on, legend! 🌿",
];

// ============================================================================
// Streak Celebration Messages
// ============================================================================

export const STREAK_MILESTONES: Readonly<Record<number, string>> = {
  3: "🔥 3-day streak! You're on fire!",
  7: "🔥 7 days! Week warrior! Ribbit! 🐸",
  14: "🔥 14 days! Two solid weeks of posture perfection! 🌟",
  21: "🔥 21 days! Habit officially forged in stone! 💪",
  30: "🔥 30 days! You're a posture legend! Golden Frog unlocked! 👑🐸",
  60: "🔥 60 days! Unstoppable spinal discipline! Two full months! 🏆",
  90: "🔥 90 days! A quarterly masterpiece of posture mastery! ✨",
  100: "🔥 100 days! Triple-digit royalty! Century Club champion! 👑🎉",
  365: "🔥 365 days! ONE FULL YEAR of elite posture! True legend status! 🪷👑",
};

/**
 * Returns a streak-specific celebration message.
 * Formats dedicated milestone copy for key day targets (3, 7, 14, 21, 30, 60, 90, 100, 365),
 * and dynamic streak celebration copy for any arbitrary day count.
 */
export function getStreakMilestoneMessage(streakDays: number): string {
  if (streakDays <= 0) {
    return "🌱 Day 1 starts today! Every great posture habit begins with a single hop! 🐸";
  }

  if (streakDays === 1) {
    return "🌱 Day 1 logged! The journey to healthy posture begins! 🐸";
  }

  if (STREAK_MILESTONES[streakDays]) {
    return STREAK_MILESTONES[streakDays];
  }

  return `🔥 ${streakDays}-day streak! Keep that posture flame burning! Ribbit! 🐸`;
}

/**
 * Returns a random acknowledgment message from the curated positive pool.
 */
export function getRandomAcknowledgmentMessage(lastMessage?: string): string {
  const candidates =
    ACKNOWLEDGMENT_MESSAGES.length > 1 && lastMessage
      ? ACKNOWLEDGMENT_MESSAGES.filter((msg) => msg !== lastMessage)
      : ACKNOWLEDGMENT_MESSAGES;

  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] || ACKNOWLEDGMENT_MESSAGES[0];
}
