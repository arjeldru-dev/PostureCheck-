# 5.2 Mobile Dashboard

## Context

<context>
This step builds the mobile home screen — the first screen users see when opening the app. It mirrors the desktop dashboard with Ribbit as the centerpiece, live gamification stats, and the next reminder countdown. The layout is optimized for phone screens with touch-friendly elements and platform-native feel. This is the mobile equivalent of the desktop Dashboard from Step 3.4.
</context>

## Prerequisites

<prerequisites>
- Step 5.1 complete (navigation, theming, database initialized)
- Ribbit React Native component exists (from Step 0.6)
- Gamification utilities in shared package (from Phase 3)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the mobile home screen layout**
   - `apps/mobile/app/(tabs)/index.tsx`:
     - **Top**: Ribbit mascot (large, ~180px) with speech bubble and current state
     - **Below Ribbit**: Greeting text ("Hey Alex! 🐸") and next reminder countdown
     - **Middle**: Three horizontal stat cards (scrollable if needed):
       - Level + XP progress bar
       - Streak flame counter
       - Today's posture score (circular progress)
     - **Bottom**: Quick actions row (Pause, Snooze, DND) + recent activity preview
   - Pull-to-refresh to force sync data from cloud

2. **Create mobile-specific gamification components**
   - `apps/mobile/components/gamification/MobileXpBar.tsx` — Horizontal XP progress bar, touch to see details
   - `apps/mobile/components/gamification/MobileStreakCounter.tsx` — Flame counter with haptic feedback on milestone
   - `apps/mobile/components/gamification/MobilePostureScore.tsx` — Circular progress ring showing today's rate
   - `apps/mobile/components/gamification/MobileStatCard.tsx` — Reusable stat card optimized for touch

3. **Create the mobile Ribbit component integration**
   - Use the RibbitMascot component from Step 0.6
   - Add touch interaction: tapping Ribbit plays a random encouraging message in the speech bubble
   - Ribbit state management mirrors desktop (idle, sleeping, encouraging, etc.)
   - Breathing animation with React Native Animated API

4. **Create the mobile countdown timer display**
   - `apps/mobile/components/dashboard/CountdownDisplay.tsx`:
     - Large countdown text: "Next check in 12:34" using JetBrains Mono
     - Circular progress ring around the countdown showing time elapsed
     - Color transitions: green (plenty of time) → yellow (< 5 min) → coral (< 1 min)
     - Tap to see exact next reminder time

5. **Initialize gamification store for mobile**
   - `apps/mobile/stores/gamificationStore.ts`:
     - Mirrors desktop gamification store
     - Loads from local SQLite on start
     - Syncs with Supabase when signed in
     - Shares utility functions from `@posture-check/shared`

6. **Handle push notification interaction from the home screen**
   - When user taps a push notification → app opens to this dashboard
   - Dashboard highlights the pending reminder with a visible "Acknowledge" button
   - Acknowledging from the dashboard grants XP and shows the +XP animation
</instructions>

<requirements>
### Functional Requirements
- Dashboard shows all key stats at a glance (XP, level, streak, score)
- Ribbit is interactive (tappable for random messages)
- Countdown timer updates every second
- Pull-to-refresh syncs data from cloud
- Push notification opens to dashboard with acknowledge action visible

### Technical Requirements
- React Native Animated API for Ribbit breathing (not CSS)
- NativeWind 4 for all styling
- Touch targets minimum 44×44pt
- Optimized for phones (320pt–428pt width range)
- `useMemo`/`useCallback` for performance on re-renders

### File Naming Conventions
- Screen files: lowercase route names in `app/`
- Components: PascalCase in `components/`
- Stores: camelCase in `stores/`
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/app/(tabs)/index.tsx` — MODIFIED: full mobile dashboard
2. `apps/mobile/components/gamification/MobileXpBar.tsx`
3. `apps/mobile/components/gamification/MobileStreakCounter.tsx`
4. `apps/mobile/components/gamification/MobilePostureScore.tsx`
5. `apps/mobile/components/gamification/MobileStatCard.tsx`
6. `apps/mobile/components/dashboard/CountdownDisplay.tsx`
7. `apps/mobile/stores/gamificationStore.ts`
</output_files>

## Verification

<verification>
- [ ] Dashboard loads with Ribbit, stats, and countdown on both iOS and Android
- [ ] Tapping Ribbit shows a random speech bubble message
- [ ] XP bar shows correct progress with the right level
- [ ] Streak counter shows correct flame count
- [ ] Posture score shows today's percentage in a circular ring
- [ ] Countdown timer ticks down every second
- [ ] Pull-to-refresh updates data from Supabase
</verification>

---

**Previous**: [5.1 — Navigation & Theming](./01_expo_navigation_theming.md) | **Next**: [5.3 — Stats & Achievements Screens](./03_stats_achievements_screens.md)
