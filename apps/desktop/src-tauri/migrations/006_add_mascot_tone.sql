-- 006_add_mascot_tone.sql: Add mascot personality tone preference (encouraging, sassy, minimal)
ALTER TABLE posture_settings ADD COLUMN mascot_tone TEXT NOT NULL DEFAULT 'encouraging';
