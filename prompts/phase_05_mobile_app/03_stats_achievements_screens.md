# 5.3 Stats & Achievements Screens

## Context

<context>
This step builds the Stats and Achievements screens for the mobile app. The Stats screen shows weekly/monthly posture data visualized as charts. The Achievements screen mirrors the desktop gallery with badge collection and locked/unlocked states. Both screens pull data from SQLite (local) and sync with Supabase when signed in.
</context>

## Prerequisites

<prerequisites>
- Step 5.2 (Mobile Dashboard) complete
- Gamification store with XP, level, streak, achievement data
- Shared utilities for achievements and streak calculations
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Build the Stats screen**
   - `apps/mobile/app/(tabs)/stats.tsx`:
     - **Header**: "Your Posture Stats" with date range selector (This Week / This Month / All Time)
     - **Weekly chart**: Bar chart showing daily acknowledgment rate (Mon–Sun), bars colored green/yellow/red
     - **Summary cards**: Total checks this period, average posture score, best day, total XP earned
     - **Streak history**: Visual timeline of streak periods (horizontal bar segments)
     - **Posture heatmap** (optional): hour-of-day × day-of-week grid showing when posture is best/worst
   - Use `react-native-chart-kit` or `victory-native` for charts

2. **Build the Achievements screen**
   - `apps/mobile/app/(tabs)/achievements.tsx`:
     - **Header**: "Achievements — 4/10 unlocked" with progress bar
     - **Badge grid**: 2 columns of achievement badges
     - Unlocked: full color, emoji icon, name, unlock date
     - Locked: grayscale, lock overlay, hint text
     - Tapping a badge shows a bottom sheet with full details and conditions
     - Categories: scrollable horizontal chip filter (All, Milestones, Habits, Actions)

3. **Create chart components**
   - `apps/mobile/components/stats/WeeklyChart.tsx` — Bar chart for daily acknowledgment rate
   - `apps/mobile/components/stats/SummaryCard.tsx` — Stat card for summaries
   - `apps/mobile/components/stats/StreakTimeline.tsx` — Visual streak history

4. **Create mobile achievement components**
   - `apps/mobile/components/achievements/AchievementCard.tsx` — Badge card for the grid
   - `apps/mobile/components/achievements/AchievementDetail.tsx` — Bottom sheet with full details

5. **Query posture check data from SQLite**
   - Create query functions in `apps/mobile/lib/queries.ts`:
     - `getWeeklyStats(weekStart)` → daily aggregates for the week
     - `getMonthlyStats(monthStart)` → daily aggregates for the month
     - `getAchievements()` → all achievements with unlock status
     - `getStreakHistory()` → list of streak periods with start/end dates
</instructions>

<requirements>
### Functional Requirements
- Stats screen shows meaningful posture data with visual charts
- Charts render correctly with real data from SQLite
- Achievements screen shows all 10 badges with correct locked/unlocked states
- Tapping a badge shows detailed information
- Date range selector filters stats data (week/month/all time)

### Technical Requirements
- Chart library compatible with Expo SDK 57
- Charts render at 60fps (no lag during scrolling)
- Bottom sheet for achievement details uses `@gorhom/bottom-sheet` or similar
- Data queries are memoized to avoid re-fetching on every render

### File Naming Conventions
- Route files: lowercase in `app/(tabs)/`
- Components: PascalCase in their respective directories
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/app/(tabs)/stats.tsx` — Stats screen
2. `apps/mobile/app/(tabs)/achievements.tsx` — Achievements screen
3. `apps/mobile/components/stats/WeeklyChart.tsx`
4. `apps/mobile/components/stats/SummaryCard.tsx`
5. `apps/mobile/components/stats/StreakTimeline.tsx`
6. `apps/mobile/components/achievements/AchievementCard.tsx`
7. `apps/mobile/components/achievements/AchievementDetail.tsx`
8. `apps/mobile/lib/queries.ts` — Data query functions
</output_files>

## Verification

<verification>
- [ ] Stats screen shows a bar chart for the current week with real data
- [ ] Switching date range (week/month) updates the chart
- [ ] Summary cards show correct totals for the selected period
- [ ] Achievements screen shows all 10 badges in a 2-column grid
- [ ] Unlocked badges are colorful; locked badges are grayscale
- [ ] Tapping a badge opens a bottom sheet with details
- [ ] Empty state shows "Start checking your posture to see stats!"
</verification>

---

**Previous**: [5.2 — Mobile Dashboard](./02_mobile_dashboard.md) | **Next**: [5.4 — Mobile Settings](./04_mobile_settings.md)
