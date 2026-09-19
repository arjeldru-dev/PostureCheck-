# 3.1 XP & Level System

## Context

<context>
This step implements the core XP and level progression system for Posture Check!. XP is earned by acknowledging reminders, completing daily goals, and maintaining streaks. XP accumulates toward level milestones (Tadpole → Zen Master, 25 levels). XP never decreases — only positive reinforcement. The calculation logic lives in the shared package so it's consistent between desktop and mobile. This implements the XP System and Level Progression from Feature 3.7 (Gamification Engine) in the spec.
</context>

## Prerequisites

<prerequisites>
- Phase 2 complete (Ribbit, notifications, message rotation all functional)
- SQLite `user_progress` table exists (from Step 1.4)
- Shared package constants for XP values and level thresholds (from Step 0.1)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Define XP reward constants in the shared package**
   - Update `packages/shared/src/constants/index.ts`:
     - `XP_PER_ACKNOWLEDGE = 10`
     - `XP_DAILY_COMPLETION_BONUS = 50`
     - `XP_STREAK_BONUS_PER_DAY = 5` (capped at `XP_STREAK_BONUS_CAP = 100`)
     - `XP_ACHIEVEMENT_MIN = 25`, `XP_ACHIEVEMENT_MAX = 100`

2. **Define level thresholds in the shared package**
   - `LEVEL_THRESHOLDS` array matching the spec:

   | Level | XP Required | Title |
   |-------|------------|-------|
   | 1 | 0 | Tadpole |
   | 2 | 100 | Froglet |
   | 3 | 300 | Hopper |
   | 4 | 600 | Leaper |
   | 5 | 1,000 | Tree Frog |
   | 6 | 1,500 | Spring Peeper |
   | 7 | 2,200 | Chorus Frog |
   | 8 | 3,000 | Red-Eyed |
   | 9 | 4,000 | Glass Frog |
   | 10 | 5,000 | Poison Dart |
   | 11 | 6,200 | Mantella |
   | 12 | 7,500 | Tomato Frog |
   | 13 | 9,000 | Pacman Frog |
   | 14 | 10,500 | Goliath |
   | 15 | 12,000 | Bull Frog |
   | 16 | 14,000 | Coqui |
   | 17 | 16,500 | Darwin's Frog |
   | 18 | 19,500 | Golden Poison |
   | 19 | 22,500 | Amazon Milk |
   | 20 | 25,000 | Frog Prince/Princess |
   | 21 | 30,000 | Sage Toad |
   | 22 | 35,000 | Mystic Frog |
   | 23 | 40,000 | Elder Ribbit |
   | 24 | 45,000 | Ascended Frog |
   | 25 | 50,000 | Zen Master |

3. **Create XP calculation utilities in the shared package**
   - `packages/shared/src/utils/xp.ts`:
     - `calculateXpForAcknowledge(): number` — returns 10 XP
     - `calculateStreakBonus(streakDays: number): number` — returns min(streakDays × 5, 100)
     - `calculateDailyCompletionBonus(acknowledgedCount: number, totalCount: number): number` — returns 50 if all reminders acknowledged, 0 otherwise
     - `calculateLevelFromXp(totalXp: number): { level: number, title: string, xpForCurrentLevel: number, xpForNextLevel: number, progressPercent: number }`
     - `getXpToNextLevel(totalXp: number): number` — XP remaining until next level
     - `isLevelUp(previousXp: number, newXp: number): boolean` — true if XP crossed a level boundary

4. **Create the gamification Zustand store**
   - `apps/desktop/src/stores/gamificationStore.ts`:
     - State: `totalXp`, `currentLevel`, `levelTitle`, `progressPercent`, `xpToNextLevel`
     - Actions:
       - `addXp(amount: number, source: string)` — adds XP, checks for level-up, updates SQLite
       - `handleAcknowledge()` — grants acknowledge XP + checks daily completion + checks streak bonus
     - On level-up: emit a `level-up` event with old and new level info
     - On XP gain: emit an `xp-gained` event with the amount and source
     - Initialize from SQLite `user_progress` table on app start

5. **Integrate XP earning into the notification acknowledgment flow**
   - When user acknowledges a reminder:
     1. Call `gamificationStore.handleAcknowledge()`
     2. Calculate XP: base (10) + streak bonus (0–100) + daily completion bonus (0 or 50)
     3. Update `user_progress` in SQLite
     4. Update `posture_checks` record with `xp_earned`
     5. Show XP earned in the UI (Ribbit speech bubble: "+10 XP! 🐸")
     6. If level-up: trigger celebration (built in Step 3.5)

6. **Create XP display components**
   - `apps/desktop/src/components/gamification/XpCounter.tsx` — Animated XP counter that counts up when XP is earned (using JetBrains Mono font)
   - `apps/desktop/src/components/gamification/LevelBadge.tsx` — Shows current level number and title with frog-themed styling
   - `apps/desktop/src/components/gamification/XpProgressBar.tsx` — Progress bar from current level to next level, fills with frog-green gradient, shows "450 / 1,000 XP" text
</instructions>

<requirements>
### Functional Requirements
- Acknowledging a reminder always grants exactly +10 XP
- Daily completion bonus (+50 XP) only triggers when ALL reminders in a day are acknowledged
- Streak bonus scales: +5 XP × streak days, capped at +100 XP per day
- XP never decreases (no punishment mechanics)
- Level-up is detected immediately when XP crosses a threshold
- Level titles match the spec exactly

### Technical Requirements
- All XP/level calculation functions are pure (no side effects) and live in the shared package
- Gamification store loads initial state from SQLite on app start
- SQLite updates are async and don't block the UI
- XP counter animation uses `requestAnimationFrame` for smooth counting

### File Naming Conventions
- Utility files: kebab-case (`xp.ts`)
- Components: PascalCase (`XpCounter.tsx`, `LevelBadge.tsx`)
- Stores: camelCase (`gamificationStore.ts`)
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/constants/index.ts` — MODIFIED: add XP and level constants
2. `packages/shared/src/utils/xp.ts` — XP calculation utilities
3. `apps/desktop/src/stores/gamificationStore.ts` — Gamification state management
4. `apps/desktop/src/components/gamification/XpCounter.tsx` — Animated XP counter
5. `apps/desktop/src/components/gamification/LevelBadge.tsx` — Level badge display
6. `apps/desktop/src/components/gamification/XpProgressBar.tsx` — XP progress bar
7. `apps/desktop/src/hooks/useNotifications.ts` — MODIFIED: integrate XP earning on acknowledge
</output_files>

## Verification

<verification>
- [ ] Acknowledging a reminder shows "+10 XP" in the UI
- [ ] `calculateLevelFromXp(0)` returns Level 1 "Tadpole"
- [ ] `calculateLevelFromXp(100)` returns Level 2 "Froglet"
- [ ] `calculateLevelFromXp(50000)` returns Level 25 "Zen Master"
- [ ] `isLevelUp(95, 105)` returns true (crossed Level 2 boundary)
- [ ] `isLevelUp(105, 115)` returns false (still Level 2)
- [ ] XP counter animates when XP is earned (smooth count-up)
- [ ] Progress bar fills proportionally to XP within the current level
- [ ] Level badge shows the correct level number and title
- [ ] Total XP persists in SQLite after app restart
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| XP not persisting after restart | SQLite update not called | Verify `gamificationStore.addXp()` calls the database update command |
| Level-up not detected | XP comparison logic error | Verify `isLevelUp` compares against `LEVEL_THRESHOLDS` correctly |
| XP counter doesn't animate | Not using `requestAnimationFrame` or wrong state update | Use a ref to track the animation target and lerp toward it |
| Progress bar shows wrong percentage | XP range calculation error | `progressPercent = (currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp) * 100` |

---

**Next**: [3.2 — Streak Tracking](./02_streak_tracking.md)
