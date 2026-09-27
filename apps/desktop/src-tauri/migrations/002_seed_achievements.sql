-- 002_seed_achievements.sql: Seed 10 core achievements

INSERT OR IGNORE INTO achievements (id, name, description, icon, xp_reward, condition_type, condition_value) VALUES
('first_ribbit', 'First Ribbit', 'Acknowledge your first reminder', '🐸', 25, 'action', 1),
('week_warrior', 'Week Warrior', 'Reach a 7-day posture streak', '🔥', 50, 'streak', 7),
('month_master', 'Month Master', 'Reach a 30-day posture streak', '👑', 100, 'streak', 30),
('early_bird', 'Early Bird', 'Acknowledge a reminder before 7 AM', '🌅', 25, 'action', 1),
('night_owl', 'Night Owl', 'Acknowledge a reminder after 11 PM', '🦉', 25, 'action', 1),
('perfect_day', 'Perfect Day', '100% acknowledgment rate in a day', '⭐', 50, 'action', 100),
('phone_friend', 'Phone Friend', 'Set up PC-to-phone routing', '📱', 25, 'action', 1),
('customizer', 'Customizer', 'Change notification intensity', '🎨', 10, 'action', 1),
('centurion', 'Centurion', 'Acknowledge 100 reminders total', '💯', 75, 'total_checks', 100),
('frog_whisperer', 'Frog Whisperer', 'Reach Level 10', '🏆', 100, 'level', 10);
