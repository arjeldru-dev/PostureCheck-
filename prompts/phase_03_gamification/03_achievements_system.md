# 3.3 Achievements System

## Context

<context>
This step implements the achievement/badge system. Achievements are one-time unlockable badges earned by meeting specific conditions (streak milestones, total checks, levels reached, specific actions). They provide long-term goals and a sense of collection/completion. The achievement definitions are seeded in SQLite (from Step 1.4); this step builds the detection engine that checks for unlock conditions after each relevant action. This implements the Achievements section of Feature 3.7.
</context>

## Prerequisites

<prerequisites>
- Steps 3.1–3.2 complete (XP, levels, streaks working)
- Achievement definitions seeded in SQLite (from Step 1.4)
- Gamification store with XP and streak state
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the achievement detection engine**
   - `packages/shared/src/utils/achievements.ts`:
     - `checkAchievements(state: GameState, action: GameAction): AchievementUnlock[]`
     - Takes current gamification state and the action that just happened
     - Returns an array of newly unlocked achievements (usually 0 or 1)
     - Achievement conditions from the spec:

     | ID | Name | Condition Type | Condition Value | XP |
     |---|---|---|---|---|
     | first_ribbit | First Ribbit | action | first_acknowledge | 25 |
     | week_warrior | Week Warrior | streak | 7 | 50 |
     | month_master | Month Master | streak | 30 | 100 |
     | early_bird | Early Bird | action | acknowledge_before_7am | 25 |
     | night_owl | Night Owl | action | acknowledge_after_11pm | 25 |
     | perfect_day | Perfect Day | action | 100_percent_day | 50 |
     | phone_friend | Phone Friend | action | setup_phone_routing | 25 |
     | customizer | Customizer | action | change_intensity | 10 |
     | centurion | Centurion | total_checks | 100 | 75 |
     | frog_whisperer | Frog Whisperer | level | 10 | 100 |

   - Detection is idempotent — already-unlocked achievements are ignored

2. **Integrate achievement detection into the gamification flow**
   - After each relevant action, check for new achievements:
     - On acknowledge: check first_ribbit, early_bird, night_owl, perfect_day, centurion
     - On streak update: check week_warrior, month_master
     - On level-up: check frog_whisperer
     - On setting change: check customizer
     - On phone routing setup: check phone_friend (Phase 6)
   - When an achievement unlocks:
     1. Insert into `user_achievements` in SQLite
     2. Grant the achievement's XP reward
     3. Emit an `achievement-unlocked` event
     4. Ribbit shows "celebrating" state
     5. Show achievement toast notification with badge icon and name

3. **Create the Achievements gallery page**
   - `apps/desktop/src/pages/Achievements.tsx`:
     - Grid of achievement badges (3–4 per row)
     - Unlocked badges: full color, icon visible, name and description shown
     - Locked badges: grayscale/dimmed, lock icon overlay, hint text for how to unlock
     - Each badge has a hover tooltip showing the condition and XP reward
     - Badges are categorized: "Milestones", "Habits", "Actions"
     - Counter: "4 / 10 achievements unlocked"

4. **Create the AchievementBadge component**
   - `apps/desktop/src/components/gamification/AchievementBadge.tsx`:
     - Props: `achievement`, `isUnlocked`, `unlockedAt?`
     - Unlocked: vibrant colors, subtle glow effect, icon emoji displayed
     - Locked: grayscale, 50% opacity, lock overlay icon
     - Hover: scales up slightly, shows full details
     - Click: shows a modal with achievement details and unlock date

5. **Create the AchievementToast component**
   - `apps/desktop/src/components/gamification/AchievementToast.tsx`:
     - Slides in from the top when an achievement is unlocked
     - Shows: badge icon, achievement name, XP reward, "Achievement Unlocked!" header
     - Gold/golden-xp color theme
     - Auto-dismisses after 5 seconds
     - Clicking opens the Achievements page
</instructions>

<requirements>
### Functional Requirements
- All 10 achievements from the spec are implemented with correct conditions
- Achievement detection runs after each relevant action
- Achievements are one-time unlocks (can't be earned twice)
- Unlocking an achievement grants its XP reward
- Achievement gallery shows all badges with locked/unlocked states
- Achievement toast notification appears when a new badge is earned
- Ribbit celebrates when an achievement is unlocked

### Technical Requirements
- Detection engine is a pure function in the shared package
- Already-unlocked achievements are skipped (idempotent check)
- Achievement state loads from SQLite on app start
- Achievement unlock date is recorded with UTC timestamp

### File Naming Conventions
- Utilities: kebab-case (`achievements.ts`)
- Components: PascalCase (`AchievementBadge.tsx`, `AchievementToast.tsx`)
- Pages: PascalCase (`Achievements.tsx`)
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/utils/achievements.ts` — Achievement detection engine
2. `apps/desktop/src/pages/Achievements.tsx` — Achievement gallery page
3. `apps/desktop/src/components/gamification/AchievementBadge.tsx` — Badge component
4. `apps/desktop/src/components/gamification/AchievementToast.tsx` — Unlock toast
5. `apps/desktop/src/stores/gamificationStore.ts` — MODIFIED: integrate achievement checking
6. `apps/desktop/src/App.tsx` — MODIFIED: add Achievements route
</output_files>

## Verification

<verification>
- [ ] Acknowledging the first-ever reminder unlocks "First Ribbit" (+25 XP)
- [ ] Reaching a 7-day streak unlocks "Week Warrior" (+50 XP)
- [ ] Acknowledging a reminder before 7 AM unlocks "Early Bird" (+25 XP)
- [ ] Acknowledging 100 total reminders unlocks "Centurion" (+75 XP)
- [ ] Reaching Level 10 unlocks "Frog Whisperer" (+100 XP)
- [ ] Achievement toast slides in with gold theme on unlock
- [ ] Achievement gallery shows all 10 badges with correct locked/unlocked states
- [ ] Locked badges show hint text for how to earn them
- [ ] Already-unlocked achievements don't trigger again
- [ ] Achievement XP is added to total XP correctly
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Achievement unlocks but XP not granted | XP reward not added in the achievement handler | Ensure `addXp(achievement.xpReward, 'achievement')` is called after unlock |
| Achievement triggers multiple times | Not checking if already unlocked | Filter out achievements where `user_achievements` already has a record |
| Early Bird doesn't trigger at 6:30 AM | Timezone comparison error | Use local time, not UTC, for time-of-day checks |
| Achievement toast doesn't appear | Event not emitted or listener not set up | Verify `achievement-unlocked` event is emitted and the toast component listens for it |

---

**Previous**: [3.2 — Streak Tracking](./02_streak_tracking.md) | **Next**: [3.4 — Dashboard UI](./04_dashboard_ui.md)
