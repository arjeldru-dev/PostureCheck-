/**
 * Platform & Device Types
 */
export type DeviceType = 'desktop' | 'mobile';

export type Platform = 'windows' | 'macos' | 'linux' | 'ios' | 'android';

export interface Device {
  id: string;
  user_id: string | null;
  device_type: DeviceType;
  device_name: string;
  platform: Platform;
  push_token: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

/**
 * User & Profile Types
 */
export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Settings & Notification Configuration
 */
export type RoutingMode = 'pc_only' | 'phone_only' | 'both';

export type IntensityLevel = 1 | 2 | 3 | 4 | 5;

export interface IntensityConfig {
  level: IntensityLevel;
  name: string;
  visual: string;
  audio: string;
  behavior: string;
  autoDismissSeconds?: number;
  repeatsSoundSeconds?: number;
  requiresConfirmation?: boolean;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.

export interface PostureSettings {
  id: string;
  user_id: string | null;
  device_id: string;
  profile_name: string;
  interval_minutes: number; // 5 to 120, default: 30
  intensity_level: IntensityLevel; // 1 to 5, default: 2
  active_hours_start: string; // 'HH:MM' (24h format), default: '08:00'
  active_hours_end: string; // 'HH:MM' (24h format), default: '22:00'
  active_days: number[]; // [1,2,3,4,5] = Mon-Fri
  routing_mode: RoutingMode;
  auto_escalation: boolean;
  dnd_enabled: boolean;
  is_active_profile: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Posture Check Event
 */
export type CheckResponse = 'acknowledged' | 'snoozed' | 'dismissed' | 'expired';

export interface PostureCheck {
  id: string;
  user_id: string | null;
  device_id: string;
  fired_at: string;
  acknowledged_at: string | null;
  response: CheckResponse;
  intensity_level: IntensityLevel;
  xp_earned: number;
}

/**
 * Gamification: Progress, Level, Streak & Achievements
 */
export interface UserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number; // consecutive days
  longest_streak: number;
  total_checks: number;
  streak_freeze_available: boolean; // unlocked at level 5
  updated_at: string;
}

export interface LevelProgression {
  level: number;
  xpRequired: number;
  title: string;
}

export interface LevelCalculationResult {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
}

export type AchievementConditionType = 'streak' | 'total_checks' | 'level' | 'action';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type: AchievementConditionType;
  condition_value: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

/**
 * Mascot & Messages
 */
export type MascotState =
  'idle' | 'reminding' | 'encouraging' | 'celebrating' | 'concerned' | 'sleeping' | 'disappointed';

export type MascotTone = 'encouraging' | 'sassy' | 'minimal';

export interface MascotMessage {
  id: string;
  text: string;
  state: MascotState;
  intensityLevel?: IntensityLevel;
  tone?: MascotTone;
  isGoldenFrog?: boolean;
}

/**
 * Design Tokens
 */
export interface ColorToken {
  name: string;
  hex: string;
  description: string;
}
