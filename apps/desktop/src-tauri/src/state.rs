use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

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
    pub dnd_until: Option<DateTime<Utc>>,
    pub next_reminder_at: Option<DateTime<Utc>>,
    pub interval_minutes: u32,
}

pub const MIN_INTERVAL_MINUTES: u32 = 5;
pub const MAX_INTERVAL_MINUTES: u32 = 120;

impl AppState {
    pub fn new() -> Self {
        let initial_interval = 30;
        let next_reminder = Utc::now() + Duration::minutes(initial_interval as i64);

        Self {
            is_paused: false,
            is_dnd: false,
            dnd_until: None,
            next_reminder_at: Some(next_reminder),
            interval_minutes: initial_interval,
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
            Utc::now() < until
        } else {
            true // indefinite DND until manually canceled
        }
    }

    pub fn toggle_pause(&mut self) -> bool {
        self.is_paused = !self.is_paused;
        if self.is_paused {
            self.next_reminder_at = None;
        } else {
            self.refresh_next_reminder();
        }
        self.is_paused
    }

    pub fn set_dnd(&mut self, duration_minutes: Option<u64>) {
        self.is_dnd = true;
        self.dnd_until = duration_minutes.map(|mins| Utc::now() + Duration::minutes(mins as i64));
        self.next_reminder_at = None;
    }

    pub fn cancel_dnd(&mut self) {
        self.is_dnd = false;
        self.dnd_until = None;
        if !self.is_paused {
            self.refresh_next_reminder();
        }
    }

    pub fn refresh_next_reminder(&mut self) {
        if self.is_paused || self.is_dnd_active() {
            self.next_reminder_at = None;
        } else {
            self.next_reminder_at = Some(Utc::now() + Duration::minutes(self.interval_minutes as i64));
        }
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
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
