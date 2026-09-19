# 2.1 Ribbit Character Integration

## Context

<context>
This step integrates the Ribbit frog mascot into the desktop app's main dashboard and all notification contexts. Ribbit is the personality of Posture Check! — appearing on the dashboard as a persistent companion that reflects the app's current state (idle, sleeping during DND, concerned when overdue). The mascot transitions between states with smooth animations and displays context-appropriate messages. This implements Feature 3.4 (Frog Mascot Coach — "Ribbit") from the project spec.
</context>

## Prerequisites

<prerequisites>
- Phase 1 complete (system tray, timer, notifications, SQLite, settings)
- Ribbit SVG assets created (7 states from Step 0.6)
- RibbitMascot React component created (from Step 0.6)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Build the Dashboard page with Ribbit as the centerpiece**
   - Create `apps/desktop/src/pages/Dashboard.tsx`
   - Layout: Ribbit mascot prominently centered (xl size, ~240px), with status info around it
   - Below Ribbit: current state text ("Ribbit is watching your posture! 🐸")
   - Below state text: next reminder countdown ("Next check in 12:34")
   - Bottom area: quick stats row (today's checks, current streak, total XP)
   - The dashboard feels alive — Ribbit breathes, the countdown ticks, the streak flame flickers

2. **Implement Ribbit state management**
   - Create `apps/desktop/src/hooks/useRibbitState.ts`
   - Ribbit's state is determined by the app context:
     - `idle` — default, app is active, no pending notification
     - `reminding` — a notification is currently shown (timer just fired)
     - `encouraging` — user just acknowledged a reminder (show for 3 seconds, then back to idle)
     - `celebrating` — user hit a milestone (streak, level up, achievement) — show for 5 seconds
     - `concerned` — timer has fired 2+ times without acknowledgment
     - `sleeping` — app is paused or DND is active
     - `disappointed` — streak was broken (show on first dashboard visit after break, then revert to idle)
   - State transitions are driven by events from the timer and notification systems

3. **Add Ribbit state transition animations**
   - Use Framer Motion (or CSS transitions) for smooth state changes:
     - Fade + scale transition between SVG states (200ms ease-out)
     - Subtle bounce on state change
     - Confetti particle effect when celebrating (use a lightweight confetti library or CSS animation)
   - Idle breathing animation: continuous gentle scale pulse (1.0 → 1.03 → 1.0, 3-second cycle)
   - Concerned state: subtle head-tilt wobble animation

4. **Create the speech bubble component**
   - `apps/desktop/src/components/ribbit/SpeechBubble.tsx`
   - Displays Ribbit's current message in a floating speech bubble above/beside the mascot
   - Speech bubble appears with a pop-in animation when a new message is set
   - Auto-hides after 5 seconds (or stays for persistent messages)
   - Styled with the PostureCheck design system (rounded corners, slight shadow, frog-green accent border)

5. **Wire Ribbit to app events**
   - Timer fires → Ribbit transitions to "reminding" state, speech bubble shows the notification message
   - User acknowledges → Ribbit transitions to "encouraging" for 3 seconds
   - User ignores → Ribbit transitions to "concerned" after 2× interval
   - DND activated → Ribbit transitions to "sleeping"
   - Streak milestone → Ribbit transitions to "celebrating"
   - App paused → Ribbit transitions to "sleeping"

6. **Add Ribbit to the system tray tooltip**
   - Update the tray tooltip to include a Ribbit message alongside the countdown:
     - "🐸 Next check in 12:34 — You're doing great!"
     - "😴 Ribbit is sleeping (DND active)"
     - "⏸ Ribbit is paused"
</instructions>

<requirements>
### Functional Requirements
- Ribbit appears prominently on the dashboard at xl size (240px)
- Ribbit's expression matches the current app state at all times
- State transitions are animated (smooth cross-fade between SVGs)
- Speech bubble displays context-appropriate messages
- Idle breathing animation runs continuously and smoothly
- Celebrating state includes a confetti effect
- Dashboard shows live countdown to next reminder

### Technical Requirements
- Framer Motion for React animations (or CSS animations if simpler for SVG state swaps)
- Ribbit state derived from app/timer/notification events (not manually set)
- Performance: animations at 60fps, no layout thrashing
- Confetti effect is lightweight (CSS/canvas, not a heavy library)
- SVG state swap uses React key transitions for clean mount/unmount

### File Naming Conventions
- Components: PascalCase (`RibbitMascot.tsx`, `SpeechBubble.tsx`)
- Hooks: camelCase with `use` prefix (`useRibbitState.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/pages/Dashboard.tsx` — Main dashboard with Ribbit centerpiece
2. `apps/desktop/src/hooks/useRibbitState.ts` — Ribbit state management hook
3. `apps/desktop/src/components/ribbit/SpeechBubble.tsx` — Floating speech bubble
4. `apps/desktop/src/components/ribbit/ConfettiEffect.tsx` — Celebration confetti
5. `apps/desktop/src/components/dashboard/CountdownTimer.tsx` — Next reminder countdown display
6. `apps/desktop/src/components/dashboard/QuickStats.tsx` — Today's stats row
7. `apps/desktop/src/App.tsx` — MODIFIED: add Dashboard as the default route
</output_files>

## Verification

<verification>
- [ ] Dashboard shows Ribbit in idle state with breathing animation on launch
- [ ] Countdown timer ticks down every second and matches the timer engine
- [ ] When timer fires: Ribbit transitions to "reminding" with speech bubble
- [ ] When user acknowledges: Ribbit shows "encouraging" for 3 seconds, then returns to "idle"
- [ ] When DND is activated: Ribbit shows "sleeping" state
- [ ] When DND is deactivated: Ribbit returns to "idle"
- [ ] Speech bubble appears with a pop-in animation and auto-hides after 5 seconds
- [ ] All state transitions have smooth animations (no jarring SVG swaps)
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| SVG swap causes a flash/flicker | No transition animation on key change | Wrap SVGs in `AnimatePresence` (Framer Motion) with fade transition |
| Breathing animation is jerky | CSS animation not using `transform` | Use `transform: scale()` with `will-change: transform` for GPU acceleration |
| Confetti effect drops frames | Too many particles or DOM-based animation | Use Canvas-based confetti or limit to 50 particles |
| Ribbit stays in wrong state | Event listener not cleaning up | Ensure `useRibbitState` cleans up Tauri event listeners on unmount |

---

**Next**: [2.2 — Intensity Levels](./02_intensity_levels.md)
