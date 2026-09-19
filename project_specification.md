# Project Specification: Posture Check!

## 1. Executive Summary

- **Product:** Posture Check! — A cross-platform background utility that reminds users to maintain good posture through customizable, personality-driven notifications with a friendly frog mascot coach
- **Problem:** People who sit at PCs for extended hours (gamers, office workers, students, creators) consistently forget to maintain good posture, leading to back pain, neck strain, and long-term spinal issues. Current solutions are either too clinical (medical apps), too simple (dumb timers), or require expensive hardware (posture wearables).
- **Solution:** A system tray desktop app paired with a companion mobile app that delivers posture reminders with adjustable intensity — from silent pop-ups to aggressive alarms. A playful frog mascot ("Ribbit") coaches users with encouraging messages, and a gamification layer (streaks, XP, levels, achievements) turns posture improvement into an engaging daily habit. Users can route notifications to their phone when screen-sharing or gaming, so reminders stay private.
- **Platform:** Desktop (Windows/macOS/Linux) + Mobile (iOS/Android)
- **Target Launch:** Flexible timeline (side project / portfolio piece)
- **Scope:** MVP → V1.1 roadmap

---

## 2. User Personas & Workflows

### **Persona 1: The Gamer — "Alex"**
- **Role:** Plays PC games for 4–8 hour sessions, often screen-sharing on Discord
- **Primary goal:** Get posture reminders without disrupting screen share or game overlay
- **Key workflow:**
  1. Opens Posture Check! on PC → it minimizes to system tray
  2. Sets reminder interval to 30 min
  3. Enables "Send to Phone" mode before starting a gaming session
  4. Receives a gentle vibration + frog notification on phone every 30 min
  5. Quick-taps "✓ Sitting up!" to log the check and earn XP
  6. After the session, checks posture score and streak on the mobile app
- **Frequency:** Daily, during gaming sessions
- **Pain points:** PC notifications cover game UI, screen-share shows embarrassing reminders to friends

### **Persona 2: The Office Worker — "Maria"**
- **Role:** Works 8+ hours at a desk, uses PC notifications
- **Primary goal:** Regular posture checks during work hours without disruption in meetings
- **Key workflow:**
  1. Sets up a work schedule (Mon–Fri, 9 AM – 6 PM)
  2. Configures "Silent" notification during meeting hours, "Medium" otherwise
  3. Gets a subtle system tray bubble with the frog saying "Hey! Quick stretch? 🐸"
  4. Acknowledges or snoozes the reminder
  5. Checks weekly posture score and unlocked achievements
- **Frequency:** Daily, during work hours
- **Pain points:** Forgets to stretch during deep work, wants non-intrusive reminders

### **Persona 3: The Student — "Jake"**
- **Role:** Studies for long hours, alternates between PC and phone
- **Primary goal:** Build a consistent posture habit with motivation
- **Key workflow:**
  1. Sets up Posture Check! on both PC and phone
  2. Signs in to sync settings and progress
  3. Uses the phone app independently when studying on mobile
  4. Gets excited about leveling up and maintaining streaks
  5. Shares achievements with friends
- **Frequency:** Daily
- **Pain points:** Needs extrinsic motivation (gamification) to build habits

---

## 3. Feature Specification

### MVP Features (Must Ship)

---

#### **3.1 System Tray Background App (Desktop)**
- **Description:** Runs silently in the system tray. Right-click tray icon to access settings, pause/resume, or quit. The tray icon features the frog mascot.
- **User story:** "As a PC user, I want the app to run quietly in the background so it doesn't interfere with my work or games."
- **Inputs:** None (automatic after launch)
- **Outputs:** System tray icon with context menu, tooltip showing next reminder time
- **Business rules:**
  - App starts minimized to tray (option to launch on system startup)
  - Tray icon changes state: 🐸 active, 😴 paused/DND, ⏰ reminder imminent
  - Left-click opens the dashboard window; right-click opens quick menu
- **Edge cases:**
  - Multiple monitors — notification appears on the primary display
  - System tray overflow — icon should remain visible (pinned)
  - App crash recovery — auto-restart with last settings preserved
- **Dependencies:** None

---

#### **3.2 Timer-Based Posture Reminders**
- **Description:** Configurable interval timer that fires posture check notifications at regular intervals.
- **User story:** "As a user, I want to set how often I get reminded so the app fits my routine."
- **Inputs:**
  - Reminder interval (5 min – 2 hours, default: 30 min)
  - Active hours schedule (start time, end time, active days)
  - Notification intensity level (1–5 scale)
- **Outputs:** Notification with mascot message at each interval
- **Business rules:**
  - Timer resets after each notification acknowledgment or auto-dismiss
  - Timer pauses during DND mode and resumes when DND ends
  - If user doesn't acknowledge within 2× the interval, escalate intensity by one level (configurable)
  - Minimum interval: 5 minutes. Maximum interval: 2 hours.
  - Timer only fires during configured active hours
- **Edge cases:**
  - PC goes to sleep/hibernate → timer pauses, resumes on wake
  - User sets interval shorter than notification display time → queue, don't stack
  - System clock change → recalculate next fire time
- **Dependencies:** System Tray App

---

#### **3.3 Notification Intensity System**
- **Description:** Five-level notification intensity from silent to aggressive, fully user-controllable.
- **User story:** "As a user, I want to control how aggressively the app reminds me so it matches my context."
- **Inputs:** Intensity level selection (per-device: PC vs Phone)
- **Outputs:** Notification styled to the selected intensity
- **Intensity levels:**

| Level | Name | Visual | Audio | Behavior |
|---|---|---|---|---|
| 1 | Whisper | Subtle tray tooltip, frog winks | None | Auto-dismisses in 10s |
| 2 | Nudge | Small toast notification, frog waves | Soft chirp | Auto-dismisses in 30s |
| 3 | Reminder | Standard notification banner, frog taps screen | Gentle chime | Stays until acknowledged |
| 4 | Alert | Large overlay notification, frog jumps | Alarm sound | Stays + repeats sound every 30s |
| 5 | Wake Up! | Full-screen overlay, frog panics | Loud alarm | Blocks interaction until acknowledged |

- **Business rules:**
  - User can set different intensity per device (PC = Level 2, Phone = Level 4)
  - Level 5 requires explicit opt-in with a confirmation dialog ("Are you sure? This will block your screen.")
  - Auto-escalation (optional): if unacknowledged for 2× interval, bump up one level
- **Edge cases:**
  - Level 5 during a fullscreen game — show as an overlay, not a separate window
  - Level 5 during a presentation — DND mode should be suggested during setup
  - Audio plays through default system audio device
- **Dependencies:** Timer System

---

#### **3.4 Frog Mascot Coach — "Ribbit"**
- **Description:** A friendly animated frog character that delivers all notifications with personality. Ribbit has multiple expressions and poses, and rotates through encouraging, playful messages.
- **User story:** "As a user, I want the reminders to feel personal and fun, not clinical or annoying."
- **Mascot states:**

| State | Expression | Context |
|---|---|---|
| Idle | Sitting on lily pad, blinking | Dashboard home screen |
| Reminding | Standing up, tapping | Notification time |
| Encouraging | Thumbs up, big smile | User acknowledges reminder |
| Celebrating | Jumping with confetti | Streak milestone, level up, achievement |
| Concerned | Tilted head, worried eyes | Long time without acknowledgment |
| Sleeping | Eyes closed, Zzz | DND / paused mode |
| Disappointed | Slightly sad | Broken streak |

- **Message rotation:** Ribbit delivers randomized messages per notification:
  - "Psst! How's your back doing? 🐸"
  - "Ribbit! Time to sit up straight!"
  - "Quick posture check! You got this 💪"
  - "Hey friend, your spine says thank you!"
  - "Stretch break? Even frogs need to hop around! 🐸"
  - *(50+ messages total, categorized by intensity level)*
- **Business rules:**
  - Messages never repeat back-to-back
  - Higher intensity levels use more urgent language
  - Mascot state reflects the user's current streak/progress on the dashboard
- **Edge cases:**
  - If user has > 30-day streak, unlock special "golden frog" messages
- **Dependencies:** Notification System

---

#### **3.5 PC-to-Phone Notification Routing**
- **Description:** Users can opt to receive posture reminders on their phone instead of (or in addition to) their PC. Essential for gaming, screen-sharing, and presentation scenarios.
- **User story:** "As a gamer screen-sharing with friends, I want reminders on my phone so they don't show on my shared screen."
- **Inputs:**
  - Toggle: "Send to Phone" (on/off)
  - Mode: "Phone Only", "Phone + PC", or "PC Only"
  - Device pairing via QR code or account sync
- **Outputs:** Push notification on paired phone with Ribbit's message
- **Business rules:**
  - Requires either: (a) signed-in account on both devices, or (b) local network pairing via QR code
  - If phone is unreachable (offline, DND), fallback to PC notification
  - Notification routing preference is saved per-profile/schedule
  - Latency target: notification arrives on phone within 3 seconds of timer fire
- **Edge cases:**
  - Phone has Posture Check! notifications disabled at OS level → show warning on PC dashboard
  - Both devices offline → queue notification, deliver when reconnected
  - User has multiple phones paired → send to the most recently active one
- **Dependencies:** Companion Mobile App, Account System (or local pairing)

---

#### **3.6 Companion Mobile App**
- **Description:** A lightweight mobile app that receives routed notifications from the PC app, displays the dashboard with gamification progress, and can also run independent phone-based posture reminders.
- **User story:** "As a user, I want to track my posture progress and receive reminders on my phone."
- **Key screens:**
  1. **Home/Dashboard** — Ribbit mascot, today's posture score, current streak, next reminder countdown
  2. **Stats** — Weekly/monthly posture charts, total XP, level progress
  3. **Achievements** — Badge collection, locked/unlocked states
  4. **Settings** — Notification preferences, interval config, account, device pairing
  5. **Notification Incoming** — Rich notification with Ribbit + acknowledge/snooze actions
- **Business rules:**
  - Works standalone (phone-only posture reminders) even without PC pairing
  - Syncs progress with PC app when account is connected
  - Supports both iOS and Android push notifications
  - Background execution for local timer-based reminders on phone
- **Edge cases:**
  - iOS background execution limits → use local notifications scheduled in advance
  - Android battery optimization killing the app → guide user to whitelist in settings
  - Offline mode → all features work locally, sync when online
- **Dependencies:** Push notification infrastructure

---

#### **3.7 Gamification Engine**
- **Description:** XP, levels, streaks, achievements, and a posture score that tracks and rewards consistent posture habits.
- **User story:** "As a user, I want to feel rewarded for maintaining good posture so I stay motivated."

**XP System:**

| Action | XP Reward |
|---|---|
| Acknowledge a posture reminder | +10 XP |
| Complete all reminders in a day | +50 XP bonus |
| Maintain streak (per day) | +5 XP × streak days (cap: +100) |
| Unlock an achievement | +25–100 XP |

**Level Progression:**

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Tadpole |
| 2 | 100 | Froglet |
| 3 | 300 | Hopper |
| 4 | 600 | Leaper |
| 5 | 1,000 | Tree Frog |
| 10 | 5,000 | Poison Dart |
| 15 | 12,000 | Bull Frog |
| 20 | 25,000 | Frog Prince/Princess |
| 25 | 50,000 | Zen Master |

**Streak System:**
- Consecutive days with ≥ 80% reminder acknowledgment rate
- Visual: flame counter (🔥 7-day streak!)
- Streak freeze: 1 free "missed day" pass per week (earned at Level 5)

**Achievements (sample):**

| Badge | Condition | XP |
|---|---|---|
| First Ribbit | Acknowledge your first reminder | 25 |
| Week Warrior | 7-day streak | 50 |
| Month Master | 30-day streak | 100 |
| Early Bird | Acknowledge a reminder before 7 AM | 25 |
| Night Owl | Acknowledge a reminder after 11 PM | 25 |
| Perfect Day | 100% acknowledgment rate in a day | 50 |
| Phone Friend | Set up PC-to-phone routing | 25 |
| Customizer | Change notification intensity | 10 |
| Centurion | Acknowledge 100 reminders total | 75 |
| Frog Whisperer | Reach Level 10 | 100 |

- **Business rules:**
  - XP never decreases (no punishment, only reward)
  - Broken streaks show Ribbit's "disappointed" state but immediately offer encouragement to start again
  - Achievements are one-time unlocks, permanently saved
  - Progress syncs across devices when signed in
- **Edge cases:**
  - Timezone change → streak calculated based on user's local timezone
  - Clock manipulation → server-side validation when signed in, local trust when offline
- **Dependencies:** Timer System, Account System (for sync)

---

#### **3.8 Settings & Customization**
- **Description:** Comprehensive settings panel for all notification, schedule, and personalization preferences.
- **User story:** "As a user, I want full control over when, how, and where I get reminded."
- **Settings categories:**

| Category | Options |
|---|---|
| **Timing** | Reminder interval (5 min – 2 hr), active hours (start/end), active days (checkboxes) |
| **Notifications** | Intensity level (1–5), per-device intensity, auto-escalation toggle |
| **Routing** | Send to: PC Only / Phone Only / Both, paired devices list |
| **Schedule** | Work schedule, custom schedules (e.g., "Gaming" = phone-only, intensity 3) |
| **DND** | Do Not Disturb toggle, auto-DND during fullscreen apps (optional), scheduled DND |
| **Mascot** | Message tone (encouraging / sassy / minimal), notification sound selection |
| **Account** | Sign in/out, sync status, delete account |
| **General** | Launch on startup, theme (light/dark/system), language, data export |

- **Business rules:**
  - All settings have sensible defaults (30-min interval, Level 2 intensity, PC only)
  - Settings persist locally; synced to cloud when signed in
  - "Quick Profiles" — save and switch between setting presets (Work, Gaming, Chill)
- **Edge cases:**
  - Conflicting schedules → last-created schedule takes priority, with warning
- **Dependencies:** None

---

#### **3.9 Optional Account System**
- **Description:** Optional user authentication for cross-device sync, cloud backup, and future social features.
- **User story:** "As a user, I want to sign in to sync my progress between PC and phone without losing data."
- **Auth methods:**
  - Email + Password
  - Google OAuth
  - Apple Sign-In (mobile only)
- **Business rules:**
  - App is fully functional without an account (local-only mode)
  - First sign-in merges local data with cloud (local wins on conflicts)
  - Account deletion removes all cloud data within 30 days (GDPR-ready)
  - No account = device pairing via QR code on local network only
  - With account = automatic device discovery and pairing
- **Edge cases:**
  - User signs out → data stays local, stops syncing
  - User signs in on a third device → all data syncs immediately
  - Conflicting data from two offline devices → most recent timestamp wins, with merge log
- **Dependencies:** Supabase Auth

---

### V1.1 Features (Next Release)

- **Webcam Posture Detection** — Optional real-time slouch detection using MediaPipe/TensorFlow.js pose estimation via the user's webcam. Triggers reminders based on actual posture, not just time. Privacy-first: all processing happens on-device, no video is stored or transmitted.
- **Mascot Evolution** — Ribbit gets visual accessories and cosmetic upgrades as the user levels up (hats, outfits, backgrounds, lily pad themes). Cosmetic shop with XP currency.
- **Posture Analytics Dashboard** — Detailed weekly/monthly reports: average posture score, peak slouch times, improvement trends, heatmaps of when posture is worst.
- **Smart Scheduling** — AI-powered interval adjustment based on user behavior patterns (remind more during historically bad-posture hours).
- **Widget Support** — Desktop widget showing Ribbit + next reminder countdown. iOS/Android home screen widgets.

### Future Considerations

- Social features — friends, posture challenges, leaderboards
- Team/enterprise mode — office-wide posture programs
- Wearable integration — Apple Watch, Fitbit posture data
- Custom mascot skins — community-created frog skins
- Pomodoro integration — combine posture checks with work/break cycles
- Stretch routine library — guided stretch exercises when reminded
- Sound customization — custom notification sounds, voice packs for Ribbit
- Multi-language support (i18n)

### Anti-Features (Explicitly Out of Scope)

| Feature | Reason |
|---|---|
| Medical advice or diagnosis | Liability. App is a reminder tool, not a medical device. |
| Always-on webcam monitoring | Privacy concern. Webcam (V1.1) is opt-in and processes locally only. |
| Social media sharing of posture data | Privacy. Achievements can be shared, but not health data. |
| Punitive mechanics (XP loss, shaming) | Counterproductive. Positive reinforcement only. |
| Third-party ad display | Conflicts with the premium, portfolio-quality goal. |
| Complex exercise routines | Out of scope — this is a reminder app, not a fitness app. |

---

## 4. Technical Architecture

### Stack

| Layer | Technology | Justification |
|---|---|---|
| Desktop App | **Tauri 2.0** (Rust backend + Web frontend) | Native system tray support, 10× smaller than Electron (~5 MB vs ~150 MB), native notifications, auto-updater, impressive for portfolio. Cross-platform (Windows/macOS/Linux). |
| Desktop Frontend | **React 19 + TypeScript + Vite** | Fast iteration, huge ecosystem, TypeScript for type safety. Vite for blazing fast HMR during development. |
| Desktop Styling | **Tailwind CSS 4** | Rapid prototyping, consistent design tokens, dark mode built-in, great for responsive layouts in the settings panel. |
| Mobile App | **React Native + Expo (SDK 57)** | Single codebase for iOS/Android, OTA updates, managed workflow, push notifications via Expo Push. Shares React/TypeScript knowledge with desktop frontend. |
| Mobile Styling | **NativeWind 4** (Tailwind for RN) | Consistent design language between desktop and mobile using the same Tailwind tokens. |
| Backend / BaaS | **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions) | Generous free tier, built-in auth (email, Google, Apple), real-time sync for device pairing, Edge Functions for push notification relay, Row Level Security for data isolation. |
| Push Notifications | **Expo Push + Supabase Edge Functions** | Expo handles iOS APNs + Android FCM. Edge Function triggers push when PC timer fires with "Send to Phone" enabled. |
| Local Storage | **SQLite** (via Tauri SQL plugin / Expo SQLite) | Offline-first data persistence for settings, history, and gamification state on both platforms. |
| State Management | **Zustand** | Lightweight, TypeScript-native, works in both React and React Native. No boilerplate. |
| ORM | **Drizzle ORM** (for Supabase/PostgreSQL) | Type-safe, lightweight, great DX with TypeScript. |
| CI/CD | **GitHub Actions** | Free tier, handles Tauri builds (Windows/macOS/Linux), Expo EAS builds (iOS/Android). |
| Hosting | **Supabase (backend)** + **GitHub Releases (desktop)** + **App Store / Play Store (mobile)** | Cost-effective, production-grade. |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        POSTURE CHECK!                           │
├──────────────────────┬──────────────────────────────────────────┤
│   DESKTOP (Tauri)    │         MOBILE (Expo/RN)                │
│                      │                                          │
│  ┌────────────────┐  │  ┌──────────────────┐                   │
│  │  React Frontend│  │  │  React Native UI │                   │
│  │  (Settings,    │  │  │  (Dashboard,     │                   │
│  │   Dashboard,   │  │  │   Stats,         │                   │
│  │   Ribbit UI)   │  │  │   Achievements,  │                   │
│  └───────┬────────┘  │  │   Ribbit UI)     │                   │
│          │           │  └───────┬──────────┘                   │
│  ┌───────▼────────┐  │          │                               │
│  │  Rust Backend  │  │  ┌───────▼──────────┐                   │
│  │  (Tray, Timer, │  │  │  Local Timer +   │                   │
│  │   Notifications│  │  │  Notifications   │                   │
│  │   SQLite)      │  │  │  (Expo Notifs)   │                   │
│  └───────┬────────┘  │  └───────┬──────────┘                   │
│          │           │          │                               │
├──────────┼───────────┴──────────┼───────────────────────────────┤
│          │    NETWORK LAYER     │                               │
│          └──────────┬───────────┘                               │
│                     ▼                                           │
│  ┌──────────────────────────────────────────┐                  │
│  │           SUPABASE CLOUD                  │                  │
│  │                                           │                  │
│  │  ┌─────────┐  ┌───────────┐  ┌────────┐ │                  │
│  │  │  Auth    │  │  Realtime │  │  Edge  │ │                  │
│  │  │  (OAuth, │  │  (Device  │  │  Funcs │ │                  │
│  │  │   Email) │  │   Sync)   │  │  (Push │ │                  │
│  │  └─────────┘  └───────────┘  │   Relay)│ │                  │
│  │                               └────────┘ │                  │
│  │  ┌──────────────────────────────────────┐│                  │
│  │  │  PostgreSQL                          ││                  │
│  │  │  (Users, Settings, Progress, Devices)││                  │
│  │  └──────────────────────────────────────┘│                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for PC-to-Phone notification:**
1. Tauri Rust backend timer fires
2. Rust checks routing preference → "Send to Phone"
3. Rust calls Supabase Edge Function with user ID + notification payload
4. Edge Function looks up user's Expo push token from the database
5. Edge Function sends push via Expo Push API
6. Phone receives rich notification with Ribbit message + acknowledge/snooze actions

### Data Model (Key Entities)

#### **User**

| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto-generated |
| email | VARCHAR(255) | Unique, nullable (local-only users) |
| display_name | VARCHAR(100) | Nullable |
| avatar_url | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Default: now() |
| updated_at | TIMESTAMPTZ | Auto-update trigger |

#### **Device**

| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User, nullable (unpaired devices) |
| device_type | ENUM | 'desktop', 'mobile' |
| device_name | VARCHAR(100) | e.g., "Alex's PC", "Alex's iPhone" |
| platform | VARCHAR(50) | 'windows', 'macos', 'linux', 'ios', 'android' |
| push_token | TEXT | Expo push token (mobile only) |
| is_active | BOOLEAN | Default: true |
| last_seen_at | TIMESTAMPTZ | Updated on heartbeat |
| created_at | TIMESTAMPTZ | Default: now() |

#### **PostureSettings**

| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User (nullable for local) |
| device_id | UUID | FK → Device |
| profile_name | VARCHAR(50) | e.g., "Work", "Gaming", "Default" |
| interval_minutes | INT | 5–120, default: 30 |
| intensity_level | INT | 1–5, default: 2 |
| active_hours_start | TIME | Default: 08:00 |
| active_hours_end | TIME | Default: 22:00 |
| active_days | INT[] | Bitmask or array [1,2,3,4,5] = Mon–Fri |
| routing_mode | ENUM | 'pc_only', 'phone_only', 'both' |
| auto_escalation | BOOLEAN | Default: false |
| dnd_enabled | BOOLEAN | Default: false |
| is_active_profile | BOOLEAN | Default: true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### **PostureCheck** (individual reminder events)

| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User (nullable) |
| device_id | UUID | FK → Device |
| fired_at | TIMESTAMPTZ | When the reminder was sent |
| acknowledged_at | TIMESTAMPTZ | Nullable (not yet acknowledged) |
| response | ENUM | 'acknowledged', 'snoozed', 'dismissed', 'expired' |
| intensity_level | INT | The level used for this notification |
| xp_earned | INT | XP granted for this check |

#### **UserProgress**

| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User, unique |
| total_xp | INT | Default: 0 |
| current_level | INT | Default: 1 |
| current_streak | INT | Days, default: 0 |
| longest_streak | INT | Default: 0 |
| total_checks | INT | Default: 0 |
| streak_freeze_available | BOOLEAN | Earned at Level 5 |
| updated_at | TIMESTAMPTZ | |

#### **Achievement**

| Field | Type | Constraints |
|---|---|---|
| id | VARCHAR(50) | PK, e.g., 'first_ribbit' |
| name | VARCHAR(100) | Display name |
| description | TEXT | How to earn it |
| icon | VARCHAR(50) | Emoji or icon reference |
| xp_reward | INT | XP granted on unlock |
| condition_type | VARCHAR(50) | 'streak', 'total_checks', 'level', 'action' |
| condition_value | INT | Threshold value |

#### **UserAchievement**

| Field | Type | Constraints |
|---|---|---|
| user_id | UUID | FK → User |
| achievement_id | VARCHAR(50) | FK → Achievement |
| unlocked_at | TIMESTAMPTZ | |
| PK | | (user_id, achievement_id) |

**Indexes:**
- `posture_checks`: (user_id, fired_at DESC) — for history queries
- `posture_checks`: (user_id, fired_at) WHERE acknowledged_at IS NOT NULL — for streak calculation
- `devices`: (user_id, is_active) — for device lookup
- `posture_settings`: (user_id, is_active_profile) — for active profile lookup

### API Design Philosophy

- **Supabase Client SDK** — Direct database access with Row Level Security (RLS) policies, no custom REST API needed for CRUD operations
- **Supabase Edge Functions** — For server-side logic that can't run on client:
  - `push-notification-relay` — receives notification payload, looks up push token, sends via Expo Push API
  - `calculate-daily-stats` — cron-triggered daily aggregation
- **Supabase Realtime** — For live device sync (settings changes propagate instantly to paired devices)
- **Error format:** Supabase standard `{ error: { message, code, details } }`
- **Offline-first:** SQLite stores everything locally; Supabase syncs when online using last-write-wins with timestamp-based conflict resolution

### Third-Party Integrations

| Service | Purpose | Tier/Cost |
|---|---|---|
| Supabase | Auth, Database, Realtime, Edge Functions | Free (500 MB DB, 50K MAU, 500K Edge invocations) |
| Expo Push | iOS + Android push notifications | Free (unlimited push notifications) |
| Expo EAS Build | Mobile app builds | Free (30 builds/month) |
| GitHub Actions | CI/CD for desktop + mobile | Free (2,000 min/month) |
| Sentry | Error tracking (optional) | Free (5K events/month) |

---

## 5. Design Direction

- **Aesthetic:** Playful, approachable, and polished — think Duolingo's encouragement meets Forest App's calm gamification meets Headspace's clean UI. Not childish — friendly and premium.
- **Reference apps:**
  - **Duolingo** — mascot-driven engagement, streak motivation, playful micro-interactions
  - **Forest** — beautiful gamified focus timer, satisfying progress visualization
  - **Headspace** — clean, calming UI with personality through illustration
- **Color palette:**

| Token | Hex | Usage |
|---|---|---|
| Frog Green (Primary) | `#4CAF50` → `#66BB6A` | Primary actions, mascot accent, level bars |
| Lily Pad (Secondary) | `#81C784` | Backgrounds, secondary surfaces |
| Pond Dark (Background) | `#1A2332` | Dark mode background |
| Pond Light (Background) | `#F5F7FA` | Light mode background |
| Golden XP | `#FFD54F` | XP indicators, streak flames, achievements |
| Coral Alert | `#FF7043` | Urgent notifications (Level 4–5), warnings |
| Sky Blue (Accent) | `#42A5F5` | Info states, links, phone routing indicator |
| Surface Dark | `#243447` | Cards, panels (dark mode) |
| Surface Light | `#FFFFFF` | Cards, panels (light mode) |
| Text Primary | `#E8ECF0` / `#1A2332` | Dark/Light mode text |
| Text Muted | `#8A9BB5` / `#6B7C93` | Secondary text |

- **Typography:**
  - **Display/Headers:** `Outfit` (Google Fonts) — rounded, friendly, modern
  - **Body:** `Inter` (Google Fonts) — highly readable, clean
  - **Monospace (stats/numbers):** `JetBrains Mono` — for XP counters, timers, stats
- **Themes:** Both light and dark mode (system-aware by default)
- **Key screens (Desktop):**
  1. Dashboard (Ribbit + next reminder + streak + quick stats)
  2. Settings Panel (tabbed: Timing, Notifications, Devices, Profile, Account)
  3. Achievements Gallery
  4. Notification Pop-up (all 5 intensity levels)
  5. Onboarding / First Setup
- **Key screens (Mobile):**
  1. Home Dashboard (Ribbit + stats + streak)
  2. Stats / Analytics
  3. Achievements
  4. Settings
  5. Device Pairing (QR scan / account auto-pair)
  6. Notification (rich push with actions)
- **Responsive strategy:** Desktop app has a fixed-size window (800×600 default, resizable). Mobile app follows platform conventions (iOS Safe Area, Android Material).
- **Animations:**
  - Ribbit has idle breathing animation (subtle scale pulse)
  - XP counter animates when XP is earned (count-up effect)
  - Level-up triggers a celebration animation (confetti + Ribbit jump)
  - Streak flame flickers continuously
  - Smooth transitions between settings panels
  - Notification slides in from system tray area

---

## 6. Security & Compliance

- **Security tier:** Production-ready (appropriate for a portfolio project that handles user accounts)
- **Authentication:**
  - Supabase Auth with email/password + Google OAuth + Apple Sign-In
  - JWT access tokens with refresh token rotation
  - Session management: 7-day refresh token expiry, 1-hour access token
- **Authorization:**
  - Row Level Security (RLS) on all Supabase tables
  - Users can only read/write their own data
  - Device ownership validated via user_id foreign key
  - Edge Functions validate JWT before processing push relay requests
- **Data handling:**
  - No webcam data stored or transmitted (V1.1 processes locally)
  - No personally identifiable health data (posture checks are timestamps, not medical data)
  - GDPR-ready: account deletion endpoint removes all user data within 30 days
  - Data export: user can download their data as JSON
  - All communication over HTTPS/WSS
  - Supabase encrypts data at rest (AES-256)
- **Rate limiting:**
  - Edge Function: 100 push notifications per user per day (prevents abuse)
  - Auth: Supabase default rate limiting on auth endpoints
  - API: Supabase default connection pooling
- **Audit logging:**
  - Auth events logged by Supabase (sign-in, sign-out, password change)
  - Device pairing/unpairing events logged
  - Account deletion requests logged with timestamp

---

## 7. Infrastructure & DevOps

- **Environments:**
  - **Development:** Local Supabase (Docker), Tauri dev server, Expo dev client
  - **Staging:** Supabase project (staging), TestFlight / Internal Testing track
  - **Production:** Supabase project (prod), App Store / Play Store, GitHub Releases
- **Deployment strategy:**
  - Desktop: GitHub Actions builds Tauri binaries for Windows/macOS/Linux on tag push → GitHub Releases with auto-updater
  - Mobile: Expo EAS Build → TestFlight (iOS) / Play Console Internal Testing (Android) → Production release
  - Backend: Supabase CLI for database migrations and Edge Function deployment
- **Monitoring:**
  - Sentry for error tracking (desktop + mobile)
  - Supabase Dashboard for database metrics, auth analytics, Edge Function logs
  - Expo Push receipt tracking for notification delivery rates
- **Backup:**
  - Supabase: Daily automatic backups (included in free tier)
  - User data: export-to-JSON feature for user-controlled backups
- **Scaling considerations:**
  - Supabase free tier supports 500 MB database, 50K monthly active users — more than enough for initial launch
  - Push notifications are stateless — scales horizontally via Expo Push API
  - Desktop app is fully local — no server load per-user for core functionality
  - Upgrade path: Supabase Pro ($25/month) for 8 GB DB, 100K MAU when needed

---

## 8. Project Phases & Milestones

| Phase | Focus | Duration | Key Deliverables |
|---|---|---|---|
| 0 | Project setup, tooling, design system | 1–2 weeks | Monorepo structure, Tauri + Expo projects initialized, Supabase project created, CI/CD pipeline, design tokens (colors, typography, spacing), Ribbit mascot assets (SVG/Lottie) |
| 1 | Core desktop app + timer | 2–3 weeks | Tauri system tray app, timer engine in Rust, basic notification system (Level 1–3), SQLite local storage, settings panel (interval, active hours) |
| 2 | Mascot + notification intensity | 1–2 weeks | Ribbit character integration (all states), 5 intensity levels, notification UI for each level, message rotation system |
| 3 | Gamification engine | 2–3 weeks | XP system, level progression, streak tracking, achievements system, dashboard UI with stats, celebration animations |
| 4 | Account system + cloud sync | 2 weeks | Supabase Auth integration, database schema + RLS policies, offline-first sync engine, settings sync across devices |
| 5 | Mobile companion app | 3–4 weeks | Expo app with dashboard, stats, achievements, settings screens, local timer + notifications, push notification receiving, device pairing flow |
| 6 | PC-to-phone routing | 1–2 weeks | Supabase Edge Function for push relay, routing toggle in desktop settings, QR code pairing (no-account mode), fallback logic |
| 7 | Polish, testing, launch prep | 2–3 weeks | Onboarding flow, error handling, loading states, haptic feedback (mobile), end-to-end testing, bug fixes, app store assets, README, portfolio write-up |

**Total estimated:** 14–20 weeks at a relaxed pace (side project / free time)

---

## 9. Open Questions & Risks

### Open Questions
- **Mascot art style** — Will Ribbit be pixel-art (retro/cute), flat vector (modern/clean), or illustrated (detailed/premium)? This impacts asset creation effort significantly.
- **Sound design** — Custom notification sounds for each intensity level? Or use system defaults with custom sounds as a V1.1 feature?
- **Auto-DND detection** — Should the desktop app detect fullscreen applications and automatically switch to phone routing? (Technically possible on Windows via `GetForegroundWindow`, harder on macOS.)
- **Monorepo structure** — Shared TypeScript packages (types, constants, Ribbit messages) between desktop and mobile? Turborepo or Nx?
- **Offline streak calculation** — If a user is offline for 3 days, should the app retroactively calculate streak based on local posture check data when it comes back online?

### Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Tauri 2.0 system tray behavior differs across OSes | Medium | Test early on Windows + macOS. Tauri 2.0 has mature tray support, but edge cases exist on Linux (tray icon rendering in various DEs). |
| iOS background execution limits prevent reliable local timers | Medium | Use iOS Local Notifications scheduled in advance (up to 64 pending). Re-schedule batch on app foreground. |
| Push notification delivery is unreliable | Low | Implement Expo Push receipts checking. Fallback to local notification if push fails. Show delivery status on PC dashboard. |
| Supabase free tier limits hit during growth | Low | Core app works fully offline. Cloud sync is optional. Upgrade path is clear ($25/month Pro tier). |
| Ribbit mascot assets are time-consuming to create | Medium | Start with a minimal set (3–4 poses in SVG). Use Lottie for animations. Expand mascot states incrementally. |
| Scope creep with gamification | Medium | Hard-lock MVP to: XP, levels, streaks, 10 achievements. No cosmetics, no social, no mascot evolution until V1.1. |

---

## 10. Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| **Reminder acknowledgment rate** | > 60% of fired reminders acknowledged | PostureCheck events in local DB / Supabase |
| **Daily active usage** | User opens or interacts with app 5+ days/week | Local session tracking |
| **Streak maintenance** | Average streak > 7 days | UserProgress table |
| **PC-to-phone usage** | > 30% of users enable phone routing | PostureSettings routing_mode stats |
| **Portfolio impressiveness** | Positive feedback from recruiters/peers | Qualitative (GitHub stars, portfolio reactions) |
| **App stability** | < 1% crash rate | Sentry error tracking |
| **Notification delivery** | > 95% push notification delivery rate | Expo Push receipt tracking |
| **Onboarding completion** | > 80% complete first setup | Local/Supabase analytics |

---

## 11. Recommended Skills

Skills are referenced from the external skill library at `d:\skills-ng-mama-mo\skill-md\` and should be loaded by the implementing agent at each phase.

| Phase | Skills | Purpose |
|---|---|---|
| Phase 0: Setup & Design | `brand-guidelines`, `color-expert`, `design-md`, `frontend-design` | Establish the Posture Check! brand identity, frog color palette, design system tokens, and project structure. |
| Phase 1: Desktop Core | `frontend-dev`, `frontend-skill` | Frontend development patterns for the Tauri React web frontend, component architecture. |
| Phase 2: Mascot & Notifications | `gamified-app`, `imagegen`, `sprite-animation` | Gamified UI patterns for mascot-driven interfaces, mascot asset generation, sprite animation for Ribbit states. |
| Phase 3: Gamification | `gamified-app`, `d3-visualization` | XP/level/streak UI components following gamified app patterns, chart visualizations for posture stats. |
| Phase 4: Auth & Sync | `login-flow` | Authentication screen design with proper states (default, loading, error), social SSO button patterns. |
| Phase 5: Mobile App | `mobile-app`, `mobile-onboarding`, `platform-design`, `imagegen-frontend-mobile` | Mobile screen archetypes, onboarding flow design, cross-platform design rules (HIG + Material), mobile UI image generation for design references. |
| Phase 6: Push & Routing | `frontend-dev` | Frontend patterns for the device pairing and notification routing UIs. |
| Phase 7: Polish & Launch | `impeccable-design-polish`, `critique`, `redesign-skill`, `screenshots-marketing` | Final design polish pass, UX critique, visual refinement, app store screenshot generation. |

---

*This specification is designed to be handed directly to an implementation agent. All technical decisions are justified, all features have business rules and edge cases documented, and the phased roadmap allows incremental delivery. Feed this document into the Implementation Guide prompt to begin building Phase 0.*
