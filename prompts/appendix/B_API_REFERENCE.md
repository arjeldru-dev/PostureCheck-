# Appendix B: API Reference

## Tauri Commands (Desktop — Rust → Frontend)

### System Tray
| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_tray_state` | — | `{ isActive, isDnd, nextReminderAt }` | Current tray state |
| `toggle_pause` | — | `{ isActive }` | Toggle pause/resume |
| `set_dnd` | `{ durationMinutes? }` | `{ isDnd, dndUntil }` | Enable DND |
| `cancel_dnd` | — | `{ isDnd }` | Cancel DND |

### Timer
| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `set_timer_interval` | `{ minutes }` | `{ nextFireAt }` | Change interval |
| `get_timer_state` | — | `{ intervalMinutes, nextFireAt, isRunning, secondsRemaining }` | Current timer |
| `acknowledge_reminder` | — | `{ xpEarned, newTotalXp }` | Acknowledge reminder |
| `snooze_reminder` | `{ minutes }` | `{ nextFireAt }` | Snooze reminder |
| `set_active_hours` | `{ start, end }` | — | Set active hours |
| `set_active_days` | `{ days }` | — | Set active days |

### Notifications
| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `set_intensity_level` | `{ level }` | — | Set intensity (1–5) |
| `test_notification` | `{ level }` | — | Send test notification |
| `close_overlay` | — | — | Close L4/L5 overlay |

### Database
| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_settings` | — | `PostureSettings` | Get active settings |
| `save_settings` | `PostureSettings` | — | Save settings |
| `get_posture_history` | `{ limit, offset }` | `PostureCheck[]` | Paginated history |
| `get_progress` | — | `UserProgress` | XP, level, streak |
| `get_achievements` | — | `Achievement[]` | All achievements with unlock status |
| `get_today_stats` | — | `{ checks, acknowledged, xp }` | Today's summary |

## Tauri Events (Rust → Frontend)

| Event | Payload | Description |
|-------|---------|-------------|
| `posture-reminder` | `{ message, level, checkId }` | Timer fired |
| `notification-shown` | `{ checkId, level }` | Notification displayed |
| `notification-acknowledged` | `{ checkId, xpEarned }` | User acknowledged |
| `level-up` | `{ oldLevel, newLevel, title }` | Level threshold crossed |
| `achievement-unlocked` | `{ achievementId, name, xpReward }` | Achievement earned |
| `xp-gained` | `{ amount, source }` | XP added |
| `streak-milestone` | `{ days }` | Streak milestone hit |
| `sync-started` | — | Cloud sync began |
| `sync-completed` | `{ recordsSynced }` | Cloud sync finished |
| `sync-error` | `{ error }` | Cloud sync failed |

## Supabase Edge Functions

### POST `/functions/v1/push-notification-relay`

**Auth**: Bearer JWT required

**Request Body:**
```json
{
  "userId": "uuid",
  "title": "Posture Check! 🐸",
  "message": "Hey! Time for a posture check!",
  "intensityLevel": 2,
  "data": {
    "checkId": "uuid",
    "xpReward": 10
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "expoReceiptId": "receipt-id"
}
```

**Errors:**
- `401`: Invalid or missing JWT
- `404`: No mobile device registered for user
- `429`: Rate limit exceeded (100/day)
- `500`: Expo Push API error

## Supabase Realtime Channels

| Channel | Filter | Events | Description |
|---------|--------|--------|-------------|
| `posture_settings:{userId}` | `user_id=eq.{userId}` | UPDATE | Settings changed on another device |
| `devices:{userId}` | `user_id=eq.{userId}` | INSERT, UPDATE, DELETE | Device list changed |

## Expo Push Notification Categories

### Category: `posture-check`

| Action | ID | Title | Destructive |
|--------|-----|-------|-------------|
| Acknowledge | `acknowledge` | ✓ Sitting up! | No |
| Snooze | `snooze` | 💤 Snooze 5 min | No |
