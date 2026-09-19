# Phase 1 Completion Checklist

## All Steps Completed

- [ ] 1.1 - System Tray App (tray icon, context menu, window show/hide)
- [ ] 1.2 - Timer Engine (Rust timer with interval, active hours, DND, sleep/wake)
- [ ] 1.3 - Notification System (Levels 1–3: Whisper, Nudge, Reminder)
- [ ] 1.4 - SQLite Local Storage (schema, migrations, data access layer)
- [ ] 1.5 - Settings Panel (tabbed UI with all preferences)

## Verification Tests

Run these commands and confirm they pass:

```bash
# Desktop app launches and runs
cd apps/desktop && pnpm tauri dev    # Expected: app starts, tray icon visible

# TypeScript compiles
pnpm turbo run type-check            # Expected: zero errors

# Lint passes
pnpm turbo run lint                  # Expected: zero warnings
```

## Functional Tests (Manual)

- [ ] App starts minimized to system tray — no window visible
- [ ] Left-click tray → window appears; left-click again → window hides
- [ ] Right-click tray → context menu with Pause, DND, Dashboard, Settings, Quit
- [ ] Set interval to 1 min → notification fires after ~60 seconds
- [ ] Acknowledge notification → timer resets, posture check logged to SQLite
- [ ] Snooze notification → timer delayed by 5 minutes
- [ ] Pause reminders → timer stops, tray icon changes to sleeping
- [ ] Resume reminders → timer restarts from current time
- [ ] DND for 30 min → timer stops, auto-resumes after 30 minutes
- [ ] Settings: change interval to 15 min → timer immediately recalculates
- [ ] Settings: change intensity to Level 3 → next notification uses Level 3 style
- [ ] Settings: toggle dark mode → UI theme changes
- [ ] Settings: create Quick Profile "Test" → appears in profile switcher
- [ ] Export Data → JSON file downloads with posture check history
- [ ] Close and reopen app → all settings preserved

## Code Quality Checks

- [ ] All TypeScript files compile: `npx tsc --noEmit`
- [ ] Linting passes: `pnpm lint`
- [ ] No `console.log` statements in production code (only `console.error` for error handling)
- [ ] All new files have proper imports/exports
- [ ] Rust code compiles without warnings: `cargo build` in `src-tauri/`
- [ ] No unused imports or variables

## Data Integrity Checks

- [ ] SQLite database created in the correct app data directory
- [ ] All 10 achievements seeded correctly
- [ ] Posture check history grows as reminders fire and are acknowledged
- [ ] User progress XP stays at 0 (XP calculation is Phase 3)
- [ ] Settings profiles CRUD works correctly (create, read, update, delete)

## Manual Verification

- [ ] Notifications appear correctly at Levels 1, 2, and 3 (use "Test Notification" button)
- [ ] Level 1: subtle, silent, auto-dismisses quickly
- [ ] Level 2: standard toast with sound, auto-dismisses
- [ ] Level 3: persistent with chime, stays until acknowledged
- [ ] Active hours work: setting hours to a past window stops notifications
- [ ] Active days work: unchecking today stops notifications
- [ ] PC sleep → wake: timer resumes without firing immediately

## Rollback Plan

If this phase breaks something:
1. Timer issues: check `src-tauri/src/timer.rs` for panic points; add error handling
2. SQLite issues: delete the database file from app data directory; app will recreate on next launch
3. Notification issues: verify OS notification permissions in system settings
4. Settings UI issues: revert to last working commit; check Zustand store initialization

---

**Proceed to**: [Phase 2: Mascot & Notification Intensity](../phase_02_mascot_notifications/00_PHASE_OVERVIEW.md)
