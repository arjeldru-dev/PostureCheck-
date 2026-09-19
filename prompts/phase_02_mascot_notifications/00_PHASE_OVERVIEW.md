# Phase 2: Mascot & Notification Intensity

> **Objective**: Integrate Ribbit the frog mascot into all notification and UI contexts, implement the full 5-level notification intensity system (including custom overlay windows for Levels 4–5), and build the message rotation engine.
> **Duration**: 1–2 weeks
> **Dependencies**: Phase 1 (Desktop Core & Timer) must be complete

---

## Phase Goals

1. ✅ Ribbit mascot integrated into notifications with state-appropriate expressions
2. ✅ All 5 notification intensity levels fully functional (including L4 overlay and L5 fullscreen)
3. ✅ Custom notification overlay windows for Levels 4–5 (not native OS notifications)
4. ✅ Message rotation system with 50+ messages, no back-to-back repeats, intensity-appropriate language

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 2.1 | [01_ribbit_character_integration.md](01_ribbit_character_integration.md) | Ribbit mascot in dashboard, notifications, and all app states |
| 2.2 | [02_intensity_levels.md](02_intensity_levels.md) | Levels 4–5 custom overlay/fullscreen notifications |
| 2.3 | [03_notification_ui.md](03_notification_ui.md) | Beautiful notification designs for all 5 levels |
| 2.4 | [04_message_rotation_system.md](04_message_rotation_system.md) | 50+ Ribbit messages with rotation logic |

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Levels 4–5 implementation | Custom Tauri windows (not native OS notifications) | Native notifications can't do overlays or fullscreen blocking. Custom windows provide full control. |
| Message storage | Hardcoded in shared package constants | Messages don't change at runtime, no DB needed. Shared between desktop and mobile. |
| Mascot animation library | CSS animations + Framer Motion (desktop) | Lightweight, no heavy animation library needed for SVG state swaps and idle pulse. |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `gamified-app` — Gamified UI patterns for mascot-driven interfaces and engagement mechanics
- `imagegen` — Mascot asset generation guidance for creating consistent character illustrations
- `sprite-animation` — Sprite animation patterns for bringing Ribbit to life with smooth transitions

## Exit Criteria

Before moving to Phase 3, verify:

- [ ] Ribbit appears on the dashboard in idle state with breathing animation
- [ ] Notifications at all 5 levels show Ribbit in the "reminding" state with appropriate expression
- [ ] Level 4: large overlay notification with alarm sound, repeating every 30 seconds
- [ ] Level 5: fullscreen overlay blocking interaction until acknowledged (with opt-in confirmation working)
- [ ] Message rotation delivers 10+ unique messages in a row without repetition
- [ ] Ribbit's state on the dashboard reflects the app state (idle, sleeping for DND, concerned if overdue)

---

**Next Phase**: [Phase 3: Gamification Engine](../phase_03_gamification/00_PHASE_OVERVIEW.md)
