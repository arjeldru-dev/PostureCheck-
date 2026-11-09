use std::sync::{Arc, Mutex};
use chrono::{Datelike, Duration, Local, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostureSettings {
    pub id: String,
    pub profile_name: String,
    pub interval_minutes: u32,
    pub intensity_level: u8,
    pub active_hours_start: String,
    pub active_hours_end: String,
    pub active_days: String,
    pub routing_mode: String,
    pub auto_escalation: bool,
    pub dnd_enabled: bool,
    pub is_active_profile: bool,
    pub created_at: String,
    pub updated_at: String,
    pub level5_opt_in: bool,
    pub mascot_tone: String,
}

impl Default for PostureSettings {
    fn default() -> Self {
        Self {
            id: "00000000-0000-0000-0000-000000000001".to_string(),
            profile_name: "Default".to_string(),
            interval_minutes: 30,
            intensity_level: 2,
            active_hours_start: "08:00".to_string(),
            active_hours_end: "22:00".to_string(),
            active_days: "1,2,3,4,5,6,7".to_string(),
            routing_mode: "pc_only".to_string(),
            auto_escalation: false,
            dnd_enabled: false,
            is_active_profile: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            level5_opt_in: false,
            mascot_tone: "encouraging".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingsInput {
    pub id: Option<String>,
    #[serde(alias = "profile_name")]
    pub profile_name: Option<String>,
    #[serde(alias = "interval_minutes")]
    pub interval_minutes: Option<u32>,
    #[serde(alias = "intensity_level")]
    pub intensity_level: Option<u8>,
    #[serde(alias = "active_hours_start")]
    pub active_hours_start: Option<String>,
    #[serde(alias = "active_hours_end")]
    pub active_hours_end: Option<String>,
    #[serde(alias = "active_days")]
    pub active_days: Option<String>,
    #[serde(alias = "routing_mode")]
    pub routing_mode: Option<String>,
    #[serde(alias = "auto_escalation")]
    pub auto_escalation: Option<bool>,
    #[serde(alias = "dnd_enabled")]
    pub dnd_enabled: Option<bool>,
    #[serde(alias = "is_active_profile")]
    pub is_active_profile: Option<bool>,
    #[serde(alias = "level5_opt_in")]
    pub level5_opt_in: Option<bool>,
    #[serde(alias = "mascot_tone")]
    pub mascot_tone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostureCheck {
    pub id: String,
    pub fired_at: String,
    pub acknowledged_at: Option<String>,
    pub response: String, // "pending" | "acknowledged" | "snoozed" | "dismissed" | "expired"
    pub intensity_level: u8,
    pub xp_earned: u32,
    pub message_shown: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPostureCheck {
    pub id: Option<String>,
    pub fired_at: Option<String>,
    pub intensity_level: u8,
    pub message_shown: Option<String>,
    /// Test notifications (Settings → "Test") are logged but never earn XP,
    /// count toward stats/streaks, or unlock achievements.
    #[serde(default)]
    pub is_test: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProgress {
    pub id: i64,
    pub total_xp: u32,
    pub current_level: u32,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub total_checks: u32,
    /// Derived on read: level >= 5 and no freeze used in the current ISO week.
    pub streak_freeze_available: bool,
    pub last_check_date: Option<String>,
    /// ISO week key (e.g. "2026-W45") in which the weekly streak freeze was last used.
    #[serde(default)]
    pub last_freeze_week: Option<String>,
    pub updated_at: String,
}

/// Partial progress update. Only streak bookkeeping can be patched; XP,
/// level and total checks change exclusively through atomic increments
/// (`add_xp`, `unlock_achievement`, `process_check_acknowledgment`).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPatch {
    pub current_streak: Option<u32>,
    pub longest_streak: Option<u32>,
    pub last_check_date: Option<String>,
    pub last_freeze_week: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementUnlockResult {
    pub achievement_id: String,
    pub newly_unlocked: bool,
    pub unlocked_at: Option<String>,
    pub xp_reward: u32,
    pub progress: UserProgress,
}

pub const STREAK_FREEZE_UNLOCK_LEVEL: u32 = 5;

/// ISO-8601 week key matching the TS `getIsoWeekKey` helper (e.g. "2026-W45").
pub fn iso_week_key(date: chrono::NaiveDate) -> String {
    let w = date.iso_week();
    format!("{}-W{:02}", w.year(), w.week())
}

/// One freeze per ISO week once the user reaches Level 5.
pub fn is_freeze_available(level: u32, last_freeze_week: Option<&str>, current_week: &str) -> bool {
    level >= STREAK_FREEZE_UNLOCK_LEVEL && last_freeze_week != Some(current_week)
}

fn current_week_key() -> String {
    iso_week_key(Local::now().date_naive())
}

/// Read the progress singleton (works on a Connection or an open Transaction).
fn read_progress(conn: &Connection) -> Result<UserProgress, String> {
    let mut progress = conn
        .query_row(
            "SELECT id, total_xp, current_level, current_streak, longest_streak,
                    total_checks, last_check_date, last_freeze_week, updated_at
             FROM user_progress
             WHERE id = 1",
            [],
            |row| {
                Ok(UserProgress {
                    id: row.get(0)?,
                    total_xp: row.get(1)?,
                    current_level: row.get(2)?,
                    current_streak: row.get(3)?,
                    longest_streak: row.get(4)?,
                    total_checks: row.get(5)?,
                    streak_freeze_available: false,
                    last_check_date: row.get(6)?,
                    last_freeze_week: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    progress.streak_freeze_available = is_freeze_available(
        progress.current_level,
        progress.last_freeze_week.as_deref(),
        &current_week_key(),
    );
    Ok(progress)
}

/// Upsert the progress singleton, normalising level and freeze availability.
fn write_progress(conn: &Connection, progress: &mut UserProgress) -> Result<(), String> {
    progress.current_level = calculate_level_from_xp(progress.total_xp);
    progress.streak_freeze_available = is_freeze_available(
        progress.current_level,
        progress.last_freeze_week.as_deref(),
        &current_week_key(),
    );
    progress.updated_at = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO user_progress (
            id, total_xp, current_level, current_streak, longest_streak,
            total_checks, streak_freeze_available, last_check_date, last_freeze_week, updated_at
        ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(id) DO UPDATE SET
            total_xp = excluded.total_xp,
            current_level = excluded.current_level,
            current_streak = excluded.current_streak,
            longest_streak = excluded.longest_streak,
            total_checks = excluded.total_checks,
            streak_freeze_available = excluded.streak_freeze_available,
            last_check_date = excluded.last_check_date,
            last_freeze_week = excluded.last_freeze_week,
            updated_at = excluded.updated_at;",
        params![
            progress.total_xp,
            progress.current_level,
            progress.current_streak,
            progress.longest_streak,
            progress.total_checks,
            if progress.streak_freeze_available { 1 } else { 0 },
            progress.last_check_date,
            progress.last_freeze_week,
            progress.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

impl Default for UserProgress {
    fn default() -> Self {
        Self {
            id: 1,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            total_checks: 0,
            streak_freeze_available: false,
            last_check_date: None,
            last_freeze_week: None,
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub xp_reward: u32,
    pub condition_type: String,
    pub condition_value: u32,
    pub is_unlocked: bool,
    pub unlocked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedAppState {
    pub id: i64,
    #[serde(alias = "is_paused")]
    pub is_paused: bool,
    #[serde(alias = "is_dnd")]
    pub is_dnd: bool,
    #[serde(alias = "dnd_until")]
    pub dnd_until: Option<String>,
    #[serde(alias = "theme_mode")]
    pub theme_mode: String,
    #[serde(alias = "launch_on_startup")]
    pub launch_on_startup: bool,
}

impl Default for PersistedAppState {
    fn default() -> Self {
        Self {
            id: 1,
            is_paused: false,
            is_dnd: false,
            dnd_until: None,
            theme_mode: "system".to_string(),
            launch_on_startup: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayStats {
    pub total_checks_today: u32,
    pub acknowledged_today: u32,
    pub acknowledgment_rate: f64,
    pub xp_earned_today: u32,
}

/// Calculate current level given total XP
pub fn calculate_level_from_xp(total_xp: u32) -> u32 {
    let thresholds = [
        (25, 50_000),
        (24, 45_000),
        (23, 40_000),
        (22, 35_000),
        (21, 30_000),
        (20, 25_000),
        (19, 22_500),
        (18, 19_500),
        (17, 16_500),
        (16, 14_000),
        (15, 12_000),
        (14, 10_500),
        (13, 9_000),
        (12, 7_500),
        (11, 6_200),
        (10, 5_000),
        (9, 4_000),
        (8, 3_000),
        (7, 2_200),
        (6, 1_500),
        (5, 1_000),
        (4, 600),
        (3, 300),
        (2, 100),
        (1, 0),
    ];
    for (lvl, xp) in thresholds {
        if total_xp >= xp {
            return lvl;
        }
    }
    1
}

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Arc::new(Mutex::new(conn)),
        }
    }

    /// Retrieve the active posture settings profile
    pub fn get_settings(&self) -> Result<PostureSettings, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, profile_name, interval_minutes, intensity_level,
                        active_hours_start, active_hours_end, active_days,
                        routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                        created_at, updated_at, level5_opt_in, mascot_tone
                 FROM posture_settings
                 WHERE is_active_profile = 1
                 ORDER BY created_at ASC
                 LIMIT 1",
            )
            .map_err(|e| e.to_string())?;

        let settings = stmt
            .query_row([], |row| {
                Ok(PostureSettings {
                    id: row.get(0)?,
                    profile_name: row.get(1)?,
                    interval_minutes: row.get(2)?,
                    intensity_level: row.get(3)?,
                    active_hours_start: row.get(4)?,
                    active_hours_end: row.get(5)?,
                    active_days: row.get(6)?,
                    routing_mode: row.get(7)?,
                    auto_escalation: row.get::<_, i64>(8)? != 0,
                    dnd_enabled: row.get::<_, i64>(9)? != 0,
                    is_active_profile: row.get::<_, i64>(10)? != 0,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                    level5_opt_in: row.get::<_, Option<i64>>(13).unwrap_or(Some(0)).unwrap_or(0) != 0,
                    mascot_tone: row.get::<_, Option<String>>(14).unwrap_or(None).unwrap_or_else(|| "encouraging".to_string()),
                })
            })
            .optional()
            .map_err(|e| e.to_string())?;

        Ok(settings.unwrap_or_default())
    }

    /// Upsert active posture settings atomically
    pub fn save_settings(&self, input: SaveSettingsInput) -> Result<PostureSettings, String> {
        let now_utc = Utc::now().to_rfc3339();
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let mut current = {
            if let Some(ref target_id) = input.id {
                let mut stmt = tx
                    .prepare(
                        "SELECT id, profile_name, interval_minutes, intensity_level,
                                active_hours_start, active_hours_end, active_days,
                                routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                                created_at, updated_at, level5_opt_in, mascot_tone
                         FROM posture_settings
                         WHERE id = ?1",
                    )
                    .map_err(|e| e.to_string())?;

                let res = stmt
                    .query_row(params![target_id], |row| {
                        Ok(PostureSettings {
                            id: row.get(0)?,
                            profile_name: row.get(1)?,
                            interval_minutes: row.get(2)?,
                            intensity_level: row.get(3)?,
                            active_hours_start: row.get(4)?,
                            active_hours_end: row.get(5)?,
                            active_days: row.get(6)?,
                            routing_mode: row.get(7)?,
                            auto_escalation: row.get::<_, i64>(8)? != 0,
                            dnd_enabled: row.get::<_, i64>(9)? != 0,
                            is_active_profile: row.get::<_, i64>(10)? != 0,
                            created_at: row.get(11)?,
                            updated_at: row.get(12)?,
                            level5_opt_in: row.get::<_, Option<i64>>(13).unwrap_or(Some(0)).unwrap_or(0) != 0,
                            mascot_tone: row.get::<_, Option<String>>(14).unwrap_or(None).unwrap_or_else(|| "encouraging".to_string()),
                        })
                    })
                    .optional()
                    .map_err(|e| e.to_string())?;
                res.unwrap_or_default()
            } else {
                let mut stmt = tx
                    .prepare(
                        "SELECT id, profile_name, interval_minutes, intensity_level,
                                active_hours_start, active_hours_end, active_days,
                                routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                                created_at, updated_at, level5_opt_in, mascot_tone
                         FROM posture_settings
                         WHERE is_active_profile = 1
                         ORDER BY created_at ASC
                         LIMIT 1",
                    )
                    .map_err(|e| e.to_string())?;

                let res = stmt
                    .query_row([], |row| {
                        Ok(PostureSettings {
                            id: row.get(0)?,
                            profile_name: row.get(1)?,
                            interval_minutes: row.get(2)?,
                            intensity_level: row.get(3)?,
                            active_hours_start: row.get(4)?,
                            active_hours_end: row.get(5)?,
                            active_days: row.get(6)?,
                            routing_mode: row.get(7)?,
                            auto_escalation: row.get::<_, i64>(8)? != 0,
                            dnd_enabled: row.get::<_, i64>(9)? != 0,
                            is_active_profile: row.get::<_, i64>(10)? != 0,
                            created_at: row.get(11)?,
                            updated_at: row.get(12)?,
                            level5_opt_in: row.get::<_, Option<i64>>(13).unwrap_or(Some(0)).unwrap_or(0) != 0,
                            mascot_tone: row.get::<_, Option<String>>(14).unwrap_or(None).unwrap_or_else(|| "encouraging".to_string()),
                        })
                    })
                    .optional()
                    .map_err(|e| e.to_string())?;
                res.unwrap_or_default()
            }
        };

        if let Some(profile_name) = input.profile_name {
            current.profile_name = profile_name;
        }
        if let Some(interval) = input.interval_minutes {
            current.interval_minutes = interval;
        }
        if let Some(intensity) = input.intensity_level {
            current.intensity_level = intensity;
        }
        if let Some(start) = input.active_hours_start {
            current.active_hours_start = start;
        }
        if let Some(end) = input.active_hours_end {
            current.active_hours_end = end;
        }
        if let Some(days) = input.active_days {
            current.active_days = days;
        }
        if let Some(mode) = input.routing_mode {
            current.routing_mode = mode;
        }
        if let Some(auto_esc) = input.auto_escalation {
            current.auto_escalation = auto_esc;
        }
        if let Some(dnd) = input.dnd_enabled {
            current.dnd_enabled = dnd;
        }
        if let Some(opt_in) = input.level5_opt_in {
            current.level5_opt_in = opt_in;
        }
        if let Some(tone) = input.mascot_tone {
            current.mascot_tone = tone;
        }
        current.updated_at = now_utc;

        tx.execute(
            "INSERT INTO posture_settings (
                id, profile_name, interval_minutes, intensity_level,
                active_hours_start, active_hours_end, active_days,
                routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                created_at, updated_at, level5_opt_in, mascot_tone
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ON CONFLICT(id) DO UPDATE SET
                profile_name = excluded.profile_name,
                interval_minutes = excluded.interval_minutes,
                intensity_level = excluded.intensity_level,
                active_hours_start = excluded.active_hours_start,
                active_hours_end = excluded.active_hours_end,
                active_days = excluded.active_days,
                routing_mode = excluded.routing_mode,
                auto_escalation = excluded.auto_escalation,
                dnd_enabled = excluded.dnd_enabled,
                is_active_profile = excluded.is_active_profile,
                updated_at = excluded.updated_at,
                level5_opt_in = excluded.level5_opt_in,
                mascot_tone = excluded.mascot_tone;",
            params![
                current.id,
                current.profile_name,
                current.interval_minutes,
                current.intensity_level,
                current.active_hours_start,
                current.active_hours_end,
                current.active_days,
                current.routing_mode,
                if current.auto_escalation { 1 } else { 0 },
                if current.dnd_enabled { 1 } else { 0 },
                if current.is_active_profile { 1 } else { 0 },
                current.created_at,
                current.updated_at,
                if current.level5_opt_in { 1 } else { 0 },
                current.mascot_tone,
            ],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(current)
    }

    /// Insert a new posture check event
    pub fn log_posture_check(&self, check: NewPostureCheck) -> Result<PostureCheck, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let check_id = check
            .id
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let fired_at = check
            .fired_at
            .unwrap_or_else(|| Utc::now().to_rfc3339());
        let created_at = Utc::now().to_rfc3339();

        let record = PostureCheck {
            id: check_id,
            fired_at,
            acknowledged_at: None,
            response: "pending".to_string(),
            intensity_level: check.intensity_level,
            xp_earned: 0,
            message_shown: check.message_shown,
            created_at,
        };

        conn.execute(
            "INSERT OR IGNORE INTO posture_checks (
                id, fired_at, acknowledged_at, response, intensity_level, xp_earned, message_shown, created_at, is_test
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.id,
                record.fired_at,
                record.acknowledged_at,
                record.response,
                record.intensity_level,
                record.xp_earned,
                record.message_shown,
                record.created_at,
                if check.is_test { 1 } else { 0 },
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(record)
    }

    /// Update an existing posture check's response and acknowledged time
    pub fn update_posture_check(
        &self,
        id: &str,
        response: &str,
        acknowledged_at: Option<&str>,
        xp_earned: Option<u32>,
    ) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn
            .execute(
                "UPDATE posture_checks
                 SET response = ?1,
                     acknowledged_at = COALESCE(?2, acknowledged_at),
                     xp_earned = COALESCE(?3, xp_earned)
                 WHERE id = ?4",
                params![response, acknowledged_at, xp_earned, id],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows > 0)
    }

    /// Get paginated posture check history ordered by fired_at descending
    pub fn get_posture_checks(&self, limit: u32, offset: u32) -> Result<Vec<PostureCheck>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, fired_at, acknowledged_at, response, intensity_level, xp_earned, message_shown, created_at
                 FROM posture_checks
                 ORDER BY fired_at DESC
                 LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![limit, offset], |row| {
                Ok(PostureCheck {
                    id: row.get(0)?,
                    fired_at: row.get(1)?,
                    acknowledged_at: row.get(2)?,
                    response: row.get(3)?,
                    intensity_level: row.get(4)?,
                    xp_earned: row.get(5)?,
                    message_shown: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut checks = Vec::new();
        for r in rows {
            checks.push(r.map_err(|e| e.to_string())?);
        }

        Ok(checks)
    }

    /// Get user progress singleton
    pub fn get_user_progress(&self) -> Result<UserProgress, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        read_progress(&conn)
    }

    /// Overwrite user progress singleton (used by tests and data import).
    /// Level and freeze availability are normalised from XP / freeze week.
    pub fn update_user_progress(&self, progress: &UserProgress) -> Result<UserProgress, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut updated = progress.clone();
        write_progress(&conn, &mut updated)?;
        Ok(updated)
    }

    /// Atomically apply a partial streak update.
    pub fn patch_user_progress(&self, patch: &ProgressPatch) -> Result<UserProgress, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut progress = read_progress(&tx)?;
        if let Some(v) = patch.current_streak {
            progress.current_streak = v;
        }
        if let Some(v) = patch.longest_streak {
            progress.longest_streak = v;
        }
        // Longest streak can never fall below the current streak
        progress.longest_streak = progress.longest_streak.max(progress.current_streak);
        if let Some(v) = &patch.last_check_date {
            progress.last_check_date = Some(v.clone());
        }
        if let Some(v) = &patch.last_freeze_week {
            progress.last_freeze_week = Some(v.clone());
        }
        write_progress(&tx, &mut progress)?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(progress)
    }

    /// Atomically add XP (no read-modify-write in the frontend).
    pub fn add_xp(&self, amount: u32) -> Result<UserProgress, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut progress = read_progress(&tx)?;
        progress.total_xp = progress.total_xp.saturating_add(amount);
        write_progress(&tx, &mut progress)?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(progress)
    }

    /// Process check acknowledgment: updates check, awards XP and updates streaks atomically.
    ///
    /// Returns `(progress, counted)`. `counted` is false for test notifications:
    /// the check is marked acknowledged but earns no XP, doesn't touch totals or
    /// streaks, and must not trigger achievement evaluation.
    ///
    /// Achievement detection is NOT done here: the shared TypeScript engine
    /// (`checkAchievements`) owns the rules and calls `unlock_achievement`.
    pub fn process_check_acknowledgment(
        &self,
        check_id: Option<&str>,
        xp_to_award: u32,
    ) -> Result<(UserProgress, bool), String> {
        let now = Local::now();
        let now_utc = Utc::now().to_rfc3339();
        let today_date_str = now.format("%Y-%m-%d").to_string();
        let yesterday_date_str = (now - Duration::days(1)).format("%Y-%m-%d").to_string();
        let day_before_yesterday_str = (now - Duration::days(2)).format("%Y-%m-%d").to_string();
        let current_week = iso_week_key(now.date_naive());

        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Test notifications: record the response, award nothing
        let is_test = match check_id {
            Some(id) => tx
                .query_row(
                    "SELECT is_test FROM posture_checks WHERE id = ?1",
                    params![id],
                    |row| row.get::<_, i64>(0),
                )
                .optional()
                .map_err(|e| e.to_string())?
                .unwrap_or(0)
                != 0,
            None => false,
        };

        if let Some(id) = check_id {
            tx.execute(
                "UPDATE posture_checks
                 SET response = 'acknowledged',
                     acknowledged_at = ?1,
                     xp_earned = ?2
                 WHERE id = ?3",
                params![now_utc, if is_test { 0 } else { xp_to_award }, id],
            )
            .map_err(|e| e.to_string())?;
        }

        let mut progress = read_progress(&tx)?;

        if is_test {
            tx.commit().map_err(|e| e.to_string())?;
            return Ok((progress, false));
        }

        // 2. XP and totals
        progress.total_xp = progress.total_xp.saturating_add(xp_to_award);
        progress.total_checks += 1;
        let level = calculate_level_from_xp(progress.total_xp);
        let freeze_available =
            is_freeze_available(level, progress.last_freeze_week.as_deref(), &current_week);

        // 3. Streak calculation based on local date
        match progress.last_check_date.clone() {
            Some(last_date) if last_date == today_date_str => {
                // Already checked in today, keep streak
            }
            Some(last_date) if last_date == yesterday_date_str => {
                progress.current_streak += 1;
                progress.last_check_date = Some(today_date_str.clone());
            }
            Some(last_date) if last_date == day_before_yesterday_str && freeze_available => {
                // Exactly one missed day: consume this week's freeze to protect the streak
                progress.last_freeze_week = Some(current_week.clone());
                progress.current_streak += 1;
                progress.last_check_date = Some(today_date_str.clone());
            }
            Some(_) => {
                // Gap too long (or no freeze left): start over
                progress.current_streak = 1;
                progress.last_check_date = Some(today_date_str.clone());
            }
            None => {
                progress.current_streak = 1;
                progress.last_check_date = Some(today_date_str.clone());
            }
        }
        progress.longest_streak = progress.longest_streak.max(progress.current_streak);

        write_progress(&tx, &mut progress)?;
        tx.commit().map_err(|e| e.to_string())?;

        Ok((progress, true))
    }

    /// Retrieve all achievements joined with unlock status
    pub fn get_achievements(&self) -> Result<Vec<AchievementItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT a.id, a.name, a.description, a.icon, a.xp_reward, a.condition_type, a.condition_value,
                        CASE WHEN ua.achievement_id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked,
                        ua.unlocked_at
                 FROM achievements a
                 LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
                 ORDER BY a.xp_reward ASC, a.id ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(AchievementItem {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    icon: row.get(3)?,
                    xp_reward: row.get(4)?,
                    condition_type: row.get(5)?,
                    condition_value: row.get(6)?,
                    is_unlocked: row.get::<_, i64>(7)? != 0,
                    unlocked_at: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut achievements = Vec::new();
        for r in rows {
            achievements.push(r.map_err(|e| e.to_string())?);
        }

        Ok(achievements)
    }

    /// Unlock an achievement and grant its XP reward in ONE transaction.
    ///
    /// Idempotent: only the call that inserts the row grants XP
    /// (`newly_unlocked = true`). Unknown IDs are an error.
    pub fn unlock_achievement(&self, achievement_id: &str) -> Result<AchievementUnlockResult, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let now_utc = Utc::now().to_rfc3339();

        let xp_reward: u32 = tx
            .query_row(
                "SELECT xp_reward FROM achievements WHERE id = ?1",
                params![achievement_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Unknown achievement: {}", achievement_id))?;

        let inserted = tx
            .execute(
                "INSERT OR IGNORE INTO user_achievements (achievement_id, unlocked_at, xp_granted)
                 VALUES (?1, ?2, 1)",
                params![achievement_id, now_utc],
            )
            .map_err(|e| e.to_string())?
            > 0;

        let mut progress = read_progress(&tx)?;
        let unlocked_at: Option<String> = if inserted {
            progress.total_xp = progress.total_xp.saturating_add(xp_reward);
            write_progress(&tx, &mut progress)?;
            Some(now_utc)
        } else {
            tx.query_row(
                "SELECT unlocked_at FROM user_achievements WHERE achievement_id = ?1",
                params![achievement_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        };

        tx.commit().map_err(|e| e.to_string())?;

        Ok(AchievementUnlockResult {
            achievement_id: achievement_id.to_string(),
            newly_unlocked: inserted,
            unlocked_at,
            xp_reward,
            progress,
        })
    }

    /// Retrieve persisted app state
    pub fn get_app_state(&self) -> Result<PersistedAppState, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, is_paused, is_dnd, dnd_until, theme_mode, launch_on_startup
                 FROM app_state
                 WHERE id = 1",
            )
            .map_err(|e| e.to_string())?;

        let state = stmt
            .query_row([], |row| {
                Ok(PersistedAppState {
                    id: row.get(0)?,
                    is_paused: row.get::<_, i64>(1)? != 0,
                    is_dnd: row.get::<_, i64>(2)? != 0,
                    dnd_until: row.get(3)?,
                    theme_mode: row.get(4)?,
                    launch_on_startup: row.get::<_, i64>(5)? != 0,
                })
            })
            .optional()
            .map_err(|e| e.to_string())?;

        Ok(state.unwrap_or_default())
    }

    /// Persist app state
    pub fn save_app_state(&self, state: &PersistedAppState) -> Result<PersistedAppState, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO app_state (id, is_paused, is_dnd, dnd_until, theme_mode, launch_on_startup)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                 is_paused = excluded.is_paused,
                 is_dnd = excluded.is_dnd,
                 dnd_until = excluded.dnd_until,
                 theme_mode = excluded.theme_mode,
                 launch_on_startup = excluded.launch_on_startup;",
            params![
                if state.is_paused { 1 } else { 0 },
                if state.is_dnd { 1 } else { 0 },
                state.dnd_until,
                state.theme_mode,
                if state.launch_on_startup { 1 } else { 0 },
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(state.clone())
    }

    /// Retrieve today's statistics
    pub fn get_today_stats(&self) -> Result<TodayStats, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        // Calculate start of current local day in UTC
        let now_local = Local::now();
        let local_start_of_day = now_local
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap_or_default();
        let local_start_dt = local_start_of_day
            .and_local_timezone(Local)
            .single()
            .unwrap_or(now_local);
        let start_utc_iso = local_start_dt.with_timezone(&Utc).to_rfc3339();

        let mut stmt = conn
            .prepare(
                "SELECT
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN response = 'acknowledged' THEN 1 ELSE 0 END) as ack_checks,
                    SUM(CASE WHEN response = 'acknowledged' THEN xp_earned ELSE 0 END) as total_xp
                 FROM posture_checks
                 WHERE fired_at >= ?1 AND is_test = 0",
            )
            .map_err(|e| e.to_string())?;

        let (total_checks, acknowledged, xp_earned): (u32, u32, u32) = stmt
            .query_row(params![start_utc_iso], |row| {
                let total: u32 = row.get(0).unwrap_or(0);
                let ack: u32 = row.get(1).unwrap_or(0);
                let xp: u32 = row.get(2).unwrap_or(0);
                Ok((total, ack, xp))
            })
            .unwrap_or((0, 0, 0));

        let rate = if total_checks > 0 {
            (acknowledged as f64) / (total_checks as f64)
        } else {
            0.0
        };

        Ok(TodayStats {
            total_checks_today: total_checks,
            acknowledged_today: acknowledged,
            acknowledgment_rate: rate,
            xp_earned_today: xp_earned,
        })
    }

    /// Retrieve all posture profiles ordered by creation
    pub fn get_profiles(&self) -> Result<Vec<PostureSettings>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, profile_name, interval_minutes, intensity_level,
                        active_hours_start, active_hours_end, active_days,
                        routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                        created_at, updated_at, level5_opt_in, mascot_tone
                 FROM posture_settings
                 ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(PostureSettings {
                    id: row.get(0)?,
                    profile_name: row.get(1)?,
                    interval_minutes: row.get(2)?,
                    intensity_level: row.get(3)?,
                    active_hours_start: row.get(4)?,
                    active_hours_end: row.get(5)?,
                    active_days: row.get(6)?,
                    routing_mode: row.get(7)?,
                    auto_escalation: row.get::<_, i64>(8)? != 0,
                    dnd_enabled: row.get::<_, i64>(9)? != 0,
                    is_active_profile: row.get::<_, i64>(10)? != 0,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                    level5_opt_in: row.get::<_, Option<i64>>(13).unwrap_or(Some(0)).unwrap_or(0) != 0,
                    mascot_tone: row.get::<_, Option<String>>(14).unwrap_or(None).unwrap_or_else(|| "encouraging".to_string()),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut profiles = Vec::new();
        for r in rows {
            profiles.push(r.map_err(|e| e.to_string())?);
        }
        Ok(profiles)
    }

    /// Switch active posture profile by ID
    pub fn switch_profile(&self, profile_id: &str) -> Result<PostureSettings, String> {
        let now_utc = Utc::now().to_rfc3339();
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        tx.execute("UPDATE posture_settings SET is_active_profile = 0", [])
            .map_err(|e| e.to_string())?;

        let updated = tx
            .execute(
                "UPDATE posture_settings SET is_active_profile = 1, updated_at = ?1 WHERE id = ?2",
                params![now_utc, profile_id],
            )
            .map_err(|e| e.to_string())?;

        if updated == 0 {
            return Err(format!("Profile with ID {} not found", profile_id));
        }

        let mut stmt = tx
            .prepare(
                "SELECT id, profile_name, interval_minutes, intensity_level,
                        active_hours_start, active_hours_end, active_days,
                        routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                        created_at, updated_at, level5_opt_in, mascot_tone
                 FROM posture_settings
                 WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let profile = stmt
            .query_row(params![profile_id], |row| {
                Ok(PostureSettings {
                    id: row.get(0)?,
                    profile_name: row.get(1)?,
                    interval_minutes: row.get(2)?,
                    intensity_level: row.get(3)?,
                    active_hours_start: row.get(4)?,
                    active_hours_end: row.get(5)?,
                    active_days: row.get(6)?,
                    routing_mode: row.get(7)?,
                    auto_escalation: row.get::<_, i64>(8)? != 0,
                    dnd_enabled: row.get::<_, i64>(9)? != 0,
                    is_active_profile: row.get::<_, i64>(10)? != 0,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                    level5_opt_in: row.get::<_, Option<i64>>(13).unwrap_or(Some(0)).unwrap_or(0) != 0,
                    mascot_tone: row.get::<_, Option<String>>(14).unwrap_or(None).unwrap_or_else(|| "encouraging".to_string()),
                })
            })
            .map_err(|e| e.to_string())?;

        drop(stmt);
        tx.commit().map_err(|e| e.to_string())?;
        Ok(profile)
    }

    /// Create a new named profile
    pub fn create_profile(&self, input: SaveSettingsInput) -> Result<PostureSettings, String> {
        let now_utc = Utc::now().to_rfc3339();
        let id = input.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let profile_name = input.profile_name.unwrap_or_else(|| "Custom Profile".to_string());
        let interval_minutes = input.interval_minutes.unwrap_or(30);
        let intensity_level = input.intensity_level.unwrap_or(2);
        let active_hours_start = input.active_hours_start.unwrap_or_else(|| "08:00".to_string());
        let active_hours_end = input.active_hours_end.unwrap_or_else(|| "22:00".to_string());
        let active_days = input.active_days.unwrap_or_else(|| "1,2,3,4,5,6,7".to_string());
        let routing_mode = input.routing_mode.unwrap_or_else(|| "pc_only".to_string());
        let auto_escalation = input.auto_escalation.unwrap_or(false);
        let dnd_enabled = input.dnd_enabled.unwrap_or(false);
        let make_active = input.is_active_profile.unwrap_or(false);
        let level5_opt_in = input.level5_opt_in.unwrap_or(false);
        let mascot_tone = input.mascot_tone.unwrap_or_else(|| "encouraging".to_string());

        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        if make_active {
            tx.execute("UPDATE posture_settings SET is_active_profile = 0", [])
                .map_err(|e| e.to_string())?;
        }

        let profile = PostureSettings {
            id: id.clone(),
            profile_name,
            interval_minutes,
            intensity_level,
            active_hours_start,
            active_hours_end,
            active_days,
            routing_mode,
            auto_escalation,
            dnd_enabled,
            is_active_profile: make_active,
            created_at: now_utc.clone(),
            updated_at: now_utc.clone(),
            level5_opt_in,
            mascot_tone,
        };

        tx.execute(
            "INSERT INTO posture_settings (
                id, profile_name, interval_minutes, intensity_level,
                active_hours_start, active_hours_end, active_days,
                routing_mode, auto_escalation, dnd_enabled, is_active_profile,
                created_at, updated_at, level5_opt_in, mascot_tone
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                profile.id,
                profile.profile_name,
                profile.interval_minutes,
                profile.intensity_level,
                profile.active_hours_start,
                profile.active_hours_end,
                profile.active_days,
                profile.routing_mode,
                if profile.auto_escalation { 1 } else { 0 },
                if profile.dnd_enabled { 1 } else { 0 },
                if profile.is_active_profile { 1 } else { 0 },
                profile.created_at,
                profile.updated_at,
                if profile.level5_opt_in { 1 } else { 0 },
                profile.mascot_tone,
            ],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(profile)
    }

    /// Delete a profile by ID
    pub fn delete_profile(&self, profile_id: &str) -> Result<bool, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let count: i64 = tx
            .query_row("SELECT COUNT(*) FROM posture_settings", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if count <= 1 {
            return Err("Cannot delete the only remaining profile".to_string());
        }

        let is_active: bool = tx
            .query_row(
                "SELECT is_active_profile FROM posture_settings WHERE id = ?1",
                params![profile_id],
                |r| Ok(r.get::<_, i64>(0)? != 0),
            )
            .map_err(|e| e.to_string())?;

        if is_active {
            tx.execute(
                "UPDATE posture_settings SET is_active_profile = 1 WHERE id != ?1 ORDER BY created_at ASC LIMIT 1",
                params![profile_id],
            )
            .map_err(|e| e.to_string())?;
        }

        let rows = tx
            .execute("DELETE FROM posture_settings WHERE id = ?1", params![profile_id])
            .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(rows > 0)
    }

    /// Clear all logged posture checks
    pub fn clear_posture_history(&self) -> Result<usize, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn
            .execute("DELETE FROM posture_checks", [])
            .map_err(|e| e.to_string())?;
        Ok(rows)
    }

    /// Export all application and posture check data as a structured JSON string
    pub fn export_posture_data(&self) -> Result<String, String> {
        let active_settings = self.get_settings()?;
        let profiles = self.get_profiles()?;
        let checks = self.get_posture_checks(10000, 0)?;
        let progress = self.get_user_progress()?;
        let achievements = self.get_achievements()?;
        let app_state = self.get_app_state()?;

        let export = serde_json::json!({
            "exportDate": Utc::now().to_rfc3339(),
            "appName": "Posture Check! Desktop",
            "version": "0.1.0",
            "activeSettings": active_settings,
            "profiles": profiles,
            "postureChecks": checks,
            "userProgress": progress,
            "achievements": achievements,
            "appState": app_state,
        });

        serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
    }
}

/// Apply database schema and seed migrations in sequential order
pub fn apply_migrations(conn: &Connection) -> Result<(), String> {
    // Create migrations table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
        [],
    )
    .map_err(|e| format!("Failed to create migrations table: {}", e))?;

    // Check applied migrations
    let applied_versions: std::collections::HashSet<i64> = {
        let mut stmt = conn
            .prepare("SELECT version FROM _migrations")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let mut set = std::collections::HashSet::new();
        for r in rows {
            if let Ok(v) = r {
                set.insert(v);
            }
        }
        set
    };

    // 001_initial_schema
    if !applied_versions.contains(&1) {
        let sql_001 = include_str!("../migrations/001_initial_schema.sql");
        conn.execute_batch(sql_001)
            .map_err(|e| format!("Migration 001_initial_schema failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (1, 'initial_schema')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 002_seed_achievements
    if !applied_versions.contains(&2) {
        let sql_002 = include_str!("../migrations/002_seed_achievements.sql");
        conn.execute_batch(sql_002)
            .map_err(|e| format!("Migration 002_seed_achievements failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (2, 'seed_achievements')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 003_add_posture_checks_index
    if !applied_versions.contains(&3) {
        let sql_003 = include_str!("../migrations/003_add_posture_checks_index.sql");
        conn.execute_batch(sql_003)
            .map_err(|e| format!("Migration 003_add_posture_checks_index failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (3, 'add_posture_checks_index')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 004_seed_quick_profiles
    if !applied_versions.contains(&4) {
        let sql_004 = include_str!("../migrations/004_seed_quick_profiles.sql");
        conn.execute_batch(sql_004)
            .map_err(|e| format!("Migration 004_seed_quick_profiles failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (4, 'seed_quick_profiles')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 005_add_level5_opt_in
    if !applied_versions.contains(&5) {
        let sql_005 = include_str!("../migrations/005_add_level5_opt_in.sql");
        conn.execute_batch(sql_005)
            .map_err(|e| format!("Migration 005_add_level5_opt_in failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (5, 'add_level5_opt_in')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 006_add_mascot_tone
    if !applied_versions.contains(&6) {
        let sql_006 = include_str!("../migrations/006_add_mascot_tone.sql");
        conn.execute_batch(sql_006)
            .map_err(|e| format!("Migration 006_add_mascot_tone failed: {}", e))?;
        conn.execute(
            "INSERT INTO _migrations (version, description) VALUES (6, 'add_mascot_tone')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // 007_achievements_integrity (transactional: schema + catalog + legacy XP + level fix-up)
    if !applied_versions.contains(&7) {
        let tx = conn
            .unchecked_transaction()
            .map_err(|e| format!("Migration 007 failed to begin: {}", e))?;
        let sql_007 = include_str!("../migrations/007_achievements_integrity.sql");
        tx.execute_batch(sql_007)
            .map_err(|e| format!("Migration 007_achievements_integrity failed: {}", e))?;

        // Legacy XP may have crossed level thresholds; normalise level + freeze flag
        let has_progress: bool = tx
            .query_row("SELECT EXISTS(SELECT 1 FROM user_progress WHERE id = 1)", [], |r| {
                r.get::<_, i64>(0)
            })
            .map_err(|e| e.to_string())?
            != 0;
        if has_progress {
            let mut progress = read_progress(&tx)?;
            write_progress(&tx, &mut progress)?;
        }

        tx.execute(
            "INSERT INTO _migrations (version, description) VALUES (7, 'achievements_integrity')",
            [],
        )
        .map_err(|e| e.to_string())?;
        tx.commit()
            .map_err(|e| format!("Migration 007 failed to commit: {}", e))?;
    }

    Ok(())
}

/// Initialize SQLite database, create platform-specific folder, and run migrations in order
pub fn init_database(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory '{:?}': {}", app_dir, e))?;

    let db_path = app_dir.join("posturecheck.db");

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open SQLite database at '{:?}': {}", db_path, e))?;

    // Enable WAL mode, foreign keys, and busy timeout for concurrent safety
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )
    .map_err(|e| format!("Failed to set SQLite pragmas: {}", e))?;

    apply_migrations(&conn)?;

    Ok(Database::new(conn))
}

#[cfg(test)]
pub fn init_test_database() -> Database {
    let conn = Connection::open_in_memory().expect("open in-memory db");
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )
    .expect("setup in-memory pragmas");

    apply_migrations(&conn).expect("apply migrations in test db");
    Database::new(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings_on_first_launch() {
        let db = init_test_database();
        let settings = db.get_settings().expect("get settings");
        assert_eq!(settings.interval_minutes, 30);
        assert_eq!(settings.intensity_level, 2);
        assert_eq!(settings.active_hours_start, "08:00");
        assert_eq!(settings.active_hours_end, "22:00");
        assert_eq!(settings.active_days, "1,2,3,4,5,6,7");
        assert_eq!(settings.routing_mode, "pc_only");
        assert!(!settings.auto_escalation);
        assert!(!settings.dnd_enabled);
        assert!(settings.is_active_profile);
        assert!(!settings.level5_opt_in);
        assert_eq!(settings.mascot_tone, "encouraging");
    }

    #[test]
    fn test_mascot_tone_persistence() {
        let db = init_test_database();
        let initial = db.get_settings().expect("get initial settings");
        assert_eq!(initial.mascot_tone, "encouraging");

        let updated = db
            .save_settings(SaveSettingsInput {
                mascot_tone: Some("sassy".to_string()),
                ..Default::default()
            })
            .expect("save tone");
        assert_eq!(updated.mascot_tone, "sassy");

        let fetched = db.get_settings().expect("fetch saved tone");
        assert_eq!(fetched.mascot_tone, "sassy");
    }

    #[test]
    fn test_level5_opt_in_persistence() {
        let db = init_test_database();
        let initial = db.get_settings().expect("get initial settings");
        assert!(!initial.level5_opt_in);

        // Explicitly opt in to Level 5
        let updated = db
            .save_settings(SaveSettingsInput {
                level5_opt_in: Some(true),
                intensity_level: Some(5),
                ..Default::default()
            })
            .expect("save opt in");
        assert!(updated.level5_opt_in);
        assert_eq!(updated.intensity_level, 5);

        // Fetch back and verify persistence
        let refreshed = db.get_settings().expect("refreshed settings");
        assert!(refreshed.level5_opt_in);
        assert_eq!(refreshed.intensity_level, 5);
    }

    #[test]
    fn test_save_settings_persistence() {
        let db = init_test_database();

        // Verify deserialization accepts snake_case as well as camelCase
        let from_snake: SaveSettingsInput = serde_json::from_str(r#"{"interval_minutes": 15}"#).expect("deserialize snake_case");
        assert_eq!(from_snake.interval_minutes, Some(15));
        let from_camel: SaveSettingsInput = serde_json::from_str(r#"{"intervalMinutes": 20}"#).expect("deserialize camelCase");
        assert_eq!(from_camel.interval_minutes, Some(20));

        let updated = db
            .save_settings(SaveSettingsInput {
                interval_minutes: Some(15),
                ..Default::default()
            })
            .expect("save settings");
        assert_eq!(updated.interval_minutes, 15);

        let fetched = db.get_settings().expect("get settings again");
        assert_eq!(fetched.interval_minutes, 15);
        assert_eq!(fetched.profile_name, "Default");
    }

    #[test]
    fn test_log_and_update_posture_check() {
        let db = init_test_database();
        let check = db
            .log_posture_check(NewPostureCheck {
                id: None,
                fired_at: None,
                intensity_level: 2,
                message_shown: Some("Ribbit nudges: Time for a posture check!".to_string()),
                is_test: false,
            })
            .expect("log posture check");

        assert_eq!(check.response, "pending");
        assert_eq!(check.intensity_level, 2);
        assert_eq!(check.xp_earned, 0);

        let ack_time = Utc::now().to_rfc3339();
        let updated = db
            .update_posture_check(&check.id, "acknowledged", Some(&ack_time), Some(15))
            .expect("update check");
        assert!(updated);

        let history = db.get_posture_checks(10, 0).expect("get checks");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].id, check.id);
        assert_eq!(history[0].response, "acknowledged");
        assert_eq!(history[0].xp_earned, 15);
        assert_eq!(history[0].acknowledged_at.as_deref(), Some(ack_time.as_str()));
    }

    #[test]
    fn test_get_posture_history_pagination() {
        let db = init_test_database();
        for i in 1..=15 {
            let _ = db.log_posture_check(NewPostureCheck {
                id: Some(format!("check-{}", i)),
                fired_at: Some(format!("2026-09-28T01:{:02}:00Z", i)),
                intensity_level: 1,
                message_shown: None,
                is_test: false,
            });
        }

        let first_page = db.get_posture_checks(10, 0).expect("first page");
        assert_eq!(first_page.len(), 10);
        assert_eq!(first_page[0].id, "check-15");

        let second_page = db.get_posture_checks(10, 10).expect("second page");
        assert_eq!(second_page.len(), 5);
        assert_eq!(second_page[0].id, "check-5");
    }

    #[test]
    fn test_user_progress_initial_and_update() {
        let db = init_test_database();
        let progress = db.get_user_progress().expect("get progress");
        assert_eq!(progress.total_xp, 0);
        assert_eq!(progress.current_level, 1);
        assert_eq!(progress.current_streak, 0);
        assert_eq!(progress.total_checks, 0);
        assert!(!progress.streak_freeze_available);
    }

    #[test]
    fn test_user_progress_persistence_and_level_5_streak_freeze() {
        let db = init_test_database();
        let initial = db.get_user_progress().expect("initial progress");
        assert_eq!(initial.total_xp, 0);

        // Update progress to 1000 XP (Level 5: Tree Frog)
        let updated = db
            .update_user_progress(&UserProgress {
                total_xp: 1000,
                current_level: 5,
                ..initial
            })
            .expect("update progress");

        assert_eq!(updated.total_xp, 1000);
        assert_eq!(updated.current_level, 5);
        assert!(updated.streak_freeze_available);

        // Verify persistence by querying again from SQLite
        let queried = db.get_user_progress().expect("queried progress");
        assert_eq!(queried.total_xp, 1000);
        assert_eq!(queried.current_level, 5);
        assert!(queried.streak_freeze_available);
    }

    fn log_check(db: &Database, id: &str, is_test: bool) -> PostureCheck {
        db.log_posture_check(NewPostureCheck {
            id: Some(id.to_string()),
            fired_at: None,
            intensity_level: 2,
            message_shown: Some("Test reminder".to_string()),
            is_test,
        })
        .expect("log check")
    }

    fn set_last_check_date(db: &Database, date: String) {
        db.patch_user_progress(&ProgressPatch {
            last_check_date: Some(date),
            current_streak: Some(3),
            ..Default::default()
        })
        .expect("patch");
    }

    #[test]
    fn test_process_acknowledgment_does_not_unlock_achievements() {
        let db = init_test_database();
        let check = log_check(&db, "check-uuid-1", false);

        let (progress, counted) = db
            .process_check_acknowledgment(Some(&check.id), 15)
            .expect("process ack");

        assert!(counted);
        assert_eq!(progress.total_xp, 15);
        assert_eq!(progress.total_checks, 1);
        assert_eq!(progress.current_streak, 1);

        // Detection belongs to the shared TS engine, which grants XP on unlock.
        let achievements = db.get_achievements().expect("get achievements");
        assert!(achievements.iter().all(|a| !a.is_unlocked));
    }

    #[test]
    fn test_acknowledging_test_check_awards_nothing() {
        let db = init_test_database();
        let real = log_check(&db, "real-1", false);
        let test = log_check(&db, "test-1", true);

        let (after_test, counted) = db
            .process_check_acknowledgment(Some(&test.id), 10)
            .expect("ack test");
        assert!(!counted);
        assert_eq!(after_test.total_xp, 0);
        assert_eq!(after_test.total_checks, 0);
        assert_eq!(after_test.current_streak, 0);

        // Test checks are invisible to today's stats
        let stats = db.get_today_stats().expect("stats");
        assert_eq!(stats.total_checks_today, 1);
        assert_eq!(stats.acknowledged_today, 0);

        let (after_real, counted) = db
            .process_check_acknowledgment(Some(&real.id), 10)
            .expect("ack real");
        assert!(counted);
        assert_eq!(after_real.total_xp, 10);
        let stats = db.get_today_stats().expect("stats");
        assert_eq!(stats.acknowledged_today, 1);
    }

    #[test]
    fn test_unlock_achievement_grants_xp_once_atomically() {
        let db = init_test_database();

        let first = db.unlock_achievement("first_ribbit").expect("unlock");
        assert!(first.newly_unlocked);
        assert_eq!(first.xp_reward, 25);
        assert_eq!(first.progress.total_xp, 25);
        assert!(first.unlocked_at.is_some());

        let second = db.unlock_achievement("first_ribbit").expect("unlock again");
        assert!(!second.newly_unlocked);
        assert_eq!(second.progress.total_xp, 25);
        assert_eq!(second.unlocked_at, first.unlocked_at);

        assert_eq!(db.get_user_progress().unwrap().total_xp, 25);
        let achievements = db.get_achievements().expect("get achievements");
        let first_ribbit = achievements
            .iter()
            .find(|a| a.id == "first_ribbit")
            .expect("find first_ribbit");
        assert!(first_ribbit.is_unlocked);
        assert_eq!(first_ribbit.unlocked_at, first.unlocked_at);
    }

    #[test]
    fn test_unlock_achievement_does_not_clobber_concurrent_xp() {
        let db = init_test_database();
        let check = log_check(&db, "c1", false);
        // Rust ack lands first (+10), then the achievement grant (+75)
        db.process_check_acknowledgment(Some(&check.id), 10).unwrap();
        let r = db.unlock_achievement("centurion").unwrap();
        assert_eq!(r.progress.total_xp, 85);
        // And add_xp stacks on top rather than overwriting
        let p = db.add_xp(5).unwrap();
        assert_eq!(p.total_xp, 90);
    }

    #[test]
    fn test_unlock_unknown_achievement_errors() {
        let db = init_test_database();
        assert!(db.unlock_achievement("not_a_real_badge").is_err());
        assert_eq!(db.get_user_progress().unwrap().total_xp, 0);
    }

    #[test]
    fn test_add_xp_recomputes_level() {
        let db = init_test_database();
        let p = db.add_xp(1000).unwrap();
        assert_eq!(p.total_xp, 1000);
        assert_eq!(p.current_level, calculate_level_from_xp(1000));
    }

    #[test]
    fn test_patch_progress_only_touches_streak_fields() {
        let db = init_test_database();
        db.add_xp(300).unwrap();
        let p = db
            .patch_user_progress(&ProgressPatch {
                current_streak: Some(4),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(p.total_xp, 300);
        assert_eq!(p.current_streak, 4);
        assert_eq!(p.longest_streak, 4);
    }

    #[test]
    fn test_streak_freeze_is_once_per_week() {
        let db = init_test_database();
        db.add_xp(1000).unwrap(); // Level 5
        assert!(db.get_user_progress().unwrap().streak_freeze_available);

        // Exactly one missed day: freeze protects the streak
        let dby = (Local::now() - Duration::days(2)).format("%Y-%m-%d").to_string();
        set_last_check_date(&db, dby.clone());
        let c1 = log_check(&db, "f1", false);
        let (p, _) = db.process_check_acknowledgment(Some(&c1.id), 10).unwrap();
        assert_eq!(p.current_streak, 4);
        assert!(!p.streak_freeze_available);
        assert_eq!(p.last_freeze_week, Some(current_week_key()));

        // More acknowledgments the same week must NOT re-grant the freeze
        let c2 = log_check(&db, "f2", false);
        let (p, _) = db.process_check_acknowledgment(Some(&c2.id), 10).unwrap();
        assert!(!p.streak_freeze_available);
        assert!(!db.get_user_progress().unwrap().streak_freeze_available);

        // A second missed day in the same week resets the streak
        set_last_check_date(&db, dby);
        let c3 = log_check(&db, "f3", false);
        let (p, _) = db.process_check_acknowledgment(Some(&c3.id), 10).unwrap();
        assert_eq!(p.current_streak, 1);
    }

    #[test]
    fn test_freeze_does_not_bridge_multi_day_gaps() {
        let db = init_test_database();
        db.add_xp(1000).unwrap();
        let old = (Local::now() - Duration::days(4)).format("%Y-%m-%d").to_string();
        set_last_check_date(&db, old);
        let c = log_check(&db, "g1", false);
        let (p, _) = db.process_check_acknowledgment(Some(&c.id), 10).unwrap();
        assert_eq!(p.current_streak, 1);
        assert!(p.streak_freeze_available, "freeze not spent on an unbridgeable gap");
    }

    #[test]
    fn test_iso_week_key_matches_ts_format() {
        let d = chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(); // Thursday -> 2026-W01
        assert_eq!(iso_week_key(d), "2026-W01");
        let d = chrono::NaiveDate::from_ymd_opt(2027, 1, 1).unwrap(); // Friday -> 2026-W53
        assert_eq!(iso_week_key(d), "2026-W53");
    }

    #[test]
    fn test_migration_007_grants_legacy_achievement_xp() {
        let conn = Connection::open_in_memory().unwrap();
        // Simulate a pre-007 database (only 001 + 002 applied)
        conn.execute_batch(
            "CREATE TABLE _migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL,
                                       applied_at TEXT NOT NULL DEFAULT (datetime('now')));",
        )
        .unwrap();
        conn.execute_batch(include_str!("../migrations/001_initial_schema.sql")).unwrap();
        conn.execute_batch(include_str!("../migrations/002_seed_achievements.sql")).unwrap();
        for (v, d) in [(1, "a"), (2, "b")] {
            conn.execute(
                "INSERT INTO _migrations (version, description) VALUES (?1, ?2)",
                params![v, d],
            )
            .unwrap();
        }
        // Old Rust detector: unlocked without paying XP (25 + 75 = 100)
        conn.execute_batch(
            "INSERT OR REPLACE INTO user_progress (id, total_xp, current_level) VALUES (1, 950, 4);
             INSERT INTO user_achievements (achievement_id, unlocked_at) VALUES
               ('first_ribbit', '2026-01-01T00:00:00Z'), ('centurion', '2026-01-02T00:00:00Z');",
        )
        .unwrap();

        apply_migrations(&conn).expect("migrate");
        let db = Database::new(conn);
        let p = db.get_user_progress().unwrap();
        assert_eq!(p.total_xp, 1050);
        assert_eq!(p.current_level, calculate_level_from_xp(1050));

        // Already-rewarded unlocks are not paid again
        let again = db.unlock_achievement("first_ribbit").unwrap();
        assert!(!again.newly_unlocked);
        assert_eq!(again.progress.total_xp, 1050);

        // Catalog text refreshed to the canonical (TS) version
        let ach = db.get_achievements().unwrap();
        let eb = ach.iter().find(|a| a.id == "early_bird").unwrap();
        assert_eq!(eb.description, "Acknowledge a reminder between 4 AM and 7 AM");
    }

    #[test]
    fn test_achievements_all_ten_seeded() {
        let db = init_test_database();
        let achievements = db.get_achievements().expect("get achievements");
        assert_eq!(achievements.len(), 10);

        for ach in &achievements {
            assert!(!ach.is_unlocked);
            assert!(ach.unlocked_at.is_none());
        }

        let ids: Vec<&str> = achievements.iter().map(|a| a.id.as_str()).collect();
        assert!(ids.contains(&"first_ribbit"));
        assert!(ids.contains(&"week_warrior"));
        assert!(ids.contains(&"month_master"));
        assert!(ids.contains(&"early_bird"));
        assert!(ids.contains(&"night_owl"));
        assert!(ids.contains(&"perfect_day"));
        assert!(ids.contains(&"phone_friend"));
        assert!(ids.contains(&"customizer"));
        assert!(ids.contains(&"centurion"));
        assert!(ids.contains(&"frog_whisperer"));
    }

    #[test]
    fn test_app_state_persistence() {
        let db = init_test_database();
        let initial = db.get_app_state().expect("initial app state");
        assert!(!initial.is_paused);
        assert!(!initial.is_dnd);
        assert!(initial.dnd_until.is_none());

        let modified = PersistedAppState {
            id: 1,
            is_paused: true,
            is_dnd: true,
            dnd_until: Some("2026-09-28T02:00:00Z".to_string()),
            theme_mode: "dark".to_string(),
            launch_on_startup: true,
        };
        db.save_app_state(&modified).expect("save app state");

        let fetched = db.get_app_state().expect("fetch saved app state");
        assert!(fetched.is_paused);
        assert!(fetched.is_dnd);
        assert_eq!(fetched.dnd_until.as_deref(), Some("2026-09-28T02:00:00Z"));
        assert_eq!(fetched.theme_mode, "dark");
        assert!(fetched.launch_on_startup);
    }

    #[test]
    fn test_today_stats_calculation() {
        let db = init_test_database();
        let now_utc = Utc::now().to_rfc3339();

        let check1 = db
            .log_posture_check(NewPostureCheck {
                id: Some("c1".to_string()),
                fired_at: Some(now_utc.clone()),
                intensity_level: 1,
                message_shown: None,
                is_test: false,
            })
            .expect("log c1");

        let _check2 = db
            .log_posture_check(NewPostureCheck {
                id: Some("c2".to_string()),
                fired_at: Some(now_utc.clone()),
                intensity_level: 2,
                message_shown: None,
                is_test: false,
            })
            .expect("log c2");

        let _ = db.update_posture_check(&check1.id, "acknowledged", Some(&now_utc), Some(20));

        let stats = db.get_today_stats().expect("get today stats");
        assert_eq!(stats.total_checks_today, 2);
        assert_eq!(stats.acknowledged_today, 1);
        assert_eq!(stats.xp_earned_today, 20);
        assert!((stats.acknowledgment_rate - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_concurrent_multi_connection_wal_access() {
        let dir = std::env::temp_dir().join(format!("posture_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).expect("create temp dir");
        let db_file = dir.join("posturecheck.db");

        // Primary connection initializes database and applies WAL mode & migrations
        let conn1 = Connection::open(&db_file).expect("open conn1");
        conn1.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;",
        ).expect("set pragmas on conn1");
        apply_migrations(&conn1).expect("apply migrations conn1");
        let db1 = Database::new(conn1);

        // Secondary connection simulates concurrent client (e.g. Tauri SQL plugin or worker thread)
        let conn2 = Connection::open(&db_file).expect("open conn2");
        conn2.execute_batch(
            "PRAGMA busy_timeout = 5000;",
        ).expect("set pragmas on conn2");
        let db2 = Database::new(conn2);

        // Conn 1 logs a posture check
        let check = db1.log_posture_check(NewPostureCheck {
            id: Some("wal-test-check".to_string()),
            fired_at: Some(Utc::now().to_rfc3339()),
            intensity_level: 2,
            message_shown: Some("Test WAL concurrency".to_string()),
            is_test: false,
        }).expect("db1 write");

        // Conn 2 immediately reads the check without blocking or locks
        let checks_from_conn2 = db2.get_posture_checks(10, 0).expect("db2 read");
        assert_eq!(checks_from_conn2.len(), 1);
        assert_eq!(checks_from_conn2[0].id, check.id);

        // Conn 2 updates settings
        let _ = db2.save_settings(SaveSettingsInput {
            interval_minutes: Some(45),
            ..Default::default()
        }).expect("db2 write settings");

        // Conn 1 reads updated settings
        let settings_from_conn1 = db1.get_settings().expect("db1 read settings");
        assert_eq!(settings_from_conn1.interval_minutes, 45);

        // Clean up temp dir
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_profile_management_operations() {
        let db = init_test_database();
        let profiles = db.get_profiles().expect("get profiles");
        // Should have Default, Work, Gaming
        assert_eq!(profiles.len(), 3);
        assert_eq!(profiles[0].profile_name, "Default");
        assert!(profiles[0].is_active_profile);

        // Switch to Work profile
        let work_id = profiles.iter().find(|p| p.profile_name == "Work").unwrap().id.clone();
        let switched = db.switch_profile(&work_id).expect("switch to work");
        assert_eq!(switched.profile_name, "Work");
        assert!(switched.is_active_profile);

        let active = db.get_settings().expect("get active settings");
        assert_eq!(active.profile_name, "Work");
        assert_eq!(active.interval_minutes, 45);

        // Create a new Chill profile
        let created = db.create_profile(SaveSettingsInput {
            profile_name: Some("Chill".to_string()),
            interval_minutes: Some(60),
            intensity_level: Some(1),
            ..Default::default()
        }).expect("create chill profile");
        assert_eq!(created.profile_name, "Chill");

        let all_after_create = db.get_profiles().expect("profiles after create");
        assert_eq!(all_after_create.len(), 4);

        // Delete Chill profile
        let deleted = db.delete_profile(&created.id).expect("delete chill");
        assert!(deleted);
        let all_after_delete = db.get_profiles().expect("profiles after delete");
        assert_eq!(all_after_delete.len(), 3);
    }

    #[test]
    fn test_export_and_clear_history() {
        let db = init_test_database();
        let _ = db.log_posture_check(NewPostureCheck {
            id: Some("chk-1".to_string()),
            fired_at: None,
            intensity_level: 2,
            message_shown: Some("Test message".to_string()),
            is_test: false,
        }).expect("log check");

        let json = db.export_posture_data().expect("export data");
        assert!(json.contains("Posture Check! Desktop"));
        assert!(json.contains("chk-1"));

        let cleared = db.clear_posture_history().expect("clear history");
        assert_eq!(cleared, 1);
        let checks_after = db.get_posture_checks(10, 0).expect("checks after clear");
        assert_eq!(checks_after.len(), 0);
    }
}
