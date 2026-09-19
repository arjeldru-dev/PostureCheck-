# 5.5 Local Timer & Notifications

## Context

<context>
This step implements standalone posture reminders on the phone — the mobile app can run independently without a PC. On iOS, this uses pre-scheduled local notifications (up to 64 pending). On Android, it uses a background service with local notifications. The mobile timer respects the same settings (interval, active hours, intensity) as the desktop. This implements the "works standalone" requirement from Feature 3.6 (Companion Mobile App).
</context>

## Prerequisites

<prerequisites>
- Steps 5.1–5.4 complete (all mobile screens and settings functional)
- Settings store with interval, active hours, intensity level
- Message rotation engine available from shared package
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Implement local notification scheduling on iOS**
   - Use `expo-notifications` to schedule local notifications:
     - Schedule a batch of upcoming notifications based on interval and active hours
     - iOS allows up to 64 pending local notifications
     - Re-schedule the batch when the app comes to foreground
     - Each notification includes: Ribbit message, "Sitting up!" and "Snooze" actions

2. **Implement background timer on Android**
   - Use `expo-task-manager` + `expo-notifications` for background execution:
     - Register a background task that fires at the interval
     - Task checks active hours and DND, then sends a local notification
     - Guide user to whitelist the app from battery optimization if needed

3. **Create the notification handler**
   - `apps/mobile/lib/notification-handler.ts`:
     - `scheduleNextReminder()` — schedules the next notification based on settings
     - `handleNotificationResponse(response)` — processes acknowledge/snooze actions
     - `rescheduleBatch()` — re-schedules all pending notifications (called on settings change)
     - `cancelAllReminders()` — cancels all pending notifications (for pause/DND)

4. **Create rich notification content**
   - Notification content per intensity level:
     - Level 1: title only, no sound
     - Level 2: title + body (Ribbit message), default sound
     - Level 3: title + body, custom sound, actionable buttons
     - Level 4–5: same as L3 on mobile (can't do overlay on phone)
   - Action buttons: "✓ Sitting up!" and "💤 Snooze 5 min"
   - Notification icon: Ribbit frog

5. **Register the Expo Push Token**
   - `apps/mobile/lib/push-token.ts`:
     - Request push notification permissions on first launch
     - Get the Expo Push Token
     - Store the token in Supabase `devices` table (for PC-to-phone routing in Phase 6)
     - Re-register token on app update

6. **Integrate with gamification**
   - When user acknowledges a mobile notification:
     - Grant XP (same as desktop)
     - Update streak tracking
     - Check for achievements
     - Log posture check to local SQLite
     - Sync to Supabase if online
</instructions>

<requirements>
### Functional Requirements
- Phone sends posture reminders at the configured interval without PC
- Notifications include Ribbit messages and action buttons
- Acknowledging a phone notification grants XP and updates streak
- Settings changes (interval, active hours) update the notification schedule
- Pausing/DND cancels all pending notifications

### Technical Requirements
- `expo-notifications` for local and push notifications
- `expo-task-manager` for Android background execution
- iOS: batch-schedule up to 64 notifications, re-schedule on foreground
- Push token stored in Supabase for Phase 6 routing
- Notification sound files bundled as app assets

### File Naming Conventions
- Lib files: kebab-case (`notification-handler.ts`, `push-token.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/lib/notification-handler.ts` — Local notification scheduling
2. `apps/mobile/lib/push-token.ts` — Push token registration
3. `apps/mobile/lib/background-task.ts` — Android background timer
4. `apps/mobile/hooks/useNotifications.ts` — Notification event handling hook
5. `apps/mobile/app.config.ts` — MODIFIED: add notification plugins
</output_files>

## Verification

<verification>
- [ ] Setting interval to 1 min → phone notification fires after ~60 seconds
- [ ] Notification shows Ribbit message with "Sitting up!" and "Snooze" actions
- [ ] Tapping "Sitting up!" grants XP and logs the check
- [ ] App in background → notifications still fire (Android)
- [ ] App killed → pre-scheduled notifications still fire (iOS)
- [ ] Push token is stored in Supabase devices table
- [ ] Pausing reminders cancels all pending notifications
</verification>

---

**Previous**: [5.4 — Mobile Settings](./04_mobile_settings.md) | **Next**: [5.6 — Device Pairing Flow](./06_device_pairing_flow.md)
