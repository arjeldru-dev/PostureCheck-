-- 001_initial_schema.sql: SQLite Schema for Posture Check! Desktop

CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stores user preferences per profile
CREATE TABLE IF NOT EXISTS posture_settings (
    id TEXT PRIMARY KEY,
    profile_name TEXT NOT NULL DEFAULT 'Default',
    interval_minutes INTEGER NOT NULL DEFAULT 30,
    intensity_level INTEGER NOT NULL DEFAULT 2,
    active_hours_start TEXT NOT NULL DEFAULT '08:00',
    active_hours_end TEXT NOT NULL DEFAULT '22:00',
    active_days TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
    routing_mode TEXT NOT NULL DEFAULT 'pc_only',
    auto_escalation INTEGER NOT NULL DEFAULT 0,
    dnd_enabled INTEGER NOT NULL DEFAULT 0,
    is_active_profile INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual reminder events
CREATE TABLE IF NOT EXISTS posture_checks (
    id TEXT PRIMARY KEY,
    fired_at TEXT NOT NULL,
    acknowledged_at TEXT,
    response TEXT NOT NULL DEFAULT 'pending',
    intensity_level INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    message_shown TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posture_checks_fired_at ON posture_checks(fired_at DESC);

-- Gamification state (singleton row id=1)
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_checks INTEGER NOT NULL DEFAULT 0,
    streak_freeze_available INTEGER NOT NULL DEFAULT 0,
    last_check_date TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value INTEGER NOT NULL
);

-- Unlocked achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    achievement_id TEXT NOT NULL REFERENCES achievements(id),
    unlocked_at TEXT NOT NULL,
    PRIMARY KEY (achievement_id)
);

-- Persisted app state (singleton row id=1)
CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_paused INTEGER NOT NULL DEFAULT 0,
    is_dnd INTEGER NOT NULL DEFAULT 0,
    dnd_until TEXT,
    theme_mode TEXT NOT NULL DEFAULT 'system',
    launch_on_startup INTEGER NOT NULL DEFAULT 0
);

-- Seed initial singleton defaults if absent
INSERT OR IGNORE INTO posture_settings (
    id, profile_name, interval_minutes, intensity_level,
    active_hours_start, active_hours_end, active_days,
    routing_mode, auto_escalation, dnd_enabled, is_active_profile
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'Default', 30, 2,
    '08:00', '22:00', '1,2,3,4,5,6,7',
    'pc_only', 0, 0, 1
);

INSERT OR IGNORE INTO user_progress (
    id, total_xp, current_level, current_streak, longest_streak, total_checks, streak_freeze_available
) VALUES (
    1, 0, 1, 0, 0, 0, 0
);

INSERT OR IGNORE INTO app_state (
    id, is_paused, is_dnd, dnd_until, theme_mode, launch_on_startup
) VALUES (
    1, 0, 0, NULL, 'system', 0
);
