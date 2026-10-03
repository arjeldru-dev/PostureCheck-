// ============================================================================
// Golden Frog Special Messages (Unlocked at > 30-day streak)
// ============================================================================

export const GOLDEN_FROG_MESSAGES: readonly string[] = [
  "✨ The Golden Frog speaks: your posture is magnificent! 👑🐸",
  "✨ 30+ days! I've evolved into my golden form for you!",
  "✨ Golden aura activated! You have achieved true postural enlightenment!",
  "✨ Behold the Golden Ribbit: over a month of unyielding backbone excellence!",
  "✨ A radiant posture fit for the Golden Lily Pad! Keep shining!",
  "✨ The golden glow of spinal mastery illuminates your desk! 🌟",
  "✨ 30+ days unbroken! The mythical Golden Frog bows in deep respect.",
  "✨ You are among the elite few who hear the Golden Ribbit! Sit proud! 🏆",
  "✨ Pure gold! Your spine is stronger and straighter than ever before! 🌿✨",
  "✨ Legendary form unlocked: Your dedication shines across the entire pond! 👑",
  "✨ Golden Ribbit blessing: Keep sitting tall, true posture champion!",
  "✨ The sacred golden lily pad belongs to you! Incredible 30+ day streak! 🪷",
];

/**
 * Returns a random message from the Golden Frog message pool,
 * ensuring no immediate back-to-back repeats.
 */
export function getRandomGoldenFrogMessage(lastMessage?: string): string {
  const candidates =
    GOLDEN_FROG_MESSAGES.length > 1 && lastMessage
      ? GOLDEN_FROG_MESSAGES.filter((msg) => msg !== lastMessage)
      : GOLDEN_FROG_MESSAGES;

  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] || GOLDEN_FROG_MESSAGES[0];
}
