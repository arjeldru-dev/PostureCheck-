use chrono::{DateTime, Duration, Local};
use serde::{Deserialize, Serialize};

use crate::timer::{PostureTimer, TimerStatePayload};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrayStatePayload {
    pub is_active: bool,
    pub is_dnd: bool,
    pub next_reminder_at: Option<String>,
    pub status: String,
    pub dnd_until: Option<String>,
    pub interval_minutes: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppStatePayload {
    pub status: String,
    pub interval_minutes: u32,
    pub is_paused: bool,
    pub is_dnd: bool,
    pub next_reminder_at: Option<String>,
}

#[derive(Debug)]
pub struct AppState {
    pub is_paused: bool,
    pub is_dnd: bool,
    pub dnd_until: Option<DateTime<Local>>,
    pub next_reminder_at: Option<DateTime<Local>>,
    pub interval_minutes: u32,
    pub timer: PostureTimer,
}

pub const TEST_INTERVAL_MINUTES: u32 = 1;
pub const MIN_INTERVAL_MINUTES: u32 = 5;
pub const MAX_INTERVAL_MINUTES: u32 = 120;

impl AppState {
    pub fn new() -> Self {
        let initial_interval = 30;
        let timer = PostureTimer::new(initial_interval);
        let next_reminder = timer.next_fire_at;

        Self {
            is_paused: false,
            is_dnd: false,
            dnd_until: None,
            next_reminder_at: next_reminder,
            interval_minutes: initial_interval,
            timer,
        }
    }

    pub fn status(&self) -> String {
        if self.is_dnd_active() {
            "dnd".to_string()
        } else if self.is_paused {
            "paused".to_string()
        } else {
            "active".to_string()
        }
    }

    pub fn is_active(&self) -> bool {
        !self.is_paused && !self.is_dnd_active()
    }

    pub fn is_dnd_active(&self) -> bool {
        if !self.is_dnd {
            return false;
        }
        if let Some(until) = self.dnd_until {
            Local::now() < until
        } else {
            true // indefinite DND until manually canceled
        }
    }

    pub fn toggle_pause(&mut self) -> bool {
        self.is_paused = !self.is_paused;
        self.timer.is_running = self.is_active();
        if self.is_paused {
            self.next_reminder_at = None;
            self.timer.next_fire_at = None;
        } else {
            self.refresh_next_reminder();
        }
        self.is_paused
    }

    pub fn set_dnd(&mut self, duration_minutes: Option<u64>) {
        self.is_dnd = true;
        self.dnd_until = duration_minutes.map(|mins| Local::now() + Duration::minutes(mins as i64));
        self.timer.is_running = false;
        self.next_reminder_at = None;
        self.timer.next_fire_at = None;
    }

    pub fn cancel_dnd(&mut self) {
        self.is_dnd = false;
        self.dnd_until = None;
        self.timer.is_running = self.is_active();
        if !self.is_paused {
            self.refresh_next_reminder();
        }
    }

    pub fn refresh_next_reminder(&mut self) {
        if self.is_paused || self.is_dnd_active() {
            self.next_reminder_at = None;
            self.timer.next_fire_at = None;
        } else {
            let next = self.timer.calculate_next_fire_from(Local::now());
            self.timer.next_fire_at = Some(next);
            self.next_reminder_at = Some(next);
        }
    }

    pub fn sync_from_timer(&mut self) {
        self.interval_minutes = self.timer.interval_minutes;
        self.next_reminder_at = self.timer.next_fire_at;
        self.timer.is_running = self.is_active();
    }

    pub fn to_tray_payload(&self) -> TrayStatePayload {
        let is_dnd = self.is_dnd_active();
        TrayStatePayload {
            is_active: !self.is_paused && !is_dnd,
            is_dnd,
            next_reminder_at: self.next_reminder_at.map(|dt| dt.to_rfc3339()),
            status: self.status(),
            dnd_until: self.dnd_until.map(|dt| dt.to_rfc3339()),
            interval_minutes: self.interval_minutes,
        }
    }

    pub fn to_app_payload(&self) -> AppStatePayload {
        let is_dnd = self.is_dnd_active();
        AppStatePayload {
            status: self.status(),
            interval_minutes: self.interval_minutes,
            is_paused: self.is_paused,
            is_dnd,
            next_reminder_at: self.next_reminder_at.map(|dt| dt.to_rfc3339()),
        }
    }

    pub fn to_timer_payload(&self) -> TimerStatePayload {
        self.timer.to_payload(&self.status())
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
