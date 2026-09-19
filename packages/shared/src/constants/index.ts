import type { Achievement, IntensityConfig, IntensityLevel, LevelProgression } from '../types/index.js';

/**
 * Gamification & XP Rules
 */
export const XP_PER_ACKNOWLEDGE = 10;
export const XP_DAILY_COMPLETION_BONUS = 50;
export const XP_STREAK_BASE_MULTIPLIER = 5;
export const XP_STREAK_BONUS_CAP = 100;

/**
 * Level Progression Ladder
 */
export const LEVEL_THRESHOLDS: readonly LevelProgression[] = [
  { level: 1, xpRequired: 0, title: 'Tadpole' },
  { level: 2, xpRequired: 100, title: 'Froglet' },
  { level: 3, xpRequired: 300, title: 'Hopper' },
  { level: 4, xpRequired: 600, title: 'Leaper' },
  { level: 5, xpRequired: 1000, title: 'Tree Frog' },
  { level: 10, xpRequired: 5000, title: 'Poison Dart' },
  { level: 15, xpRequired: 12000, title: 'Bull Frog' },
  { level: 20, xpRequired: 25000, title: 'Frog Prince/Princess' },
  { level: 25, xpRequired: 50000, title: 'Zen Master' },
] as const;

/**
 * Streak Rules
 */
export const STREAK_ACKNOWLEDGMENT_THRESHOLD = 0.8; // 80% acknowledgment rate required
export const STREAK_FREEZE_UNLOCK_LEVEL = 5;
export const GOLDEN_FROG_STREAK_DAYS = 30;

/**
 * Reminder Interval Constraints (in minutes)
 */
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 120;
export const DEFAULT_INTERVAL_MINUTES = 30;

/**
 * Default Schedule Configuration
 */
export const DEFAULT_ACTIVE_HOURS_START = '08:00';
export const DEFAULT_ACTIVE_HOURS_END = '22:00';
export const DEFAULT_ACTIVE_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

/**
 * Notification Intensity Level Definitions
 */
export const INTENSITY_CONFIGS: Record<IntensityLevel, IntensityConfig> = {
  1: {
    level: 1,
    name: 'Whisper',
    visual: 'Subtle tray tooltip, frog winks',
    audio: 'None',
    behavior: 'Auto-dismisses in 10s',
    autoDismissSeconds: 10,
  },
  2: {
    level: 2,
    name: 'Nudge',
    visual: 'Small toast notification, frog waves',
    audio: 'Soft chirp',
    behavior: 'Auto-dismisses in 30s',
    autoDismissSeconds: 30,
  },
  3: {
    level: 3,
    name: 'Reminder',
    visual: 'Standard notification banner, frog taps screen',
    audio: 'Gentle chime',
    behavior: 'Stays until acknowledged',
  },
  4: {
    level: 4,
    name: 'Alert',
    visual: 'Large overlay notification, frog jumps',
    audio: 'Alarm sound',
    behavior: 'Stays + repeats sound every 30s',
    repeatsSoundSeconds: 30,
  },
  5: {
    level: 5,
    name: 'Wake Up!',
    visual: 'Full-screen overlay, frog panics',
    audio: 'Loud alarm',
    behavior: 'Blocks interaction until acknowledged',
    requiresConfirmation: true,
  },
};

/**
 * Built-in Achievement Catalog
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first_ribbit',
    name: 'First Ribbit',
    description: 'Acknowledge your first reminder',
    icon: '🐸',
    xp_reward: 25,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    xp_reward: 50,
    condition_type: 'streak',
    condition_value: 7,
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    xp_reward: 100,
    condition_type: 'streak',
    condition_value: 30,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Acknowledge a reminder before 7 AM',
    icon: '🌅',
    xp_reward: 25,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Acknowledge a reminder after 11 PM',
    icon: '🦉',
    xp_reward: 25,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: '100% acknowledgment rate in a single day',
    icon: '⭐',
    xp_reward: 50,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'phone_friend',
    name: 'Phone Friend',
    description: 'Set up PC-to-phone routing',
    icon: '📱',
    xp_reward: 25,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'customizer',
    name: 'Customizer',
    description: 'Change notification intensity settings',
    icon: '🎨',
    xp_reward: 10,
    condition_type: 'action',
    condition_value: 1,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Acknowledge 100 reminders total',
    icon: '💯',
    xp_reward: 75,
    condition_type: 'total_checks',
    condition_value: 100,
  },
  {
    id: 'frog_whisperer',
    name: 'Frog Whisperer',
    description: 'Reach Level 10 (Poison Dart)',
    icon: '🏆',
    xp_reward: 100,
    condition_type: 'level',
    condition_value: 10,
  },
] as const;

/**
 * Color Palette Tokens
 */
export const COLOR_TOKENS = {
  frogGreenPrimary: '#4CAF50',
  frogGreenSecondary: '#66BB6A',
  lilyPad: '#81C784',
  pondDark: '#1A2332',
  pondLight: '#F5F7FA',
  goldenXp: '#FFD54F',
  coralAlert: '#FF7043',
  skyBlue: '#42A5F5',
} as const;
