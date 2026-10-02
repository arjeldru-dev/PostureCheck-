-- 005_add_level5_opt_in.sql: Add explicit opt-in preference for Level 5 nuclear fullscreen overlay
ALTER TABLE posture_settings ADD COLUMN level5_opt_in INTEGER NOT NULL DEFAULT 0;
