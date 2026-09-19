# Posture Check! — Implementation Guide

> Generated from `project_specification.md`
> Total Phases: 8 (Phase 0–7)
> Estimated Duration: 14–20 weeks (relaxed side-project pace)

## Quick Start

1. Start with Phase 0 and complete all steps in order
2. Each step has its own prompt file — feed it to your AI coding agent
3. Complete the phase checklist before moving to the next phase
4. Skills are loaded from `.agent/skills/skills/[skill-id]/SKILL.md`

## Project Summary

**Posture Check!** is a cross-platform background utility that reminds users to maintain good posture through customizable, personality-driven notifications with a friendly frog mascot coach ("Ribbit"). It consists of:

- **Desktop app** — Tauri 2.0 system tray app (Windows/macOS/Linux) with a React 19 + TypeScript + Vite frontend
- **Mobile app** — React Native + Expo SDK 57 companion (iOS/Android)
- **Backend** — Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Key features** — Timer-based reminders, 5-level notification intensity, frog mascot, XP/levels/streaks/achievements, PC-to-phone notification routing, optional account with cross-device sync

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop App | Tauri 2.0 (Rust + WebView) |
| Desktop Frontend | React 19 + TypeScript + Vite |
| Desktop Styling | Tailwind CSS 4 |
| Mobile App | React Native + Expo SDK 57 |
| Mobile Styling | NativeWind 4 |
| Backend / BaaS | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Push Notifications | Expo Push + Supabase Edge Functions |
| Local Storage | SQLite (Tauri SQL plugin / Expo SQLite) |
| State Management | Zustand |
| ORM | Drizzle ORM (for Supabase/PostgreSQL) |
| Monorepo | Turborepo |
| CI/CD | GitHub Actions |

## Phase Overview

| Phase | Name | Steps | Focus | Est. Duration |
|-------|------|-------|-------|---------------|
| 0 | [Setup & Design System](./phase_00_setup/00_PHASE_OVERVIEW.md) | 6 | Monorepo scaffolding, Tauri + Expo init, Supabase, CI/CD, design tokens, Ribbit assets | 1–2 weeks |
| 1 | [Desktop Core & Timer](./phase_01_desktop_core/00_PHASE_OVERVIEW.md) | 5 | Tauri system tray, Rust timer engine, notifications (L1–L3), SQLite, settings | 2–3 weeks |
| 2 | [Mascot & Notifications](./phase_02_mascot_notifications/00_PHASE_OVERVIEW.md) | 4 | Ribbit character (all states), 5 intensity levels, notification UI, message rotation | 1–2 weeks |
| 3 | [Gamification Engine](./phase_03_gamification/00_PHASE_OVERVIEW.md) | 5 | XP system, levels, streaks, achievements, dashboard UI, celebration animations | 2–3 weeks |
| 4 | [Auth & Cloud Sync](./phase_04_auth_sync/00_PHASE_OVERVIEW.md) | 4 | Supabase Auth, database schema + RLS, offline-first sync, settings sync | 2 weeks |
| 5 | [Mobile Companion App](./phase_05_mobile_app/00_PHASE_OVERVIEW.md) | 6 | Expo app screens, local timer, push notifications, device pairing | 3–4 weeks |
| 6 | [PC-to-Phone Routing](./phase_06_push_routing/00_PHASE_OVERVIEW.md) | 3 | Edge Function push relay, routing toggle, QR pairing, fallback | 1–2 weeks |
| 7 | [Polish & Launch](./phase_07_polish_launch/00_PHASE_OVERVIEW.md) | 5 | Onboarding, error handling, E2E testing, app store prep, documentation | 2–3 weeks |

## Dependency Graph

```
Phase 0 (Setup & Design System)
    ↓
Phase 1 (Desktop Core & Timer)
    ↓
Phase 2 (Mascot & Notifications) ──→ Phase 3 (Gamification)
    ↓                                     ↓
Phase 4 (Auth & Cloud Sync) ←────────────┘
    ↓
Phase 5 (Mobile Companion App)
    ↓
Phase 6 (PC-to-Phone Routing)
    ↓
Phase 7 (Polish & Launch)
```

## All Prompt Files

### Phase 0: Setup & Design System
- [0.1 — Monorepo Initialization](./phase_00_setup/01_monorepo_initialization.md)
- [0.2 — Tauri Desktop Scaffolding](./phase_00_setup/02_tauri_desktop_scaffolding.md)
- [0.3 — Expo Mobile Scaffolding](./phase_00_setup/03_expo_mobile_scaffolding.md)
- [0.4 — Supabase Setup](./phase_00_setup/04_supabase_setup.md)
- [0.5 — Design System Tokens](./phase_00_setup/05_design_system_tokens.md)
- [0.6 — Ribbit Mascot Assets](./phase_00_setup/06_ribbit_mascot_assets.md)

### Phase 1: Desktop Core & Timer
- [1.1 — System Tray App](./phase_01_desktop_core/01_system_tray_app.md)
- [1.2 — Timer Engine](./phase_01_desktop_core/02_timer_engine.md)
- [1.3 — Notification System](./phase_01_desktop_core/03_notification_system.md)
- [1.4 — SQLite Local Storage](./phase_01_desktop_core/04_sqlite_local_storage.md)
- [1.5 — Settings Panel](./phase_01_desktop_core/05_settings_panel.md)

### Phase 2: Mascot & Notification Intensity
- [2.1 — Ribbit Character Integration](./phase_02_mascot_notifications/01_ribbit_character_integration.md)
- [2.2 — Intensity Levels](./phase_02_mascot_notifications/02_intensity_levels.md)
- [2.3 — Notification UI](./phase_02_mascot_notifications/03_notification_ui.md)
- [2.4 — Message Rotation System](./phase_02_mascot_notifications/04_message_rotation_system.md)

### Phase 3: Gamification Engine
- [3.1 — XP & Level System](./phase_03_gamification/01_xp_level_system.md)
- [3.2 — Streak Tracking](./phase_03_gamification/02_streak_tracking.md)
- [3.3 — Achievements System](./phase_03_gamification/03_achievements_system.md)
- [3.4 — Dashboard UI](./phase_03_gamification/04_dashboard_ui.md)
- [3.5 — Celebration Animations](./phase_03_gamification/05_celebration_animations.md)

### Phase 4: Auth & Cloud Sync
- [4.1 — Supabase Auth Integration](./phase_04_auth_sync/01_supabase_auth.md)
- [4.2 — Database Schema & RLS](./phase_04_auth_sync/02_database_schema_rls.md)
- [4.3 — Offline-First Sync Engine](./phase_04_auth_sync/03_offline_first_sync.md)
- [4.4 — Settings Sync](./phase_04_auth_sync/04_settings_sync.md)

### Phase 5: Mobile Companion App
- [5.1 — Navigation & Theming](./phase_05_mobile_app/01_expo_navigation_theming.md)
- [5.2 — Mobile Dashboard](./phase_05_mobile_app/02_mobile_dashboard.md)
- [5.3 — Stats & Achievements Screens](./phase_05_mobile_app/03_stats_achievements_screens.md)
- [5.4 — Mobile Settings](./phase_05_mobile_app/04_mobile_settings.md)
- [5.5 — Local Timer & Notifications](./phase_05_mobile_app/05_local_timer_notifications.md)
- [5.6 — Device Pairing Flow](./phase_05_mobile_app/06_device_pairing_flow.md)

### Phase 6: PC-to-Phone Routing
- [6.1 — Edge Function Push Relay](./phase_06_push_routing/01_edge_function_push_relay.md)
- [6.2 — Routing Toggle UI](./phase_06_push_routing/02_routing_toggle_ui.md)
- [6.3 — QR Code Pairing](./phase_06_push_routing/03_qr_code_pairing.md)

### Phase 7: Polish & Launch
- [7.1 — Onboarding Flow](./phase_07_polish_launch/01_onboarding_flow.md)
- [7.2 — Error Handling & Loading States](./phase_07_polish_launch/02_error_handling_loading_states.md)
- [7.3 — End-to-End Testing](./phase_07_polish_launch/03_end_to_end_testing.md)
- [7.4 — App Store Prep](./phase_07_polish_launch/04_app_store_prep.md)
- [7.5 — Documentation & Portfolio](./phase_07_polish_launch/05_documentation_portfolio.md)

### Appendix
- [A — Design System Reference](./appendix/A_DESIGN_SYSTEM.md)
- [B — API Reference](./appendix/B_API_REFERENCE.md)
- [C — Troubleshooting](./appendix/C_TROUBLESHOOTING.md)
- [D — Security Checklist](./appendix/D_SECURITY_CHECKLIST.md)

## Post-Implementation

After all phases:
- [ ] Run full test suite (desktop + mobile)
- [ ] Security audit (see [appendix/D_SECURITY_CHECKLIST.md](./appendix/D_SECURITY_CHECKLIST.md))
- [ ] Performance testing (Tauri binary size, mobile app bundle, Supabase query latency)
- [ ] Documentation review (README, API docs, portfolio write-up)
- [ ] Cross-platform testing (Windows, macOS, Linux, iOS, Android)
- [ ] User acceptance testing with all 3 personas (Gamer, Office Worker, Student)
