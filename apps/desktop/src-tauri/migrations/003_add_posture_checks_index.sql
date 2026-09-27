-- 003_add_posture_checks_index.sql: Index on posture_checks for fast history and stats queries

CREATE INDEX IF NOT EXISTS idx_posture_checks_fired_at ON posture_checks(fired_at DESC);
