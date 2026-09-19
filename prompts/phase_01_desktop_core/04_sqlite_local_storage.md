# 1.4 SQLite Local Storage

## Context

<context>
This step implements the SQLite local database for the desktop app. All data is stored locally first (offline-first architecture) — settings, posture check history, gamification progress, and achievements. In Phase 4, a sync engine will replicate this data to Supabase when the user signs in. The SQLite schema mirrors the Supabase PostgreSQL schema defined in the project spec (Section 4, Data Model) so that sync is straightforward. This ensures the app is fully functional without an internet connection or account.
</context>

## Prerequisites

<prerequisites>
- Steps 1.1–1.3 are complete (system tray, timer, and notifications working)
- Tauri SQL plugin configured in `Cargo.toml` and capabilities
- SQLite available via the Tauri SQL plugin
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the SQLite database schema**
   - Create `apps/desktop/src-tauri/migrations/001_initial_schema.sql` with tables:

   **posture_settings** (stores the user's preferences per profile)
   - `id` TEXT PRIMARY KEY (UUID)
   - `profile_name` TEXT NOT NULL DEFAULT 'Default'
   - `interval_minutes` INTEGER NOT NULL DEFAULT 30
   - `intensity_level` INTEGER NOT NULL DEFAULT 2
   - `active_hours_start` TEXT NOT NULL DEFAULT '08:00'
   - `active_hours_end` TEXT NOT NULL DEFAULT '22:00'
   - `active_days` TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7' (comma-separated day numbers)
   - `routing_mode` TEXT NOT NULL DEFAULT 'pc_only'
   - `auto_escalation` INTEGER NOT NULL DEFAULT 0 (boolean)
   - `dnd_enabled` INTEGER NOT NULL DEFAULT 0 (boolean)
   - `is_active_profile` INTEGER NOT NULL DEFAULT 1 (boolean)
   - `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
   - `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))

   **posture_checks** (individual reminder events)
   - `id` TEXT PRIMARY KEY (UUID)
   - `fired_at` TEXT NOT NULL
   - `acknowledged_at` TEXT (nullable)
   - `response` TEXT NOT NULL DEFAULT 'pending' (acknowledged, snoozed, dismissed, expired)
   - `intensity_level` INTEGER NOT NULL
   - `xp_earned` INTEGER NOT NULL DEFAULT 0
   - `message_shown` TEXT (the Ribbit message displayed)
   - `created_at` TEXT NOT NULL DEFAULT (datetime('now'))

   **user_progress** (gamification state)
   - `id` INTEGER PRIMARY KEY DEFAULT 1 (singleton row)
   - `total_xp` INTEGER NOT NULL DEFAULT 0
   - `current_level` INTEGER NOT NULL DEFAULT 1
   - `current_streak` INTEGER NOT NULL DEFAULT 0
   - `longest_streak` INTEGER NOT NULL DEFAULT 0
   - `total_checks` INTEGER NOT NULL DEFAULT 0
   - `streak_freeze_available` INTEGER NOT NULL DEFAULT 0 (boolean)
   - `last_check_date` TEXT (date of the last acknowledged check, for streak calculation)
   - `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))

   **achievements** (definitions — seeded)
   - `id` TEXT PRIMARY KEY
   - `name` TEXT NOT NULL
   - `description` TEXT NOT NULL
   - `icon` TEXT NOT NULL
   - `xp_reward` INTEGER NOT NULL
   - `condition_type` TEXT NOT NULL
   - `condition_value` INTEGER NOT NULL

   **user_achievements** (unlocked achievements)
   - `achievement_id` TEXT NOT NULL REFERENCES achievements(id)
   - `unlocked_at` TEXT NOT NULL
   - PRIMARY KEY (achievement_id)

   **app_state** (persisted app state — singleton)
   - `id` INTEGER PRIMARY KEY DEFAULT 1
   - `is_paused` INTEGER NOT NULL DEFAULT 0
   - `is_dnd` INTEGER NOT NULL DEFAULT 0
   - `dnd_until` TEXT (nullable — when DND auto-expires)
   - `theme_mode` TEXT NOT NULL DEFAULT 'system'
   - `launch_on_startup` INTEGER NOT NULL DEFAULT 0

2. **Create seed data for achievements**
   - Create `apps/desktop/src-tauri/migrations/002_seed_achievements.sql`
   - Seed all 10 achievements from the spec:
     - first_ribbit, week_warrior, month_master, early_bird, night_owl, perfect_day, phone_friend, customizer, centurion, frog_whisperer
   - Each with name, description, icon, xp_reward, condition_type, condition_value

3. **Create the Rust data access layer**
   - Create `src-tauri/src/database.rs`:
     - `init_database()` — runs migrations, creates/opens the SQLite database file
     - `get_settings()` → returns the active posture settings profile
     - `save_settings(settings)` — upserts posture settings
     - `log_posture_check(check)` — inserts a new posture check event
     - `update_posture_check(id, response, acknowledged_at)` — updates a check's response
     - `get_posture_checks(limit, offset)` → returns paginated check history
     - `get_user_progress()` → returns current gamification state
     - `update_user_progress(progress)` — updates XP, level, streak
     - `get_achievements()` → returns all achievements with unlocked status
     - `unlock_achievement(achievement_id)` — marks an achievement as unlocked
     - `get_app_state()` → returns persisted app state
     - `save_app_state(state)` — updates persisted app state

4. **Integrate database with existing systems**
   - On app startup: `init_database()`, then load `app_state` to restore paused/DND status
   - On timer fire: call `log_posture_check()` to record the event
   - On notification acknowledge: call `update_posture_check()` and `update_user_progress()`
   - On settings change: call `save_settings()`
   - On app quit: call `save_app_state()`

5. **Create Tauri commands for data access**
   - `get_settings()` → serialized settings
   - `save_settings(settings)` → success/error
   - `get_posture_history(limit, offset)` → paginated check history
   - `get_progress()` → user progress (XP, level, streak)
   - `get_achievements()` → all achievements with unlock status
   - `get_today_stats()` → today's check count, acknowledgment rate, XP earned today
</instructions>

<requirements>
### Functional Requirements
- SQLite database is created on first launch in the app's data directory
- Migrations run automatically on app start (no manual migration step)
- Settings persist across app restarts
- Posture check history is queryable with pagination
- App state (paused, DND, theme) restores on app restart
- Achievement definitions are seeded on first launch

### Technical Requirements
- Tauri SQL plugin for SQLite access
- Database file stored in Tauri's app data directory (platform-appropriate)
- Migrations are versioned and run in order
- All database operations are async (don't block the UI)
- UUIDs generated using Rust's `uuid` crate (v4)
- Timestamps stored as ISO 8601 strings in UTC

### File Naming Conventions
- Migration files: numbered `NNN_description.sql`
- Rust modules: snake_case (`database.rs`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/migrations/001_initial_schema.sql` — SQLite schema
2. `apps/desktop/src-tauri/migrations/002_seed_achievements.sql` — Achievement seed data
3. `apps/desktop/src-tauri/src/database.rs` — Data access layer (Rust)
4. `apps/desktop/src-tauri/src/main.rs` — MODIFIED: initialize database on startup
5. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add database commands
6. `apps/desktop/src-tauri/src/timer.rs` — MODIFIED: log posture checks to database
7. `apps/desktop/src-tauri/src/notifications.rs` — MODIFIED: log notification responses
</output_files>

## Verification

<verification>
After completing this step, confirm:

- [ ] App launches and creates the SQLite database file in the app data directory
- [ ] `get_settings()` returns default settings on first launch
- [ ] `save_settings({interval_minutes: 15})` persists; restarting the app shows interval as 15
- [ ] Timer fires → a posture check event is logged in the database
- [ ] Acknowledging a notification → the check's response updates to 'acknowledged' with a timestamp
- [ ] `get_posture_history(10, 0)` returns the most recent 10 checks
- [ ] `get_progress()` returns XP=0, level=1, streak=0 on first launch
- [ ] `get_achievements()` returns all 10 seeded achievements, all unlocked=false
- [ ] App state (paused/DND) persists across restarts
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Database file not created | Incorrect data directory path | Use Tauri's `app.path.app_data_dir()` for the platform-appropriate location |
| Migration fails with "table already exists" | Migrations running on every start without versioning | Track applied migrations in a `_migrations` table |
| SQLite locks / "database is locked" | Multiple concurrent writes | Use a single database connection wrapped in `Mutex`, or enable WAL mode |
| UUID generation fails | Missing `uuid` crate | Add `uuid = { version = "1", features = ["v4"] }` to `Cargo.toml` |
| Timestamps not in UTC | Using `Local` instead of `Utc` | Use `chrono::Utc::now()` for all timestamps |

---

**Previous**: [1.3 — Notification System](./03_notification_system.md) | **Next**: [1.5 — Settings Panel](./05_settings_panel.md)
