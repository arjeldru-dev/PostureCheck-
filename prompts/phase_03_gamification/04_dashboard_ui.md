# 3.4 Dashboard UI

## Context

<context>
This step builds the comprehensive gamification dashboard — the main screen users see when they open the desktop app. It brings together all gamification elements (XP, level, streak, achievements, posture score) into a polished, visually engaging layout with Ribbit as the centerpiece. The dashboard should feel like opening Duolingo or Forest — immediately showing progress, motivating continued use, and making the user feel rewarded. This enhances the Dashboard page created in Step 2.1 with full gamification data.
</context>

## Prerequisites

<prerequisites>
- Steps 3.1–3.3 complete (XP, streaks, achievements all functional)
- Dashboard page exists with Ribbit (from Step 2.1)
- All gamification components created (XpCounter, LevelBadge, XpProgressBar, StreakCounter, DailySummary)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Redesign the Dashboard layout**
   - Update `apps/desktop/src/pages/Dashboard.tsx` with a complete gamification layout:
   - **Top section**: Ribbit mascot (large, centered) with speech bubble and state
   - **Middle section**: Three-column stat cards row:
     - Left: Level badge + XP progress bar
     - Center: Streak counter with flame animation
     - Right: Today's posture score (circular progress)
   - **Bottom section**: Two-column layout:
     - Left: Recent activity feed (last 5 posture checks with timestamps and responses)
     - Right: Recent achievements (last 3 unlocked, with "See all →" link)
   - **Footer**: Next reminder countdown + quick action buttons (Pause, Snooze, DND)

2. **Create the stat card component**
   - `apps/desktop/src/components/dashboard/StatCard.tsx`:
     - Reusable card with icon, label, value, and optional trend indicator
     - Glassmorphism-inspired styling (semi-transparent, subtle border, backdrop blur)
     - Hover: subtle lift effect with shadow increase
     - Used for: total XP, level, streak, today's score, total checks

3. **Create the activity feed component**
   - `apps/desktop/src/components/dashboard/ActivityFeed.tsx`:
     - Shows last 5 posture check events
     - Each entry: time, Ribbit message snippet, response (✅ acknowledged, 💤 snoozed, ❌ dismissed/expired), XP earned
     - Color-coded: green for acknowledged, yellow for snoozed, gray for dismissed
     - Animated entrance (stagger effect, each item slides in 50ms apart)

4. **Create the recent achievements component**
   - `apps/desktop/src/components/dashboard/RecentAchievements.tsx`:
     - Shows last 3 unlocked achievement badges in a horizontal row
     - If no achievements yet: shows "Your achievements will appear here! 🐸" with the first 3 locked badges
     - "See all achievements →" link to the Achievements page
     - Badges have a subtle shimmer animation

5. **Create the quick actions bar**
   - `apps/desktop/src/components/dashboard/QuickActions.tsx`:
     - Horizontal bar with icon buttons:
       - ⏸ Pause / ▶ Resume
       - 🔕 DND (30 min)
       - ⏭ Skip Next
       - ⚙ Settings
     - Buttons have tooltip labels on hover
     - Active states (pause is toggled, DND shows remaining time)

6. **Implement responsive layout within the Tauri window**
   - Dashboard adapts to window sizes from 600×400 to 1200×800
   - At narrow widths: two-column layout collapses to single column
   - At very narrow widths: stat cards stack vertically
   - Ribbit scales proportionally with the window size

7. **Add navigation between pages**
   - Simple navigation: Dashboard, Achievements, Settings tabs
   - Use a top navigation bar or sidebar with tab icons
   - Active tab has frog-green indicator
   - Smooth page transitions (crossfade)
</instructions>

<requirements>
### Functional Requirements
- Dashboard shows all key gamification metrics at a glance
- Data is live — updates in real time as reminders fire and are acknowledged
- Quick actions work without navigating away from the dashboard
- Activity feed shows the most recent posture check events
- Recent achievements section displays unlocked badges
- Navigation allows switching between Dashboard, Achievements, and Settings

### Technical Requirements
- All data comes from the gamification Zustand store (no direct SQLite calls from components)
- Dashboard renders in <100ms (no visible loading spinner for local data)
- Animations at 60fps
- Layout is responsive within the Tauri window bounds (600×400 minimum)
- Uses the PostureCheck design system exclusively (no ad-hoc colors or fonts)

### File Naming Conventions
- Dashboard components: PascalCase in `dashboard/` directory
- Page components: PascalCase in `pages/` directory
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/pages/Dashboard.tsx` — MODIFIED: complete gamification dashboard
2. `apps/desktop/src/components/dashboard/StatCard.tsx` — Reusable stat card
3. `apps/desktop/src/components/dashboard/ActivityFeed.tsx` — Recent activity list
4. `apps/desktop/src/components/dashboard/RecentAchievements.tsx` — Achievement badges row
5. `apps/desktop/src/components/dashboard/QuickActions.tsx` — Quick action buttons
6. `apps/desktop/src/components/layout/Navigation.tsx` — Top/sidebar navigation
7. `apps/desktop/src/App.tsx` — MODIFIED: add navigation layout with routes
</output_files>

## Verification

<verification>
- [ ] Dashboard loads instantly with all gamification data populated
- [ ] Ribbit is prominently displayed with correct state
- [ ] XP counter shows the correct total with animated updates
- [ ] Level badge shows current level number and title
- [ ] XP progress bar fills to the correct percentage
- [ ] Streak counter shows current streak with flame animation
- [ ] Daily posture score shows today's acknowledgment rate
- [ ] Activity feed shows the last 5 posture checks with correct statuses
- [ ] Recent achievements section shows unlocked badges (or empty state)
- [ ] Quick action buttons work (pause, DND, skip, settings)
- [ ] Navigation between Dashboard, Achievements, Settings is smooth
- [ ] Layout adapts when window is resized
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Dashboard shows stale data | Store not subscribing to events | Ensure gamification store listens to Tauri events for real-time updates |
| Layout breaks at small window sizes | CSS not responsive | Use `min-width` media queries and Tailwind responsive classes |
| Navigation doesn't persist active tab | Route state not tracked | Use React Router or a simple state variable for active page |
| Activity feed is empty on first launch | No posture checks logged yet | Show empty state: "No posture checks yet! Your activity will appear here." |

---

**Previous**: [3.3 — Achievements System](./03_achievements_system.md) | **Next**: [3.5 — Celebration Animations](./05_celebration_animations.md)
