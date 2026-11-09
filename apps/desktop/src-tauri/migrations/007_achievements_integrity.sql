-- 007_achievements_integrity.sql
--   * posture_checks.is_test      — test notifications never earn XP / stats / achievements
--   * user_progress.last_freeze_week — persisted weekly streak-freeze usage (ISO week key)
--   * user_achievements.xp_granted — whether the unlock's XP reward has been paid
--   * canonical achievement catalog (must match ACHIEVEMENTS in packages/shared/src/constants)
--   * one-time grant of XP for unlocks recorded before rewards were paid
-- The Rust runner executes this inside a transaction and recomputes current_level afterwards.

ALTER TABLE posture_checks ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN last_freeze_week TEXT;
ALTER TABLE user_achievements ADD COLUMN xp_granted INTEGER NOT NULL DEFAULT 0;

-- CATALOG-BEGIN (parsed by apps/desktop/src/lib/__tests__/achievementCatalog.test.ts)
INSERT INTO achievements (id, name, description, icon, xp_reward, condition_type, condition_value) VALUES
('first_ribbit', 'First Ribbit', 'Acknowledge your first reminder', '🐸', 25, 'action', 1),
('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 50, 'streak', 7),
('month_master', 'Month Master', 'Maintain a 30-day streak', '👑', 100, 'streak', 30),
('early_bird', 'Early Bird', 'Acknowledge a reminder between 4 AM and 7 AM', '🌅', 25, 'action', 1),
('night_owl', 'Night Owl', 'Acknowledge a reminder after 11 PM', '🦉', 25, 'action', 1),
('perfect_day', 'Perfect Day', '100% acknowledgment rate in a single day', '⭐', 50, 'action', 1),
('phone_friend', 'Phone Friend', 'Set up PC-to-phone routing', '📱', 25, 'action', 1),
('customizer', 'Customizer', 'Change notification intensity settings', '🎨', 10, 'action', 1),
('centurion', 'Centurion', 'Acknowledge 100 reminders total', '💯', 75, 'total_checks', 100),
('frog_whisperer', 'Frog Whisperer', 'Reach Level 10 (Poison Dart)', '🏆', 100, 'level', 10)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    xp_reward = excluded.xp_reward,
    condition_type = excluded.condition_type,
    condition_value = excluded.condition_value;
-- CATALOG-END

-- Pay out rewards for achievements unlocked by the pre-0.2 Rust detector (which never granted XP)
INSERT OR IGNORE INTO user_progress (id, total_xp, current_level, current_streak, longest_streak, total_checks, streak_freeze_available, updated_at)
SELECT 1, 0, 1, 0, 0, 0, 0, datetime('now')
WHERE EXISTS (SELECT 1 FROM user_achievements WHERE xp_granted = 0);

UPDATE user_progress
SET total_xp = total_xp + COALESCE((
        SELECT SUM(a.xp_reward)
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.xp_granted = 0
    ), 0),
    updated_at = datetime('now')
WHERE id = 1;

UPDATE user_achievements SET xp_granted = 1 WHERE xp_granted = 0;
