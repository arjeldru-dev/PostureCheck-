# 3.2 Streak Tracking

## Context

<context>
This step implements the streak system — consecutive days of meeting the posture check goal. A streak day is counted when the user acknowledges ≥80% of fired reminders in a calendar day (in their local timezone). Streaks are a key engagement driver (per the spec, inspired by Duolingo). The system includes a streak freeze mechanic (earned at Level 5) that forgives one missed day per week. This implements the Streak System from Feature 3.7.
</context>

## Prerequisites

<prerequisites>
- Step 3.1 (XP & Level System) complete
- SQLite `user_progress` and `posture_checks` tables functional
- Timer and notification acknowledgment flow working
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create streak calculation utilities**
   - `packages/shared/src/utils/streak.ts`:
     - `calculateDailyAcknowledgmentRate(checks: PostureCheck[]): number` — percentage of acknowledged checks for a given day (0–100)
     - `isDayComplete(checks: PostureCheck[], threshold: number = 80): boolean` — true if ≥80% acknowledged
     - `calculateStreak(dailyHistory: DayRecord[]): number` — counts consecutive complete days backward from today
     - `shouldStreakBreak(lastCompleteDate: string, today: string, hasFreeze: boolean): { broken: boolean, freezeUsed: boolean }`
     - `getStreakMilestone(streak: number): number | null` — returns milestone if streak is 7, 14, 30, 60, or 100; null otherwise

2. **Implement the streak update logic**
   - At the end of each calendar day (midnight local time), or when the app is opened on a new day:
     1. Calculate yesterday's acknowledgment rate
     2. If ≥80%: increment streak, update `last_check_date`
     3. If <80% and streak freeze available: use freeze, keep streak, mark freeze used
     4. If <80% and no freeze: break streak, set `current_streak = 0`, show Ribbit "disappointed"
   - Also check on app startup (user might have missed checking yesterday)
   - Streak freeze resets weekly (every Monday)

3. **Create the streak display component**
   - `apps/desktop/src/components/gamification/StreakCounter.tsx`:
     - Shows the current streak number with a flame 🔥 emoji/icon
     - Flame icon flickers with a CSS animation (continuous, subtle)
     - Color intensifies at milestones: 1–6 days (orange), 7–29 days (bright orange-red), 30+ days (golden)
     - Shows "🔥 7-day streak!" text below the counter
     - If streak is 0: shows "Start your streak today!" with a dimmed flame
     - Streak freeze indicator: small shield icon if freeze is available, "Used" if consumed this week

4. **Create the daily summary component**
   - `apps/desktop/src/components/gamification/DailySummary.tsx`:
     - Shows today's posture score: "8/10 checks (80%) ✅" or "5/10 checks (50%) ⚠️"
     - Visual progress ring/circle showing the acknowledgment rate
     - Color: green if ≥80%, yellow if 50–79%, red if <50%
     - Shows whether today "counts" toward the streak or not

5. **Integrate streak with the gamification store**
   - Update `gamificationStore.ts`:
     - Add state: `currentStreak`, `longestStreak`, `streakFreezeAvailable`, `todayChecks`, `todayAcknowledged`
     - Add actions: `checkStreakStatus()`, `useStreakFreeze()`, `resetWeeklyFreeze()`
     - `handleAcknowledge()` now also updates `todayAcknowledged` count
   - On app startup: call `checkStreakStatus()` to update streak based on yesterday's data

6. **Wire streak milestones to Ribbit celebrations**
   - When a streak milestone is hit (7, 14, 30, 60, 100 days):
     - Ribbit shows "celebrating" state
     - Speech bubble shows milestone message from the message rotation engine
     - If streak ≥30: unlock golden frog messages
   - When streak breaks:
     - Ribbit shows "disappointed" state briefly
     - Then shows encouragement: "Don't worry! Let's start a new streak today! 🐸"
</instructions>

<requirements>
### Functional Requirements
- Streak = consecutive days with ≥80% reminder acknowledgment rate
- Streak freeze: 1 free missed day per week (earned at Level 5+, resets Monday)
- Streak never goes negative (minimum is 0)
- Milestones at 7, 14, 30, 60, 100 days trigger celebrations
- 30+ day streak unlocks golden frog messages
- Broken streak shows Ribbit disappointed, then encouraging
- Daily posture score shows real-time acknowledgment rate

### Technical Requirements
- Streak calculation based on user's local timezone
- Pure utility functions in shared package (testable without app context)
- Streak checked on app startup and at midnight (schedule a check)
- `longestStreak` tracks the all-time record

### File Naming Conventions
- Utilities: kebab-case (`streak.ts`)
- Components: PascalCase (`StreakCounter.tsx`, `DailySummary.tsx`)
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/utils/streak.ts` — Streak calculation utilities
2. `apps/desktop/src/components/gamification/StreakCounter.tsx` — Streak flame display
3. `apps/desktop/src/components/gamification/DailySummary.tsx` — Daily posture score
4. `apps/desktop/src/stores/gamificationStore.ts` — MODIFIED: add streak state and logic
</output_files>

## Verification

<verification>
- [ ] After acknowledging ≥80% of today's reminders, streak increments at day rollover
- [ ] After acknowledging <80% with no freeze, streak resets to 0
- [ ] After acknowledging <80% with freeze available, streak is preserved and freeze is consumed
- [ ] `StreakCounter` shows correct flame icon and streak number
- [ ] Flame animation flickers continuously
- [ ] Reaching a 7-day streak triggers Ribbit celebration
- [ ] Breaking a streak shows Ribbit "disappointed" then "encouraging"
- [ ] Daily summary shows real-time acknowledgment rate (updates as checks are acknowledged)
- [ ] Streak persists after app restart
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Streak doesn't increment at midnight | Midnight check not scheduled | Use `setTimeout` to schedule a check at the next midnight in local time |
| Streak breaks incorrectly after timezone change | Using UTC instead of local time | Use `Intl.DateTimeFormat` with the user's timezone for date boundaries |
| Streak freeze resets mid-week | Reset logic keyed to wrong day | Check `dayOfWeek === 1` (Monday) for weekly freeze reset |
| Daily summary shows wrong percentage | Counting all checks instead of today's | Filter `posture_checks` by `fired_at >= today 00:00` in local time |

---

**Previous**: [3.1 — XP & Level System](./01_xp_level_system.md) | **Next**: [3.3 — Achievements System](./03_achievements_system.md)
