# Phase 3: Gamification Engine

> **Objective**: Build the XP, level, streak, and achievement systems that turn posture improvement into an engaging daily habit — with a polished dashboard UI showing progress, stats, and celebration animations.
> **Duration**: 2–3 weeks
> **Dependencies**: Phase 2 (Mascot & Notifications) must be complete

---

## Phase Goals

1. ✅ XP system with points for acknowledgments, daily completions, and streak bonuses
2. ✅ Level progression (Tadpole → Zen Master) with 25 levels
3. ✅ Streak tracking with freeze mechanic and visual flame counter
4. ✅ Achievement system with 10 badges and unlock detection
5. ✅ Dashboard UI showing all gamification elements with animations
6. ✅ Celebration animations for level-ups, streak milestones, and achievements

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 3.1 | [01_xp_level_system.md](01_xp_level_system.md) | XP calculation, level progression logic |
| 3.2 | [02_streak_tracking.md](02_streak_tracking.md) | Streak calculation, freeze mechanic, daily tracking |
| 3.3 | [03_achievements_system.md](03_achievements_system.md) | Achievement detection, unlock logic, badge management |
| 3.4 | [04_dashboard_ui.md](04_dashboard_ui.md) | Gamification dashboard with progress visuals |
| 3.5 | [05_celebration_animations.md](05_celebration_animations.md) | Level-up, streak, and achievement celebrations |

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| XP calculation location | Shared package (TypeScript) | Same logic runs on desktop and mobile; pure functions, easily testable |
| Streak calculation | Local timezone-based | Users don't cross timezones frequently; server-side validation when signed in (Phase 4) |
| Achievement detection | Event-driven | Checks for achievement conditions after each relevant action, not polling |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `gamified-app` — Gamified UI patterns, XP/level/streak component design, engagement mechanics
- `d3-visualization` — Chart and data visualization patterns for posture stats and progress tracking

## Exit Criteria

Before moving to Phase 4, verify:

- [ ] Acknowledging a reminder grants +10 XP (visible counter animation)
- [ ] Daily completion grants +50 XP bonus
- [ ] Streak bonus XP scales correctly (capped at +100/day)
- [ ] Level-up triggers Ribbit celebration animation and level badge display
- [ ] Streak counter shows flame icon with correct count
- [ ] Streak freeze works (1 missed day doesn't break streak if freeze available)
- [ ] All 10 achievements unlock at the correct conditions
- [ ] Dashboard shows XP bar, level, streak, recent achievements
- [ ] Posture score displays daily acknowledgment rate as a percentage

---

**Next Phase**: [Phase 4: Auth & Cloud Sync](../phase_04_auth_sync/00_PHASE_OVERVIEW.md)
