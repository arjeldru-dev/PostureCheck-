-- 004_seed_quick_profiles.sql: Seed standard Quick Profiles (Work & Gaming)

INSERT OR IGNORE INTO posture_settings (
    id, profile_name, interval_minutes, intensity_level,
    active_hours_start, active_hours_end, active_days,
    routing_mode, auto_escalation, dnd_enabled, is_active_profile
) VALUES (
    '00000000-0000-0000-0000-000000000002', 'Work', 45, 2,
    '09:00', '18:00', '1,2,3,4,5',
    'pc_only', 0, 0, 0
);

INSERT OR IGNORE INTO posture_settings (
    id, profile_name, interval_minutes, intensity_level,
    active_hours_start, active_hours_end, active_days,
    routing_mode, auto_escalation, dnd_enabled, is_active_profile
) VALUES (
    '00000000-0000-0000-0000-000000000003', 'Gaming', 30, 3,
    '18:00', '23:00', '1,2,3,4,5,6,7',
    'phone_only', 0, 0, 0
);
