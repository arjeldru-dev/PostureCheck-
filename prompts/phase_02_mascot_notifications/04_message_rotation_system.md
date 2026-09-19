# 2.4 Message Rotation System

## Context

<context>
This step builds Ribbit's message rotation engine — the system that selects and delivers randomized, personality-driven messages for each posture reminder. Ribbit has 50+ messages organized by intensity level and tone (encouraging, sassy, minimal), ensuring messages never repeat back-to-back and always feel fresh. This is what gives the app its personality and differentiates it from a simple timer. The messages are stored in the shared package so both desktop and mobile apps use the same pool.
</context>

## Prerequisites

<prerequisites>
- Steps 2.1–2.3 complete (Ribbit integration, all notification levels, notification UI)
- `@posture-check/shared` package has a `messages/` module stub (from Step 0.1)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Define the message catalog in the shared package**
   - Update `packages/shared/src/messages/index.ts` with the full message catalog
   - Organize messages by intensity level AND tone:

   **Structure:**
   ```
   messages[intensityLevel][tone] = string[]
   ```

   **Tones:**
   - `encouraging` — warm, supportive, motivating (default)
   - `sassy` — playful, witty, slightly cheeky
   - `minimal` — short, to-the-point, no fluff

   **Messages per level (minimum counts):**
   - Level 1 (Whisper): 10+ messages per tone — very brief, gentle
   - Level 2 (Nudge): 12+ messages per tone — friendly, casual
   - Level 3 (Reminder): 12+ messages per tone — clear, motivating
   - Level 4 (Alert): 8+ messages per tone — urgent, direct
   - Level 5 (Wake Up!): 6+ messages per tone — intense, cannot-ignore

   **Example messages by level and tone:**

   Level 1 (Whisper) — Encouraging:
   - "Psst! Quick posture check 🐸"
   - "How's your back doing?"
   - "Gentle reminder: sit tall!"

   Level 2 (Nudge) — Encouraging:
   - "Hey friend! Time for a posture check 🐸"
   - "Your spine says thank you when you sit up!"
   - "Quick stretch? Even frogs need to hop around!"

   Level 2 (Nudge) — Sassy:
   - "Ribbit! Are you slouching again? 👀"
   - "I see that slouch... don't make me ribbit louder!"
   - "Plot twist: your chair isn't a bed 🐸"

   Level 3 (Reminder) — Encouraging:
   - "Time to sit up straight! You got this 💪🐸"
   - "Your future self thanks you for good posture!"
   - "Ribbit! Posture check time — let's go!"

   Level 4 (Alert) — All tones more urgent:
   - "⏰ Hey! This is your posture reminder! Sit up NOW!"
   - "Your back is literally begging you right now!"
   - "RIBBIT! I'm not going away until you fix that posture!"

   Level 5 (Wake Up!) — All tones very direct:
   - "🚨 POSTURE EMERGENCY! Sit up RIGHT NOW! 🚨"
   - "THIS IS NOT A DRILL! Your spine needs you!"
   - "I will NOT stop until you sit up straight!"

2. **Implement the message rotation engine**
   - Create `packages/shared/src/messages/rotation.ts`
   - `MessageRotationEngine` class:
     - Constructor: takes the message catalog
     - `getNextMessage(level: IntensityLevel, tone: MessageTone): string`
       - Returns a random message from the appropriate level + tone pool
       - Guarantees no back-to-back repeat (tracks the last 5 messages shown)
       - If the pool is exhausted (all shown recently), reset the tracker
     - `getAcknowledgmentMessage(): string` — returns a positive response message for when the user acknowledges
       - "Great job! Your back thanks you! 🐸"
       - "That's what I'm talking about! 💪"
       - "Ribbit! You're a posture champion!"
     - `getStreakMessage(streakDays: number): string` — returns a streak-specific celebration message
       - "🔥 3-day streak! You're on fire!"
       - "🔥 7 days! Week warrior! Ribbit!"
       - "🔥 30 days! You're a posture legend!"

3. **Create the golden frog messages (30+ day streak)**
   - Per the spec: users with >30-day streaks unlock "golden frog" special messages
   - Create a separate message pool for golden frog messages:
     - "✨ The Golden Frog speaks: your posture is magnificent!"
     - "✨ 30+ days! I've evolved into my golden form for you!"
   - These replace regular messages when the streak exceeds 30 days

4. **Integrate the rotation engine with the notification system**
   - Modify the notification flow:
     1. Timer fires
     2. Get current intensity level and message tone from settings
     3. Call `rotationEngine.getNextMessage(level, tone)`
     4. Pass the message to the notification manager
     5. Log the message in the posture check record (SQLite)
   - On acknowledgment: show `getAcknowledgmentMessage()` in the speech bubble

5. **Add message tone to settings**
   - The "Mascot" section in settings (from Step 1.5) should have:
     - Tone selector: Encouraging (default) / Sassy / Minimal
     - Preview: shows 3 sample messages for the selected tone
   - Tone preference stored in settings and passed to the rotation engine
</instructions>

<requirements>
### Functional Requirements
- 50+ unique messages across all levels and tones (minimum)
- Messages never repeat back-to-back (at least 5 unique messages between repeats)
- Each intensity level has messages appropriate to its urgency
- Three tone options: encouraging, sassy, minimal
- Acknowledgment messages are positive and varied
- Streak messages celebrate milestones (7, 14, 30, 60, 100 days)
- Golden frog messages unlock at 30+ day streak
- Message tone is configurable in settings

### Technical Requirements
- Messages stored as constants in the shared package (not in a database)
- Rotation engine is pure TypeScript with no side effects (testable)
- Rotation state (recently shown messages) persisted in memory (reset on app restart is fine)
- Engine is importable by both desktop and mobile apps via `@posture-check/shared`

### File Naming Conventions
- Message files: kebab-case (`rotation.ts`, `catalog.ts`)
- Constants: UPPER_SNAKE_CASE for message arrays
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/messages/catalog.ts` — Full message catalog (50+ messages)
2. `packages/shared/src/messages/rotation.ts` — Message rotation engine
3. `packages/shared/src/messages/acknowledgments.ts` — Acknowledgment and streak messages
4. `packages/shared/src/messages/golden-frog.ts` — Golden frog special messages
5. `packages/shared/src/messages/index.ts` — MODIFIED: barrel export
6. `apps/desktop/src-tauri/src/notifications.rs` — MODIFIED: use rotation engine for messages
7. `apps/desktop/src/components/settings/NotificationSettings.tsx` — MODIFIED: add tone selector
</output_files>

## Verification

<verification>
- [ ] `getNextMessage(2, 'encouraging')` returns a Level 2 encouraging message
- [ ] Calling `getNextMessage` 10 times in a row produces no back-to-back repeats
- [ ] Calling `getNextMessage` with different levels returns level-appropriate messages
- [ ] Level 1 messages are brief and gentle; Level 5 messages are urgent and direct
- [ ] `getAcknowledgmentMessage()` returns a positive message
- [ ] `getStreakMessage(7)` returns a 7-day celebration message
- [ ] Changing tone in settings changes the messages in subsequent notifications
- [ ] Messages import correctly in both desktop and mobile apps
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Same message appears twice in a row | Rotation tracker not working | Verify the `recentMessages` array tracks the last 5 messages and excludes them from selection |
| "No messages available" error | Wrong level/tone combination | Ensure every level × tone combination has at least 6 messages |
| Golden frog messages appear before 30-day streak | Streak check not implemented | Verify `getNextMessage` checks `currentStreak > 30` before using golden pool |
| TypeScript errors on import | Missing barrel export | Ensure `packages/shared/src/messages/index.ts` exports everything |

---

**Previous**: [2.3 — Notification UI](./03_notification_ui.md)

---

**Proceed to Phase Checklist**: [Phase 2 Checklist](./99_PHASE_CHECKLIST.md)
