# 1.2 Timer Engine

## Context

<context>
This step implements the core timer engine in Rust — the heart of Posture Check!. The timer fires posture reminders at user-configured intervals, respects active hours and DND mode, and handles system sleep/wake events. The timer runs entirely in the Rust backend (not in JavaScript) for reliability — it survives frontend crashes and doesn't drift. This implements Feature 3.2 (Timer-Based Posture Reminders) from the project spec.
</context>

## Prerequisites

<prerequisites>
- Step 1.1 (System Tray App) is complete
- Tray state management is functional (active, paused, DND)
- Rust async runtime (Tokio) available via Tauri
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the timer engine module in Rust**
   - Create `src-tauri/src/timer.rs`
   - Implement a `PostureTimer` struct with:
     - `interval_minutes: u32` — reminder interval (5–120, default: 30)
     - `next_fire_at: DateTime<Local>` — when the next reminder fires
     - `is_running: bool` — whether the timer is active
     - `active_hours_start: NaiveTime` — e.g., 08:00
     - `active_hours_end: NaiveTime` — e.g., 22:00
     - `active_days: Vec<Weekday>` — which days the timer fires (default: Mon–Sun)

2. **Implement the timer loop**
   - Use `tokio::spawn` to run the timer in a background async task
   - Timer loop:
     1. Calculate `next_fire_at` based on current time + interval
     2. Sleep until `next_fire_at` (using `tokio::time::sleep_until`)
     3. Check if still within active hours and active days — if not, sleep until the next active period
     4. Check if paused or DND — if so, skip and recalculate
     5. If all checks pass, emit a `posture-reminder` event to the frontend
     6. Start the next cycle
   - Timer resets after each notification acknowledgment (or auto-dismiss)

3. **Handle system sleep/wake**
   - Listen for system power events (suspend/resume)
   - On suspend: pause the timer, record the timestamp
   - On resume: recalculate `next_fire_at` from the resume time (don't fire immediately on wake)
   - Use Tauri's window events or OS-specific APIs for sleep detection

4. **Handle active hours logic**
   - If current time is outside active hours, calculate the next active period start and sleep until then
   - If the timer would fire at 22:05 but active hours end at 22:00, skip and schedule for the next day's start time
   - Active days: only fire on configured days (bitmask: Mon=1, Tue=2, ..., Sun=7)

5. **Implement auto-escalation logic**
   - If a reminder is not acknowledged within 2× the interval, escalate notification intensity by one level
   - Track `last_acknowledged_at` timestamp
   - Escalation is configurable (on/off toggle, implemented in settings)
   - Cap escalation at the user's maximum configured level (don't force Level 5 without consent)

6. **Create Tauri commands for timer control**
   - `set_timer_interval(minutes: u32)` — change interval, recalculate next fire
   - `get_timer_state()` → `{ intervalMinutes, nextFireAt, isRunning, secondsRemaining }`
   - `acknowledge_reminder()` — mark current reminder as acknowledged, reset timer, return XP earned (placeholder)
   - `snooze_reminder(minutes: u32)` — delay the next reminder by X minutes
   - `set_active_hours(start: String, end: String)` — set active hours
   - `set_active_days(days: Vec<u8>)` — set active days

7. **Create the frontend timer hook**
   - `apps/desktop/src/hooks/useTimer.ts`
   - Subscribes to `posture-reminder` events from Rust
   - Provides reactive state: `nextFireAt`, `secondsRemaining`, `isRunning`
   - Provides actions: `acknowledge()`, `snooze(minutes)`, `setInterval(minutes)`
   - `secondsRemaining` updates every second via a React interval (display only)
</instructions>

<requirements>
### Functional Requirements
- Timer fires posture reminders at the configured interval (default: 30 minutes)
- Minimum interval: 5 minutes. Maximum interval: 2 hours
- Timer only fires during configured active hours (default: 08:00–22:00)
- Timer only fires on configured active days (default: every day)
- Timer pauses when DND is active or reminders are paused
- Timer pauses on system sleep and resumes on wake (doesn't fire immediately on wake)
- Acknowledging a reminder resets the timer for the next interval
- Snoozing delays the next reminder by the chosen duration (5, 10, 15, 30 min)
- Auto-escalation bumps intensity if unacknowledged for 2× the interval (configurable)

### Technical Requirements
- Timer runs in Rust (Tokio async runtime), not JavaScript
- Timer state is thread-safe (use `Arc<Mutex<>>` or Tauri's managed state)
- Timer events emitted via Tauri's event system to the React frontend
- Sub-second timer accuracy is not required (±1 second is acceptable)
- Timer state survives frontend hot-reloads during development

### File Naming Conventions
- Rust modules: snake_case (`timer.rs`)
- React hooks: camelCase with `use` prefix (`useTimer.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/src/timer.rs` — Rust timer engine
2. `apps/desktop/src-tauri/src/main.rs` — MODIFIED: register timer module
3. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add timer commands
4. `apps/desktop/src/hooks/useTimer.ts` — React timer hook
5. `apps/desktop/src/stores/timerStore.ts` — Zustand store for timer display state
</output_files>

## Verification

<verification>
After completing this step, confirm:

- [ ] Setting interval to 1 minute (for testing): a `posture-reminder` event fires after 60 seconds
- [ ] Acknowledging the reminder resets the timer for another interval
- [ ] Snoozing by 5 minutes delays the next reminder by 5 minutes
- [ ] Pausing reminders (from tray) stops the timer; resuming restarts it
- [ ] Activating DND stops the timer; deactivating restarts it
- [ ] Setting active hours to a past window (e.g., 01:00–02:00) prevents firing during current time
- [ ] `get_timer_state()` returns accurate `secondsRemaining` that counts down
- [ ] PC sleep → wake: timer resumes without firing immediately
- [ ] Changing the interval mid-cycle recalculates the next fire time
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Timer doesn't fire | Timer task panicked or wasn't spawned | Check Rust logs for panics; ensure `tokio::spawn` is called in the setup |
| Timer fires immediately on app start | `next_fire_at` calculated as a past time | Set `next_fire_at` to `now() + interval` on startup |
| Timer drifts over time | Using `sleep(duration)` instead of `sleep_until(instant)` | Use absolute time targets, not relative durations |
| Sleep/wake detection not working | OS events not captured | On Windows, listen for `WM_POWERBROADCAST`; on macOS, use `NSWorkspace` notifications |
| Frontend doesn't receive events | Event name mismatch | Verify the Rust `emit` event name matches the `listen` name in the frontend hook |

---

**Previous**: [1.1 — System Tray App](./01_system_tray_app.md) | **Next**: [1.3 — Notification System](./03_notification_system.md)
