# Phase 5: Mobile Companion App

> **Objective**: Build the Expo SDK 57 mobile companion app with all key screens (dashboard, stats, achievements, settings), local posture timer, push notification receiving, and device pairing flow.
> **Duration**: 3–4 weeks
> **Dependencies**: Phase 4 (Auth & Cloud Sync) must be complete

---

## Phase Goals

1. ✅ Mobile dashboard with Ribbit, stats, and gamification elements
2. ✅ Stats screen with weekly/monthly posture charts
3. ✅ Achievements gallery matching desktop experience
4. ✅ Settings screen with all mobile-relevant preferences
5. ✅ Local posture timer with phone notifications (standalone mode)
6. ✅ Device pairing flow (QR code + account-based auto-pair)

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 5.1 | [01_expo_navigation_theming.md](01_expo_navigation_theming.md) | Navigation finalization, theming, splash screen |
| 5.2 | [02_mobile_dashboard.md](02_mobile_dashboard.md) | Home screen with Ribbit, stats, countdown |
| 5.3 | [03_stats_achievements_screens.md](03_stats_achievements_screens.md) | Stats charts and achievement gallery |
| 5.4 | [04_mobile_settings.md](04_mobile_settings.md) | Mobile settings and account management |
| 5.5 | [05_local_timer_notifications.md](05_local_timer_notifications.md) | Phone-based timer and local notifications |
| 5.6 | [06_device_pairing_flow.md](06_device_pairing_flow.md) | QR code and account-based device pairing |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `mobile-app` — Mobile screen archetypes, native patterns, performance optimization
- `mobile-onboarding` — Onboarding flow design and first-time user experience
- `platform-design` — Cross-platform design rules (iOS HIG + Android Material)
- `imagegen-frontend-mobile` — Mobile UI image generation for design references

## Exit Criteria

Before moving to Phase 6, verify:

- [ ] Mobile app runs on iOS simulator and Android emulator
- [ ] Dashboard shows Ribbit, streak, XP, level, next reminder countdown
- [ ] Stats screen shows weekly posture chart
- [ ] Achievement gallery displays all badges with locked/unlocked states
- [ ] Local timer fires notifications on phone (standalone mode, no PC needed)
- [ ] Sign in syncs all data from cloud (matches desktop data)
- [ ] Device pairing via account auto-discovery works

---

**Next Phase**: [Phase 6: PC-to-Phone Routing](../phase_06_push_routing/00_PHASE_OVERVIEW.md)
