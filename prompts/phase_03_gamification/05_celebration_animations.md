# 3.5 Celebration Animations

## Context

<context>
This step adds the celebration animations that make leveling up, hitting streak milestones, and unlocking achievements feel genuinely rewarding. These are the "dopamine hits" that keep users engaged — inspired by Duolingo's lesson completion and Forest's tree growth celebrations. When something worth celebrating happens, the entire dashboard comes alive with confetti, Ribbit's celebration dance, XP count-up animation, and a congratulatory modal.
</context>

## Prerequisites

<prerequisites>
- Steps 3.1–3.4 complete (all gamification systems and dashboard UI)
- Ribbit "celebrating" SVG asset and ConfettiEffect component (from Step 2.1)
- Framer Motion installed and working
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the level-up celebration modal**
   - `apps/desktop/src/components/celebrations/LevelUpModal.tsx`:
     - Full-screen semi-transparent overlay (blocks dashboard interaction)
     - Centered card (400×350px) with animation entrance (scale from 0 + fade in)
     - Content:
       - "🎉 LEVEL UP!" header with rainbow/gradient text effect
       - Old level → New level transition (e.g., "Level 4 → Level 5")
       - New level title in large text ("Tree Frog 🐸")
       - Ribbit in celebrating pose (large, ~160px) with confetti
       - XP progress bar animation (fills from old to new position)
       - "Continue" button to dismiss
     - If Level 5: also show "🛡 Streak Freeze unlocked!" message
     - Confetti particles shoot from behind the card
     - Auto-dismiss after 8 seconds if not clicked

2. **Create the streak milestone celebration**
   - `apps/desktop/src/components/celebrations/StreakCelebration.tsx`:
     - Slides in from the top of the dashboard (doesn't block interaction)
     - Shows: "🔥 7-Day Streak!" with Ribbit doing a fist-pump
     - Flame particles fly outward from the streak counter
     - Different scale for different milestones:
       - 7 days: modest celebration (slide-in banner)
       - 14 days: medium celebration (banner + small confetti)
       - 30 days: big celebration (banner + confetti + golden glow)
       - 60/100 days: epic celebration (full confetti + Ribbit golden form)
     - Auto-dismisses after 5 seconds

3. **Create the achievement unlock celebration**
   - `apps/desktop/src/components/celebrations/AchievementUnlock.tsx`:
     - Toast that slides in from the right
     - Shows the achievement badge (large, glowing), name, and XP reward
     - Badge has a shine/reveal animation (grayscale → full color wipe)
     - "+25 XP" text animates upward and fades out
     - Sound effect: satisfying "achievement unlocked" chime
     - Stays for 5 seconds, clickable to go to Achievements page

4. **Create the XP count-up animation effect**
   - `apps/desktop/src/components/celebrations/XpGainEffect.tsx`:
     - When XP is earned, show a floating "+10 XP" text that:
       - Appears at the XP counter location
       - Floats upward with a slight curve
       - Fades out over 1 second
       - Uses the Golden XP color (#FFD54F)
       - Multiple XP gains stack (show each individually, staggered)
     - The main XP counter smoothly counts up to the new value

5. **Create the celebration orchestrator**
   - `apps/desktop/src/hooks/useCelebrations.ts`:
     - Listens for celebration events: `level-up`, `streak-milestone`, `achievement-unlocked`, `xp-gained`
     - Queues celebrations so they don't overlap (level-up takes priority)
     - Manages the celebration lifecycle (show → auto-dismiss → next in queue)
     - Priority order: level-up > achievement > streak milestone > XP gain
     - XP gain always shows (it's non-blocking), others queue

6. **Add confetti variations**
   - Update `apps/desktop/src/components/ribbit/ConfettiEffect.tsx`:
     - Standard confetti: multicolored paper pieces (level-up, achievement)
     - Fire confetti: orange/red/yellow particles (streak milestones)
     - Golden confetti: gold/yellow sparkles (30+ day streak, golden frog)
     - Confetti amount scales with the significance of the event
</instructions>

<requirements>
### Functional Requirements
- Level-up shows a modal with old → new level, new title, Ribbit celebrating, confetti
- Streak milestones show scaled celebrations (bigger for longer streaks)
- Achievement unlocks show a toast with badge reveal animation
- XP gains show floating "+X XP" text at the counter
- Celebrations don't overlap — they queue and play in priority order
- All celebrations auto-dismiss (users shouldn't need to interact to continue)

### Technical Requirements
- Framer Motion for all modal/toast animations
- Confetti uses Canvas (not DOM particles) for performance
- Celebrations don't block the timer or notification system
- Sound effects are short (< 2 seconds) and use system audio
- Animations at 60fps even during confetti

### File Naming Conventions
- Celebration components: PascalCase in `celebrations/` directory
- Hooks: camelCase with `use` prefix
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/components/celebrations/LevelUpModal.tsx` — Level-up celebration
2. `apps/desktop/src/components/celebrations/StreakCelebration.tsx` — Streak milestone celebration
3. `apps/desktop/src/components/celebrations/AchievementUnlock.tsx` — Achievement toast
4. `apps/desktop/src/components/celebrations/XpGainEffect.tsx` — Floating XP text
5. `apps/desktop/src/hooks/useCelebrations.ts` — Celebration event orchestrator
6. `apps/desktop/src/components/ribbit/ConfettiEffect.tsx` — MODIFIED: add confetti variations
7. `apps/desktop/src/App.tsx` — MODIFIED: mount celebration layer above all pages
</output_files>

## Verification

<verification>
- [ ] Earning XP shows floating "+10 XP" text that rises and fades
- [ ] XP counter smoothly counts up to the new value
- [ ] Leveling up shows the full modal with confetti, old→new level, Ribbit celebrating
- [ ] Level-up modal auto-dismisses after 8 seconds
- [ ] 7-day streak shows a modest banner celebration
- [ ] 30-day streak shows a big celebration with golden confetti
- [ ] Achievement unlock shows a toast with badge reveal animation
- [ ] Multiple celebrations queue correctly (don't overlap)
- [ ] Celebrations don't freeze or lag the UI
- [ ] Timer continues to run during celebrations
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Confetti drops frames | Too many DOM-based particles | Switch to Canvas-based confetti renderer, limit to 100 particles |
| Level-up modal doesn't appear | Event not emitted or listener not mounted | Verify `useCelebrations` is mounted in the root App component |
| Celebrations overlap | Queue logic not implemented | Add a celebration queue with `isPlaying` flag in the orchestrator |
| XP count-up is instant (not animated) | Using state directly instead of lerp | Use `requestAnimationFrame` to interpolate from old to new value |

---

**Previous**: [3.4 — Dashboard UI](./04_dashboard_ui.md)

---

**Proceed to Phase Checklist**: [Phase 3 Checklist](./99_PHASE_CHECKLIST.md)
