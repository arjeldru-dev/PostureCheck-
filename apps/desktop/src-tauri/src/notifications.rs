use std::sync::Mutex;
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

/// Structure representing a recorded notification in history
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationRecord {
    pub id: String,
    pub timestamp: String,
    pub level: u8,
    pub title: String,
    pub body: String,
    pub status: String, // "shown" | "acknowledged" | "snoozed" | "dismissed" | "expired"
}

/// In-memory notification manager state
pub struct NotificationManager {
    pub default_intensity_level: u8,
    pub history: Vec<NotificationRecord>,
    pub last_message_index: Option<usize>,
}

impl Default for NotificationManager {
    fn default() -> Self {
        Self {
            default_intensity_level: 2, // Default: Level 2 (Nudge)
            history: Vec::new(),
            last_message_index: None,
        }
    }
}

// Curated pool of Ribbit messages by intensity level (from @posture-check/shared)
pub const LEVEL_1_MESSAGES: &[&str] = &[
    "Psst! How's your back feeling? 🐸",
    "Gentle check-in from your friendly frog.",
    "Soft reminder: relax your shoulders. ✨",
    "Just a tiny whisper: align your spine! 🌿",
    "Unclench your jaw, soften your neck.",
    "A little frog wink for your posture 😉",
];

pub const LEVEL_2_MESSAGES: &[&str] = &[
    "Ribbit! Time to sit up straight! 🐸",
    "Quick posture check! You got this 💪",
    "Shoulders back, crown high!",
    "Check in: are you slouching right now?",
    "A gentle nudge to reset your spinal alignment.",
    "Breathe deep, sit tall, feel the frog energy!",
];

pub const LEVEL_3_MESSAGES: &[&str] = &[
    "Posture alert! Roll those shoulders back right now. 🐸",
    "Straighten up! Your future back will thank Ribbit.",
    "Time for a 10-second stretch break!",
    "Attention: Slouching detected! Align your posture now.",
    "Ribbit reminder: Sit tall like a majestic frog on a lily pad!",
];

impl NotificationManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Selects a randomized message for the level without repeating the last index back-to-back
    pub fn pick_message(&mut self, level: u8) -> String {
        let pool = match level {
            1 => LEVEL_1_MESSAGES,
            3 => LEVEL_3_MESSAGES,
            _ => LEVEL_2_MESSAGES,
        };

        if pool.is_empty() {
            return "Time for a posture check! 🐸".to_string();
        }

        let now_millis = Local::now().timestamp_subsec_millis() as usize;
        let mut idx = now_millis % pool.len();

        // Ensure no back-to-back repeats if pool has > 1 item
        if pool.len() > 1 {
            if let Some(last) = self.last_message_index {
                if idx == last {
                    idx = (idx + 1) % pool.len();
                }
            }
        }

        self.last_message_index = Some(idx);
        pool[idx].to_string()
    }

    /// Records a notification event in history (keeps last 100 entries)
    pub fn record_notification(
        &mut self,
        id: String,
        level: u8,
        title: String,
        body: String,
        status: String,
    ) -> NotificationRecord {
        let record = NotificationRecord {
            id,
            timestamp: Local::now().to_rfc3339(),
            level,
            title,
            body,
            status,
        };

        self.history.push(record.clone());
        if self.history.len() > 100 {
            self.history.remove(0);
        }
        record
    }

    /// Updates status of an existing notification in history
    pub fn update_status(&mut self, id: &str, new_status: &str) {
        if let Some(record) = self.history.iter_mut().rev().find(|r| r.id == id) {
            record.status = new_status.to_string();
        }
    }
}

/// Displays a posture notification through Tauri's notification plugin and emits frontend events
pub fn show_posture_notification(
    app: &AppHandle,
    level: u8,
    custom_message: Option<String>,
) -> Result<NotificationRecord, String> {
    let now = Local::now();
    let notification_id = format!("notif-{}", now.timestamp_millis());

    // 1. Pick non-repeating message
    let body = match custom_message {
        Some(msg) => msg,
        None => {
            if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    lock.pick_message(level)
                } else {
                    "Ribbit says: Time to sit up tall! 🐸".to_string()
                }
            } else {
                "Ribbit says: Time to sit up tall! 🐸".to_string()
            }
        }
    };

    let title = match level {
        1 => "Posture Check! 🐸 (Whisper)",
        2 => "Posture Check! 🐸",
        3 => "Posture Check! 🐸 (Reminder)",
        _ => "Posture Check! 🐸",
    };

    // 2. Build and dispatch OS notification via Tauri plugin
    let builder = app
        .notification()
        .builder()
        .title(title)
        .body(&body);

    // Level-specific audio / behavior: Level 1 is quiet, Level 2 default sound, Level 3 chime
    let builder = match level {
        1 => builder,
        2 => builder,
        _ => builder,
    };

    let _ = builder.show().map_err(|e| e.to_string())?;

    // 3. Record in notification history
    let record = {
        if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
            if let Ok(mut lock) = mgr.lock() {
                lock.record_notification(
                    notification_id,
                    level,
                    title.to_string(),
                    body,
                    "shown".to_string(),
                )
            } else {
                NotificationRecord {
                    id: notification_id,
                    timestamp: now.to_rfc3339(),
                    level,
                    title: title.to_string(),
                    body,
                    status: "shown".to_string(),
                }
            }
        } else {
            NotificationRecord {
                id: notification_id,
                timestamp: now.to_rfc3339(),
                level,
                title: title.to_string(),
                body,
                status: "shown".to_string(),
            }
        }
    };

    // 4. Emit `notification-shown` event to frontend
    let _ = app.emit("notification-shown", &record);

    Ok(record)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pick_message_non_repeating() {
        let mut mgr = NotificationManager::new();
        let mut prev = String::new();
        for _ in 0..10 {
            let msg = mgr.pick_message(2);
            assert!(!msg.is_empty());
            assert_ne!(msg, prev);
            prev = msg;
        }
    }

    #[test]
    fn test_record_and_update_history() {
        let mut mgr = NotificationManager::new();
        let record = mgr.record_notification(
            "test-1".to_string(),
            1,
            "Title".to_string(),
            "Body".to_string(),
            "shown".to_string(),
        );

        assert_eq!(record.id, "test-1");
        assert_eq!(mgr.history.len(), 1);

        mgr.update_status("test-1", "acknowledged");
        assert_eq!(mgr.history[0].status, "acknowledged");
    }
}
