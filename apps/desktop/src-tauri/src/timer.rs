use std::sync::Arc;
use chrono::{DateTime, Datelike, Duration, Local, NaiveTime, Weekday};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Notify;

use crate::state::AppState;
use crate::tray::update_tray_visuals;

/// Global notifier to instantly wake up the timer loop upon state changes
pub struct TimerNotifier(pub Arc<Notify>);

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimerStatePayload {
    pub interval_minutes: u32,
    pub next_fire_at: Option<String>,
    pub is_running: bool,
    pub seconds_remaining: Option<i64>,
    pub current_escalation_level: u8,
    pub max_escalation_level: u8,
    pub escalation_enabled: bool,
    pub active_hours_start: String,
    pub active_hours_end: String,
    pub active_days: Vec<u8>,
    pub last_acknowledged_at: Option<String>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AcknowledgePayload {
    pub success: bool,
    pub xp_earned: u32,
    pub acknowledged_at: String,
    pub next_reminder_at: Option<String>,
    pub current_escalation_level: u8,
    pub seconds_remaining: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReminderEventPayload {
    pub timestamp: String,
    pub level: u8,
    pub interval_minutes: u32,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct PostureTimer {
    pub interval_minutes: u32,
    pub next_fire_at: Option<DateTime<Local>>,
    pub is_running: bool,
    pub active_hours_start: NaiveTime,
    pub active_hours_end: NaiveTime,
    pub active_days: Vec<Weekday>,
    pub escalation_enabled: bool,
    pub current_escalation_level: u8,
    pub max_escalation_level: u8,
    pub last_acknowledged_at: Option<DateTime<Local>>,
    pub last_fired_at: Option<DateTime<Local>>,
    pub suspended_at: Option<DateTime<Local>>,
    pub remaining_before_suspend: Option<Duration>,
}

impl Default for PostureTimer {
    fn default() -> Self {
        Self::new(30)
    }
}

impl PostureTimer {
    pub fn new(interval_minutes: u32) -> Self {
        let initial_interval = interval_minutes.clamp(1, 120);
        let start_time = NaiveTime::from_hms_opt(8, 0, 0).unwrap_or_default();
        let end_time = NaiveTime::from_hms_opt(22, 0, 0).unwrap_or_default();
        let all_days = vec![
            Weekday::Mon,
            Weekday::Tue,
            Weekday::Wed,
            Weekday::Thu,
            Weekday::Fri,
            Weekday::Sat,
            Weekday::Sun,
        ];

        let mut timer = Self {
            interval_minutes: initial_interval,
            next_fire_at: None,
            is_running: true,
            active_hours_start: start_time,
            active_hours_end: end_time,
            active_days: all_days,
            escalation_enabled: true,
            current_escalation_level: 1,
            max_escalation_level: 3,
            last_acknowledged_at: None,
            last_fired_at: None,
            suspended_at: None,
            remaining_before_suspend: None,
        };

        let now = Local::now();
        timer.next_fire_at = Some(timer.calculate_next_fire_from(now));
        timer
    }

    /// Check if a specific time falls within configured active hours
    pub fn is_time_in_active_hours(&self, time: NaiveTime) -> bool {
        if self.active_hours_start <= self.active_hours_end {
            time >= self.active_hours_start && time < self.active_hours_end
        } else {
            // Overnight window, e.g. 21:00 to 05:00
            time >= self.active_hours_start || time < self.active_hours_end
        }
    }

    /// Check if the timer is currently allowed to fire at the given datetime
    pub fn is_currently_active(&self, dt: DateTime<Local>) -> bool {
        if !self.is_running {
            return false;
        }
        if !self.active_days.contains(&dt.weekday()) {
            return false;
        }
        self.is_time_in_active_hours(dt.time())
    }

    /// Calculate the next valid fire timestamp from a reference datetime
    pub fn calculate_next_fire_from(&self, from: DateTime<Local>) -> DateTime<Local> {
        let interval = Duration::minutes(self.interval_minutes as i64);
        let today = from.date_naive();
        let current_time = from.time();

        // 1. If currently inside active hours on an active day:
        if self.active_days.contains(&from.weekday()) && self.is_time_in_active_hours(current_time) {
            let candidate = from + interval;
            let is_overnight = self.active_hours_start > self.active_hours_end;
            let is_valid_candidate = if is_overnight {
                (candidate.date_naive() == today && self.is_time_in_active_hours(candidate.time()))
                    || (candidate.date_naive() == today + Duration::days(1)
                        && candidate.time() < self.active_hours_end)
            } else {
                candidate.date_naive() == today && self.is_time_in_active_hours(candidate.time())
            };

            if is_valid_candidate {
                return candidate;
            }
        }

        // 2. If today is an active day and `from` is before today's start time:
        if self.active_days.contains(&from.weekday())
            && current_time < self.active_hours_start
            && self.active_hours_start <= self.active_hours_end
        {
            if let Some(target_dt) = today
                .and_time(self.active_hours_start)
                .and_local_timezone(Local)
                .single()
            {
                if target_dt > from {
                    return target_dt;
                }
            }
        }

        // 3. Search forward for the next active day's start time (up to 7 days)
        for offset in 1..=7 {
            let candidate_date = today + Duration::days(offset);
            if self.active_days.contains(&candidate_date.weekday()) {
                if let Some(target_dt) = candidate_date
                    .and_time(self.active_hours_start)
                    .and_local_timezone(Local)
                    .single()
                {
                    return target_dt;
                }
            }
        }

        // Fallback safety
        from + interval
    }

    /// Set reminder interval (1 to 120 minutes) and recalculate next fire
    pub fn set_interval(&mut self, minutes: u32) {
        let clamped = minutes.clamp(1, 120);
        self.interval_minutes = clamped;
        if self.is_running {
            self.next_fire_at = Some(self.calculate_next_fire_from(Local::now()));
        }
    }

    /// Set active hours (start and end as NaiveTime)
    pub fn set_active_hours(&mut self, start: NaiveTime, end: NaiveTime) {
        self.active_hours_start = start;
        self.active_hours_end = end;
        if self.is_running {
            let now = Local::now();
            self.next_fire_at = Some(self.calculate_next_fire_from(now));
        }
    }

    /// Set active days (from ISO numbers 1=Mon..7=Sun)
    pub fn set_active_days(&mut self, days: Vec<u8>) {
        let mut parsed_days = Vec::new();
        for d in days {
            let weekday = match d {
                1 => Weekday::Mon,
                2 => Weekday::Tue,
                3 => Weekday::Wed,
                4 => Weekday::Thu,
                5 => Weekday::Fri,
                6 => Weekday::Sat,
                7 => Weekday::Sun,
                _ => continue,
            };
            if !parsed_days.contains(&weekday) {
                parsed_days.push(weekday);
            }
        }
        if parsed_days.is_empty() {
            // Default to all days if empty set provided
            parsed_days = vec![
                Weekday::Mon,
                Weekday::Tue,
                Weekday::Wed,
                Weekday::Thu,
                Weekday::Fri,
                Weekday::Sat,
                Weekday::Sun,
            ];
        }
        self.active_days = parsed_days;
        if self.is_running {
            let now = Local::now();
            self.next_fire_at = Some(self.calculate_next_fire_from(now));
        }
    }

    /// Snooze the current reminder by X minutes
    pub fn snooze(&mut self, minutes: u32) {
        let snooze_duration = Duration::minutes(minutes.max(1) as i64);
        self.next_fire_at = Some(Local::now() + snooze_duration);
    }

    /// Acknowledge the current reminder
    pub fn acknowledge(&mut self) -> AcknowledgePayload {
        let now = Local::now();
        self.last_acknowledged_at = Some(now);
        self.current_escalation_level = 1;
        self.last_fired_at = None;

        if self.is_running {
            self.next_fire_at = Some(self.calculate_next_fire_from(now));
        }

        AcknowledgePayload {
            success: true,
            xp_earned: 15, // Base 15 XP reward
            acknowledged_at: now.to_rfc3339(),
            next_reminder_at: self.next_fire_at.map(|dt| dt.to_rfc3339()),
            current_escalation_level: self.current_escalation_level,
            seconds_remaining: self.seconds_remaining(),
        }
    }

    /// Trigger reminder fire: evaluate escalation and reschedule next fire
    pub fn trigger_fire(&mut self, now: DateTime<Local>) -> ReminderEventPayload {
        // Auto-escalation: If previous reminder was unacknowledged for >= 2x interval, bump intensity level
        if self.escalation_enabled {
            if let Some(prev_fired) = self.last_fired_at {
                let unacknowledged = match self.last_acknowledged_at {
                    Some(ack) => ack < prev_fired,
                    None => true,
                };
                if unacknowledged {
                    let elapsed = now.signed_duration_since(prev_fired);
                    let threshold = Duration::minutes((self.interval_minutes * 2) as i64);
                    if elapsed >= threshold {
                        self.current_escalation_level =
                            (self.current_escalation_level + 1).min(self.max_escalation_level);
                    }
                }
            }
        }

        self.last_fired_at = Some(now);
        let current_level = self.current_escalation_level;

        // Schedule next fire interval
        self.next_fire_at = Some(self.calculate_next_fire_from(now));

        let message = match current_level {
            1 => "Ribbit whispers: Roll your shoulders back and sit tall! 🐸".to_string(),
            2 => "Ribbit nudges: Time for a posture check! Straighten up and breathe deep.".to_string(),
            3 => "Ribbit reminder: You've been slouching! Unclench your jaw and align your spine.".to_string(),
            _ => "Posture Check! Stand up, stretch, and reset your posture.".to_string(),
        };

        ReminderEventPayload {
            timestamp: now.to_rfc3339(),
            level: current_level,
            interval_minutes: self.interval_minutes,
            message,
        }
    }

    /// Handle system suspend / sleep
    pub fn handle_system_suspend(&mut self) {
        let now = Local::now();
        self.suspended_at = Some(now);
        if let Some(target) = self.next_fire_at {
            let remaining = target.signed_duration_since(now);
            if remaining.num_seconds() > 0 {
                self.remaining_before_suspend = Some(remaining);
            }
        }
    }

    /// Handle system wake / resume (never fire immediately on wake)
    pub fn handle_system_wake(&mut self) {
        let now = Local::now();
        self.suspended_at = None;
        if self.is_running {
            // Ensure at least 1 minute or remaining duration before next reminder fires
            let candidate = if let Some(remaining) = self.remaining_before_suspend.take() {
                let min_grace = Duration::minutes(1);
                let duration_to_use = if remaining < min_grace { min_grace } else { remaining };
                now + duration_to_use
            } else {
                self.calculate_next_fire_from(now)
            };
            self.next_fire_at = Some(candidate);
        }
    }

    /// Seconds remaining until next fire
    pub fn seconds_remaining(&self) -> Option<i64> {
        if !self.is_running {
            return None;
        }
        self.next_fire_at.map(|target| {
            let diff = target.signed_duration_since(Local::now()).num_seconds();
            diff.max(0)
        })
    }

    /// Convert timer state to frontend payload
    pub fn to_payload(&self, status: &str) -> TimerStatePayload {
        let active_days_u8: Vec<u8> = self
            .active_days
            .iter()
            .map(|w| w.number_from_monday() as u8)
            .collect();

        TimerStatePayload {
            interval_minutes: self.interval_minutes,
            next_fire_at: self.next_fire_at.map(|dt| dt.to_rfc3339()),
            is_running: self.is_running,
            seconds_remaining: self.seconds_remaining(),
            current_escalation_level: self.current_escalation_level,
            max_escalation_level: self.max_escalation_level,
            escalation_enabled: self.escalation_enabled,
            active_hours_start: self.active_hours_start.format("%H:%M").to_string(),
            active_hours_end: self.active_hours_end.format("%H:%M").to_string(),
            active_days: active_days_u8,
            last_acknowledged_at: self.last_acknowledged_at.map(|dt| dt.to_rfc3339()),
            status: status.to_string(),
        }
    }
}

/// Spawns the background timer loop
pub fn start_timer_engine(app: AppHandle, notify: Arc<Notify>) {
    // 1. Windows OS power broadcast listener (for suspend / resume detection)
    #[cfg(target_os = "windows")]
    {
        let notify_clone = notify.clone();
        let app_clone = app.clone();
        std::thread::Builder::new()
            .name("windows-power-listener".to_string())
            .spawn(move || {
                run_windows_power_listener(app_clone, notify_clone);
            })
            .ok();
    }

    // 2. Main async timer engine loop
    tauri::async_runtime::spawn(async move {
        let mut last_tick = Local::now();

        loop {
            // Sleep for 1 second or wake immediately when notified of state changes
            tokio::select! {
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {},
                _ = notify.notified() => {},
            }

            let now = Local::now();

            // Detect system sleep/wake clock jump (e.g. lid closed/opened or sleep without notification)
            let elapsed_secs = now.signed_duration_since(last_tick).num_seconds();
            if elapsed_secs > 5 {
                let mut state_opt = None;
                {
                    if let Ok(mut state) = app.state::<std::sync::Mutex<AppState>>().lock() {
                        state.timer.handle_system_wake();
                        state.sync_from_timer();
                        state_opt = Some((state.to_timer_payload(), state.to_tray_payload()));
                    }
                }
                if let Some((tp, trp)) = state_opt {
                    let _ = app.emit("timer-state-changed", &tp);
                    let _ = app.emit("tray-state-changed", &trp);
                    update_tray_visuals(&app);
                }
            }
            last_tick = now;

            // Check timer state and fire if due
            let mut reminder_event = None;
            let mut timer_update = None;
            let mut tray_update = None;

            {
                if let Ok(mut state) = app.state::<std::sync::Mutex<AppState>>().lock() {
                    // Check if DND has expired
                    if state.is_dnd && !state.is_dnd_active() {
                        state.cancel_dnd();
                    }

                    if state.timer.is_running && !state.is_paused && !state.is_dnd_active() {
                        if let Some(target) = state.timer.next_fire_at {
                            if now >= target {
                                if state.timer.is_currently_active(now) {
                                    // Firing reminder!
                                    let event = state.timer.trigger_fire(now);
                                    reminder_event = Some(event);
                                } else {
                                    // Outside active hours/days, reschedule to next active start
                                    state.timer.next_fire_at =
                                        Some(state.timer.calculate_next_fire_from(now));
                                }
                                state.sync_from_timer();
                                timer_update = Some(state.to_timer_payload());
                                tray_update = Some(state.to_tray_payload());
                            }
                        } else {
                            // No next fire time assigned, initialize one
                            state.timer.next_fire_at =
                                Some(state.timer.calculate_next_fire_from(now));
                            state.sync_from_timer();
                            timer_update = Some(state.to_timer_payload());
                            tray_update = Some(state.to_tray_payload());
                        }
                    }
                }
            }

            // Emit reminder event and trigger native OS notification
            if let Some(reminder) = reminder_event {
                let _ = app.emit("posture-reminder", &reminder);
                let _ = crate::notifications::show_posture_notification(
                    &app,
                    reminder.level,
                    Some(reminder.message),
                );
            }

            // Emit state updates and refresh tray visuals
            if let (Some(tp), Some(trp)) = (timer_update, tray_update) {
                let _ = app.emit("timer-state-changed", &tp);
                let _ = app.emit("tray-state-changed", &trp);
                update_tray_visuals(&app);
            }
        }
    });
}

#[cfg(target_os = "windows")]
fn run_windows_power_listener(app: AppHandle, notify: Arc<Notify>) {
    use std::ptr::null_mut;
    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, RegisterClassW, MSG,
        WNDCLASSW,
    };

    const WM_POWERBROADCAST: u32 = 0x0218;
    const PBT_APMSUSPEND: usize = 0x0004;
    const PBT_APMRESUMEAUTOMATIC: usize = 0x0012;
    const PBT_APMRESUMESUSPEND: usize = 0x0007;

    unsafe extern "system" fn wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        DefWindowProcW(hwnd, msg, wparam, lparam)
    }

    unsafe {
        let class_name = [
            'P' as u16, 'o' as u16, 's' as u16, 't' as u16, 'u' as u16, 'r' as u16, 'e' as u16,
            'P' as u16, 'o' as u16, 'w' as u16, 'e' as u16, 'r' as u16, 0,
        ];
        let wnd_class = WNDCLASSW {
            style: 0,
            lpfnWndProc: Some(wnd_proc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: 0 as _,
            hIcon: 0 as _,
            hCursor: 0 as _,
            hbrBackground: 0 as _,
            lpszMenuName: std::ptr::null(),
            lpszClassName: class_name.as_ptr(),
        };

        RegisterClassW(&wnd_class);

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            class_name.as_ptr(),
            0,
            0,
            0,
            0,
            0,
            null_mut(),
            null_mut(),
            0 as _,
            null_mut(),
        );

        if hwnd.is_null() {
            return;
        }

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            if msg.message == WM_POWERBROADCAST {
                let event = msg.wParam;
                if event == PBT_APMSUSPEND {
                    if let Ok(mut state) = app.state::<std::sync::Mutex<AppState>>().lock() {
                        state.timer.handle_system_suspend();
                    }
                    notify.notify_one();
                } else if event == PBT_APMRESUMEAUTOMATIC || event == PBT_APMRESUMESUSPEND {
                    let mut timer_payload = None;
                    let mut tray_payload = None;
                    if let Ok(mut state) = app.state::<std::sync::Mutex<AppState>>().lock() {
                        state.timer.handle_system_wake();
                        state.sync_from_timer();
                        timer_payload = Some(state.to_timer_payload());
                        tray_payload = Some(state.to_tray_payload());
                    }
                    if let (Some(tp), Some(trp)) = (timer_payload, tray_payload) {
                        let _ = app.emit("timer-state-changed", &tp);
                        let _ = app.emit("tray-state-changed", &trp);
                        update_tray_visuals(&app);
                    }
                    notify.notify_one();
                }
            }
            DispatchMessageW(&msg);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, TimeZone};

    #[test]
    fn test_timer_initialization_defaults() {
        let timer = PostureTimer::new(30);
        assert_eq!(timer.interval_minutes, 30);
        assert!(timer.is_running);
        assert!(timer.next_fire_at.is_some());
        assert_eq!(timer.current_escalation_level, 1);
        assert_eq!(timer.active_days.len(), 7);
        assert_eq!(timer.active_hours_start, NaiveTime::from_hms_opt(8, 0, 0).unwrap());
        assert_eq!(timer.active_hours_end, NaiveTime::from_hms_opt(22, 0, 0).unwrap());
    }

    #[test]
    fn test_set_interval_clamps_and_recalculates() {
        let mut timer = PostureTimer::new(30);
        timer.set_interval(1);
        assert_eq!(timer.interval_minutes, 1);

        timer.set_interval(200);
        assert_eq!(timer.interval_minutes, 120);

        timer.set_interval(0);
        assert_eq!(timer.interval_minutes, 1);
    }

    #[test]
    fn test_active_hours_and_next_fire() {
        let mut timer = PostureTimer::new(30);
        timer.active_hours_start = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
        timer.active_hours_end = NaiveTime::from_hms_opt(17, 0, 0).unwrap();

        // 1. Time at 10:00 (mid-day): next fire should be 10:30
        let date = NaiveDate::from_ymd_opt(2026, 9, 24).unwrap(); // Thursday
        let time_10am = Local.from_local_datetime(&date.and_hms_opt(10, 0, 0).unwrap()).unwrap();
        let next = timer.calculate_next_fire_from(time_10am);
        assert_eq!(next.time(), NaiveTime::from_hms_opt(10, 30, 0).unwrap());

        // 2. Time at 16:45 (would fire at 17:15, after 17:00 end): should skip to tomorrow at 09:00
        let time_1645 = Local.from_local_datetime(&date.and_hms_opt(16, 45, 0).unwrap()).unwrap();
        let next_day = timer.calculate_next_fire_from(time_1645);
        assert_eq!(next_day.time(), NaiveTime::from_hms_opt(9, 0, 0).unwrap());
        assert_eq!(next_day.date_naive(), date + Duration::days(1));

        // 3. Time before start (e.g. 07:00): should schedule for today at 09:00
        let time_0700 = Local.from_local_datetime(&date.and_hms_opt(7, 0, 0).unwrap()).unwrap();
        let next_same_day = timer.calculate_next_fire_from(time_0700);
        assert_eq!(next_same_day.time(), NaiveTime::from_hms_opt(9, 0, 0).unwrap());
        assert_eq!(next_same_day.date_naive(), date);
    }

    #[test]
    fn test_active_days_skips_weekends() {
        let mut timer = PostureTimer::new(30);
        timer.set_active_days(vec![1, 2, 3, 4, 5]); // Mon-Fri only
        timer.active_hours_start = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
        timer.active_hours_end = NaiveTime::from_hms_opt(17, 0, 0).unwrap();

        // Friday 16:50 -> Next active is Monday at 09:00
        let friday = NaiveDate::from_ymd_opt(2026, 9, 25).unwrap(); // Friday
        let time_fri_late = Local.from_local_datetime(&friday.and_hms_opt(16, 50, 0).unwrap()).unwrap();
        let next_mon = timer.calculate_next_fire_from(time_fri_late);

        assert_eq!(next_mon.weekday(), Weekday::Mon);
        assert_eq!(next_mon.time(), NaiveTime::from_hms_opt(9, 0, 0).unwrap());
    }

    #[test]
    fn test_snooze_and_acknowledge() {
        let mut timer = PostureTimer::new(30);
        let before_snooze = Local::now();
        timer.snooze(15);
        let next = timer.next_fire_at.unwrap();
        let diff = (next - before_snooze).num_minutes();
        assert!(diff >= 14 && diff <= 16);

        // Acknowledge resets escalation to 1
        timer.current_escalation_level = 3;
        let ack = timer.acknowledge();
        assert!(ack.success);
        assert_eq!(ack.current_escalation_level, 1);
        assert_eq!(timer.current_escalation_level, 1);
        assert!(timer.last_acknowledged_at.is_some());
    }

    #[test]
    fn test_auto_escalation_logic() {
        let mut timer = PostureTimer::new(30);
        timer.escalation_enabled = true;
        timer.max_escalation_level = 3;

        let t0 = Local::now();
        // First fire at t0
        let event1 = timer.trigger_fire(t0);
        assert_eq!(event1.level, 1);
        assert_eq!(timer.current_escalation_level, 1);

        // Firing after 15 min (not 2x interval yet) -> stays level 1
        let t1 = t0 + Duration::minutes(15);
        let event2 = timer.trigger_fire(t1);
        assert_eq!(event2.level, 1);

        // Firing after 65 min from last fire without acknowledgment (>= 2x interval of 30m = 60m)
        let t2 = t1 + Duration::minutes(65);
        let event3 = timer.trigger_fire(t2);
        assert_eq!(event3.level, 2);
        assert_eq!(timer.current_escalation_level, 2);

        // Next missed 65 min -> escalates to level 3 (capped)
        let t3 = t2 + Duration::minutes(65);
        let event4 = timer.trigger_fire(t3);
        assert_eq!(event4.level, 3);

        // Next missed -> remains capped at level 3
        let t4 = t3 + Duration::minutes(65);
        let event5 = timer.trigger_fire(t4);
        assert_eq!(event5.level, 3);

        // User acknowledges -> resets to level 1
        timer.acknowledge();
        assert_eq!(timer.current_escalation_level, 1);
    }

    #[test]
    fn test_sleep_wake_handling_does_not_fire_immediately() {
        let mut timer = PostureTimer::new(30);
        let now = Local::now();
        timer.next_fire_at = Some(now + Duration::minutes(20));

        // Sleep
        timer.handle_system_suspend();
        assert!(timer.suspended_at.is_some());
        assert!(timer.remaining_before_suspend.is_some());

        // Wake 40 min later (past original deadline)
        timer.handle_system_wake();
        assert!(timer.suspended_at.is_none());
        // next_fire_at MUST be in the future, at least 1 minute or remaining duration
        assert!(timer.next_fire_at.unwrap() > Local::now());
    }

    #[test]
    fn test_overnight_active_hours_rolls_over_midnight() {
        let mut timer = PostureTimer::new(30);
        // Overnight window: 22:00 to 04:00
        timer.active_hours_start = NaiveTime::from_hms_opt(22, 0, 0).unwrap();
        timer.active_hours_end = NaiveTime::from_hms_opt(4, 0, 0).unwrap();

        let date = NaiveDate::from_ymd_opt(2026, 9, 24).unwrap();
        // 23:45 -> +30m is 00:15 the next calendar day (which is still < 04:00)
        let time_late = Local.from_local_datetime(&date.and_hms_opt(23, 45, 0).unwrap()).unwrap();
        let next = timer.calculate_next_fire_from(time_late);

        assert_eq!(next.time(), NaiveTime::from_hms_opt(0, 15, 0).unwrap());
        assert_eq!(next.date_naive(), date + Duration::days(1));
    }
}

