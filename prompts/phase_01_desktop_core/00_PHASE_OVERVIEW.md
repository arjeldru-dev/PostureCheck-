# Phase 1: Desktop Core & Timer

> **Objective**: Build the core Tauri desktop application — system tray integration, the Rust-based timer engine, basic notification system (Levels 1–3), SQLite local storage, and the settings panel.
> **Duration**: 2–3 weeks
> **Dependencies**: Phase 0 (Setup & Design System) must be complete

---

## Phase Goals

1. ✅ Fully functional system tray app that runs in the background
2. ✅ Rust-based timer engine that fires posture reminders at configurable intervals
3. ✅ Basic notification system (Levels 1–3: Whisper, Nudge, Reminder)
4. ✅ SQLite database for offline persistence of settings and posture check history
5. ✅ Settings panel with timer interval, active hours, and DND controls

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 1.1 | [01_system_tray_app.md](01_system_tray_app.md) | System tray icon, context menu, window show/hide |
| 1.2 | [02_timer_engine.md](02_timer_engine.md) | Rust timer engine with interval, pause, DND, active hours |
| 1.3 | [03_notification_system.md](03_notification_system.md) | Desktop notifications at intensity levels 1–3 |
| 1.4 | [04_sqlite_local_storage.md](04_sqlite_local_storage.md) | SQLite schema, data layer, persistence |
| 1.5 | [05_settings_panel.md](05_settings_panel.md) | Settings UI with timer, notification, and DND controls |

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timer implementation | Rust (Tauri backend) | More reliable than JavaScript timers; survives frontend crashes; can access system APIs for sleep/wake detection |
| Local storage | SQLite via Tauri SQL plugin | Structured data, supports offline-first, migrates cleanly, shared schema concept with Supabase PostgreSQL |
| Notification rendering | Native OS notifications (L1–L3) | Less intrusive, consistent with platform UX; custom overlay notifications for L4–L5 (Phase 2) |
| Settings persistence | SQLite (local) → Supabase (synced in Phase 4) | Works without an account; syncs when account is added |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `frontend-dev` — Frontend development patterns for the React web frontend, component architecture, state management
- `frontend-skill` — Additional frontend patterns for building production-quality settings panels and dashboards

## Exit Criteria

Before moving to Phase 2, verify:

- [ ] System tray icon shows 🐸 when active, changes state when paused
- [ ] Right-click tray menu works: Pause/Resume, Open Dashboard, Settings, Quit
- [ ] Timer fires at the configured interval and sends a desktop notification
- [ ] Timer pauses during DND mode and resumes when DND ends
- [ ] Timer only fires during configured active hours
- [ ] Timer pauses when PC goes to sleep and resumes on wake
- [ ] Settings panel allows changing interval (5 min – 2 hours), active hours, and DND
- [ ] Settings persist across app restarts (SQLite)
- [ ] Posture check events are logged to SQLite with timestamps

---

**Next Phase**: [Phase 2: Mascot & Notification Intensity](../phase_02_mascot_notifications/00_PHASE_OVERVIEW.md)
