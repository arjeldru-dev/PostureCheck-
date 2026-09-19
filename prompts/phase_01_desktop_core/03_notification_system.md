# 1.3 Notification System

## Context

<context>
This step implements the desktop notification system for intensity levels 1–3 (Whisper, Nudge, Reminder). These use native OS notifications, which are non-intrusive and consistent with platform UX. Levels 4–5 (Alert, Wake Up!) require custom overlay windows and are implemented in Phase 2. When the timer fires, this system generates and displays the appropriate notification with a Ribbit message. This implements Feature 3.3 (Notification Intensity System) partially — the first three levels.
</context>

## Prerequisites

<prerequisites>
- Step 1.2 (Timer Engine) is complete — timer fires `posture-reminder` events
- Tauri notification plugin configured and permitted
- Ribbit SVG assets available (from Step 0.6)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the notification manager in Rust**
   - Create `src-tauri/src/notifications.rs`
   - Implement notification sending using Tauri's notification plugin
   - Support three notification levels:

   | Level | Name | Visual | Audio | Behavior |
   |-------|------|--------|-------|----------|
   | 1 | Whisper | Subtle tray tooltip, small notification | None (silent) | Auto-dismisses in 10 seconds |
   | 2 | Nudge | Standard toast notification | System default sound (short) | Auto-dismisses in 30 seconds |
   | 3 | Reminder | Standard notification banner | Gentle chime | Stays until acknowledged |

   - Each notification includes:
     - Title: "Posture Check! 🐸"
     - Body: A randomized Ribbit message (from the shared messages package)
     - Icon: Ribbit mascot (reminding state)
     - Actions: "✓ Sitting up!" (acknowledge), "💤 Snooze" (snooze 5 min)

2. **Implement notification action handling**
   - When user clicks "✓ Sitting up!" → call `acknowledge_reminder()` from the timer
   - When user clicks "💤 Snooze" → call `snooze_reminder(5)` from the timer
   - When notification auto-dismisses → log as 'dismissed' in the posture check history
   - When notification expires (2× interval without interaction) → log as 'expired'

3. **Create the notification bridge to the frontend**
   - When a notification fires, also emit a `notification-shown` event to the React frontend
   - This allows the dashboard UI to update (e.g., show "Reminder sent!" indicator)
   - When a notification is acknowledged, emit `notification-acknowledged` with XP earned

4. **Integrate with the timer engine**
   - Modify `timer.rs` to call the notification manager when the timer fires
   - Pass the current intensity level and a random Ribbit message
   - The notification manager handles the level-specific behavior (auto-dismiss timing, sound, etc.)

5. **Handle notification edge cases**
   - If a new reminder fires while a previous notification is still showing: replace the old one (don't stack)
   - On Windows: use Windows Toast Notifications via Tauri plugin
   - On macOS: use UserNotifications framework via Tauri plugin
   - On Linux: use libnotify via Tauri plugin
   - If notifications are disabled at the OS level: show a warning in the dashboard

6. **Create the Tauri commands for notification control**
   - `set_intensity_level(level: u8)` — set the notification intensity (1–5, validated to 1–3 for now)
   - `get_notification_history(limit: u32)` → returns recent notifications with their statuses
   - `test_notification(level: u8)` — sends a test notification at the specified level
</instructions>

<requirements>
### Functional Requirements
- Level 1 (Whisper): silent tooltip notification that auto-dismisses in 10 seconds
- Level 2 (Nudge): standard toast with a soft sound, auto-dismisses in 30 seconds
- Level 3 (Reminder): persistent notification with a chime, stays until acknowledged
- Notification body contains a randomized Ribbit message (never repeats back-to-back)
- "Sitting up!" action acknowledges the reminder and resets the timer
- "Snooze" action delays the next reminder by 5 minutes
- Notifications don't stack — new ones replace old ones

### Technical Requirements
- Tauri 2.0 notification plugin API
- Platform-native notifications (Windows Toast, macOS UserNotifications, Linux libnotify)
- Notification actions (buttons) work on supported platforms
- Sound plays through the default system audio device
- Notification icon shows the Ribbit reminding face

### File Naming Conventions
- Rust modules: snake_case (`notifications.rs`)
- Sound files: kebab-case (`notification-chime.wav`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/src/notifications.rs` — Notification manager (Rust)
2. `apps/desktop/src-tauri/src/main.rs` — MODIFIED: register notification module
3. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add notification commands
4. `apps/desktop/src-tauri/src/timer.rs` — MODIFIED: integrate notification manager
5. `apps/desktop/src/hooks/useNotifications.ts` — React hook for notification events
</output_files>

## Verification

<verification>
After completing this step, confirm:

- [ ] `test_notification(1)` shows a subtle tooltip that auto-dismisses in ~10 seconds (silent)
- [ ] `test_notification(2)` shows a toast notification with a sound that auto-dismisses in ~30 seconds
- [ ] `test_notification(3)` shows a persistent notification with a chime that stays until clicked
- [ ] Clicking "✓ Sitting up!" on a notification acknowledges it and resets the timer
- [ ] Clicking "💤 Snooze" delays the next reminder by 5 minutes
- [ ] Timer fires → notification appears with a Ribbit message
- [ ] Two consecutive notifications have different Ribbit messages (no back-to-back repeats)
- [ ] A new notification replaces (not stacks on top of) an existing one
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| No notification appears | OS-level notifications disabled for the app | Check Windows Settings → Notifications or macOS System Preferences → Notifications |
| Notification actions (buttons) don't appear | Platform doesn't support notification actions | Windows Toast supports actions; macOS requires UNNotificationAction; Linux support varies |
| Sound doesn't play | Audio device not set or sound file not found | Use system default notification sound for L2; embed a chime WAV for L3 |
| Notifications stack instead of replacing | Not using the same notification ID | Use a consistent notification tag/ID so new ones replace old ones |
| Notification fires during DND | Timer isn't checking DND state before firing | Ensure `timer.rs` checks DND status before calling the notification manager |

---

**Previous**: [1.2 — Timer Engine](./02_timer_engine.md) | **Next**: [1.4 — SQLite Local Storage](./04_sqlite_local_storage.md)
