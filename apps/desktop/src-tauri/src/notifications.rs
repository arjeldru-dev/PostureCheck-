use std::sync::Mutex;
use std::time::Duration as StdDuration;
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_notification::NotificationExt;

use crate::tray::{get_active_icon, update_tray_visuals, TRAY_ID};

/// Windows-specific AUMID registration for notification settings
#[cfg(target_os = "windows")]
pub fn ensure_windows_aumid_registered() {
    use std::os::windows::process::CommandExt;
    use std::path::PathBuf;

    let app_id = "com.posturecheck.app";
    let icon_path = std::env::current_dir()
        .map(|d| d.join("icons").join("icon.ico"))
        .unwrap_or_else(|_| PathBuf::from("icons\\icon.ico"));
    let icon_str = icon_path.to_string_lossy().to_string();

    let exe_path = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "D:\\PostureCheck-\\apps\\desktop\\src-tauri\\target\\debug\\posture-check-desktop.exe".to_string());

    let script = format!(
        r#"
        $appId = '{app_id}'
        $classKey = "HKCU:\Software\Classes\AppUserModelId\$appId"
        if (-not (Test-Path $classKey)) {{ New-Item -Path $classKey -Force | Out-Null }}
        Set-ItemProperty -Path $classKey -Name "DisplayName" -Value "Posture Check!" -Type String
        Set-ItemProperty -Path $classKey -Name "ShowInSettings" -Value 1 -Type DWord
        if (Test-Path '{icon_str}') {{
            Set-ItemProperty -Path $classKey -Name "IconUri" -Value '{icon_str}' -Type String
        }}
        $settingsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\$appId"
        if (-not (Test-Path $settingsKey)) {{
            New-Item -Path $settingsKey -Force | Out-Null
            Set-ItemProperty -Path $settingsKey -Name "Enabled" -Value 1 -Type DWord
            Set-ItemProperty -Path $settingsKey -Name "ShowInActionCenter" -Value 1 -Type DWord
        }}

        # Ensure Start Menu Shortcut with AppUserModelID so Windows Settings lists it
        $programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
        $lnk = Join-Path $programs "Posture Check!.lnk"
        if (-not (Test-Path $lnk)) {{
            $wsh = New-Object -ComObject WScript.Shell
            $sc = $wsh.CreateShortcut($lnk)
            $sc.TargetPath = '{exe_path}'
            if (Test-Path '{icon_str}') {{ $sc.IconLocation = '{icon_str}' }}
            $sc.Save()

            $source = @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public class ShellHelper
{{
    [ComImport, Guid("00021401-0000-0000-C000-000000000046"), ClassInterface(ClassInterfaceType.None)]
    private class ShellLink {{}}

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {{
        int GetCount(out uint cProps);
        int GetAt(uint iProp, out PROPERTYKEY pkey);
        int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
        int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
        int Commit();
    }}

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private struct PROPERTYKEY
    {{
        public Guid fmtid;
        public uint pid;
    }}

    [StructLayout(LayoutKind.Explicit)]
    private struct PROPVARIANT
    {{
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr pwszVal;
    }}

    public static void SetAppId(string path, string id)
    {{
        ShellLink link = new ShellLink();
        IPersistFile file = (IPersistFile)link;
        file.Load(path, 2);
        IPropertyStore store = (IPropertyStore)link;
        PROPERTYKEY pkey = new PROPERTYKEY {{ fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 }};
        PROPVARIANT pv = new PROPVARIANT {{ vt = 31, pwszVal = Marshal.StringToCoTaskMemUni(id) }};
        store.SetValue(ref pkey, ref pv);
        store.Commit();
        file.Save(path, true);
        Marshal.FreeCoTaskMem(pv.pwszVal);
    }}
}}
"@
            try {{
                Add-Type -TypeDefinition $source
                [ShellHelper]::SetAppId($lnk, $appId)
            }} catch {{}}
        }}
        "#
    );

    let _ = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();
}

/// Windows-specific helper to clear prior toasts so new notifications replace rather than stack
#[cfg(target_os = "windows")]
pub fn clear_windows_toast_history(app_id: &str) {
    if let Ok(history) = windows::UI::Notifications::ToastNotificationManager::History() {
        let _ = history.ClearWithId(&windows::core::HSTRING::from(app_id));
    }
}

/// Action descriptor for notifications
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationAction {
    pub id: String,
    pub label: String,
}

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
    pub actions: Vec<NotificationAction>,
}

/// In-memory notification manager state
pub struct NotificationManager {
    pub default_intensity_level: u8,
    pub history: Vec<NotificationRecord>,
    pub last_message_index: Option<usize>,
    pub active_notification_id: Option<String>,
}

impl Default for NotificationManager {
    fn default() -> Self {
        Self {
            default_intensity_level: 2, // Default: Level 2 (Nudge)
            history: Vec::new(),
            last_message_index: None,
            active_notification_id: None,
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
    "Hey friend, your spine says thank you! 💚",
    "Stretch break? Even frogs need to hop around! 🐸",
    "Roll those shoulders back. Ah, much better!",
    "Are you turning into a shrimp? Sit tall! 🦐",
    "Take a deep breath and reset your back.",
    "Your future self will thank you for sitting straight now.",
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
    "Your spine is carrying your dreams today. Give it some love! 🌟",
    "Up, up, up! Straighten that spine before the lily pad sinks! 🪷",
    "Don't make Ribbit give you the disappointed stare... Sit tall!",
];

impl NotificationManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Selects a randomized message for the level without repeating the last index back-to-back
    pub fn pick_message(&mut self, level: u8) -> String {
        use rand::Rng;

        let pool = match level {
            1 => LEVEL_1_MESSAGES,
            3 => LEVEL_3_MESSAGES,
            _ => LEVEL_2_MESSAGES,
        };

        if pool.is_empty() {
            return "Time for a posture check! 🐸".to_string();
        }

        let mut rng = rand::rng();
        let mut idx = rng.random_range(0..pool.len());

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
        // If an earlier notification is still marked as "shown", supersede/dismiss it so notifications don't stack
        if let Some(active_id) = &self.active_notification_id {
            if let Some(prev) = self.history.iter_mut().rev().find(|r| &r.id == active_id) {
                if prev.status == "shown" {
                    prev.status = "dismissed".to_string();
                }
            }
        }

        let actions = vec![
            NotificationAction {
                id: "sitting_up".to_string(),
                label: "✓ Sitting up!".to_string(),
            },
            NotificationAction {
                id: "snooze".to_string(),
                label: "💤 Snooze (5m)".to_string(),
            },
        ];

        let record = NotificationRecord {
            id: id.clone(),
            timestamp: Local::now().to_rfc3339(),
            level,
            title,
            body,
            status,
            actions,
        };

        self.active_notification_id = Some(id);
        self.history.push(record.clone());
        if self.history.len() > 100 {
            self.history.remove(0);
        }
        record
    }

    /// Updates status of an existing notification in history
    pub fn update_status(&mut self, id: &str, new_status: &str) -> bool {
        if let Some(record) = self.history.iter_mut().rev().find(|r| r.id == id) {
            if record.status == new_status {
                return false;
            }
            record.status = new_status.to_string();
            if self.active_notification_id.as_deref() == Some(id)
                && (new_status == "acknowledged"
                    || new_status == "snoozed"
                    || new_status == "dismissed"
                    || new_status == "expired")
            {
                self.active_notification_id = None;
            }
            true
        } else {
            false
        }
    }

    /// Mark the latest active notification with a given status.
    /// Returns Some(id) only if the status actually transitioned to the new status.
    pub fn update_latest_active_status(&mut self, new_status: &str) -> Option<String> {
        let id_opt = self.active_notification_id.clone();
        if let Some(id) = id_opt {
            if self.update_status(&id, new_status) {
                return Some(id);
            }
        } else if let Some(last) = self.history.iter_mut().rev().find(|r| r.status == "shown") {
            last.status = new_status.to_string();
            return Some(last.id.clone());
        }
        None
    }
}

/// Constant notification tag ID so OS toasts replace existing ones instead of stacking
pub const POSTURE_NOTIFICATION_ID: i32 = 1;

/// Displays a posture notification through Tauri's notification plugin, manages timeouts,
/// and emits frontend events
pub fn show_posture_notification(
    app: &AppHandle,
    level: u8,
    custom_message: Option<String>,
) -> Result<NotificationRecord, String> {
    show_posture_notification_with_id(app, level, custom_message, None)
}

/// Displays a posture notification with an explicit check ID
pub fn show_posture_notification_with_id(
    app: &AppHandle,
    level: u8,
    custom_message: Option<String>,
    check_id: Option<String>,
) -> Result<NotificationRecord, String> {
    let now = Local::now();
    let is_new_check = check_id.is_none();
    let notification_id = check_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

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
        2 => "Posture Check! 🐸 (Nudge)",
        3 => "Posture Alert! 🐸 (Reminder)",
        _ => "Posture Check! 🐸",
    };

    // 2. Dispatch OS notification
    #[cfg(target_os = "windows")]
    {
        // Ensure AUMID registry entry exists so Posture Check! appears in Windows Notification Settings
        ensure_windows_aumid_registered();

        // Clear any previous notification from this app to prevent stacking
        clear_windows_toast_history("com.posturecheck.app");

        let mut toast = tauri_winrt_notification::Toast::new("com.posturecheck.app")
            .title(title)
            .text1(&body);

        let possible_icon_paths = [
            std::env::current_dir().map(|d| d.join("src-tauri").join("icons").join("128x128.png")).ok(),
            std::env::current_dir().map(|d| d.join("icons").join("128x128.png")).ok(),
            std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("icons").join("128x128.png"))),
            Some(std::path::PathBuf::from(r"D:\PostureCheck-\apps\desktop\src-tauri\icons\128x128.png")),
        ];
        let mascot_icon = possible_icon_paths.into_iter().flatten().find(|p| p.exists());

        match level {
            1 => {
                // Level 1: Whisper (Silent - no sound, no buttons, subtle popup + tray tooltip)
                toast = toast.sound(None);
                toast = toast.duration(tauri_winrt_notification::Duration::Short);
            }
            2 => {
                // Level 2: Nudge (System default sound, standard toast with action buttons)
                toast = toast.sound(Some(tauri_winrt_notification::Sound::Default));
                toast = toast.duration(tauri_winrt_notification::Duration::Short);
                toast = toast.add_button("✓ Sitting up!", "sitting_up");
                toast = toast.add_button("💤 Snooze (5m)", "snooze");
            }
            3 => {
                // Level 3: Reminder (Reminder chime + persistent on screen until acknowledged, rich banner layout with mascot icon)
                // Note: Do NOT set toast.duration() here! Windows WinRT requires duration to be omitted so the Reminder scenario keeps the banner on screen indefinitely.
                toast = toast.scenario(tauri_winrt_notification::Scenario::Reminder);
                toast = toast.sound(Some(tauri_winrt_notification::Sound::Reminder));
                if let Some(ref icon) = mascot_icon {
                    toast = toast.icon(icon, tauri_winrt_notification::IconCrop::Square, "Ribbit Mascot");
                }
                toast = toast.add_button("✓ Sitting up!", "sitting_up");
                toast = toast.add_button("💤 Snooze (5m)", "snooze");
            }
            _ => {
                toast = toast.sound(Some(tauri_winrt_notification::Sound::Default));
                toast = toast.add_button("✓ Sitting up!", "sitting_up");
                toast = toast.add_button("💤 Snooze (5m)", "snooze");
            }
        }

        let app_handle = app.clone();
        toast = toast.on_activated(move |action| {
            if let Some(act) = action {
                let app = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    match act.as_str() {
                        "sitting_up" => {
                            acknowledge_active_notification(&app, 10);
                        }
                        "snooze" => {
                            snooze_active_notification(&app, 5);
                        }
                        _ => {}
                    }
                });
            }
            Ok(())
        });

        if let Err(e) = toast.show() {
            eprintln!("[notifications] Failed to show Windows toast: {e}");
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut builder = app
            .notification()
            .builder()
            .id(POSTURE_NOTIFICATION_ID)
            .title(title)
            .body(&body);

        match level {
            1 => {}
            2 => {
                builder = builder.sound("Default");
            }
            3 => {
                builder = builder.sound("Reminder");
            }
            _ => {
                builder = builder.sound("Default");
            }
        }

        let _ = builder.show().map_err(|e| e.to_string())?;
    }

    // 3. Level 1 visual enhancement: also display subtle tray tooltip
    if level == 1 {
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            let _ = tray.set_tooltip(Some(format!("Posture Check! 🐸 — {}", body)));
            if let Some(img) = get_active_icon() {
                let _ = tray.set_icon(Some(img));
            }
        }
    }

    // 4. Record in notification history and SQLite database
    let record = {
        if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
            if let Ok(mut lock) = mgr.lock() {
                lock.record_notification(
                    notification_id.clone(),
                    level,
                    title.to_string(),
                    body.clone(),
                    "shown".to_string(),
                )
            } else {
                NotificationRecord {
                    id: notification_id.clone(),
                    timestamp: now.to_rfc3339(),
                    level,
                    title: title.to_string(),
                    body: body.clone(),
                    status: "shown".to_string(),
                    actions: vec![],
                }
            }
        } else {
            NotificationRecord {
                id: notification_id.clone(),
                timestamp: now.to_rfc3339(),
                level,
                title: title.to_string(),
                body: body.clone(),
                status: "shown".to_string(),
                actions: vec![],
            }
        }
    };

    // Ensure check is logged in SQLite database only if not already logged upstream (e.g. from test notifications)
    if is_new_check {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.log_posture_check(crate::database::NewPostureCheck {
                id: Some(notification_id.clone()),
                fired_at: Some(chrono::Utc::now().to_rfc3339()),
                intensity_level: level,
                message_shown: Some(body),
            });
        }
    }

    // 5. Emit `notification-shown` event to frontend
    let _ = app.emit("notification-shown", &record);

    // 6. Spawn auto-dismiss timer for Level 1 (10s) and Level 2 (30s)
    let auto_dismiss_secs = match level {
        1 => Some(10u64),
        2 => Some(30u64),
        _ => None, // Level 3 stays until acknowledged
    };

    if let Some(secs) = auto_dismiss_secs {
        let app_handle = app.clone();
        let target_id = notification_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(StdDuration::from_secs(secs)).await;

            let mut was_dismissed = false;
            if let Some(mgr) = app_handle.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    // Check if still shown
                    if let Some(r) = lock.history.iter_mut().rev().find(|r| r.id == target_id) {
                        if r.status == "shown" {
                            r.status = "dismissed".to_string();
                            was_dismissed = true;
                            if lock.active_notification_id.as_deref() == Some(&target_id) {
                                lock.active_notification_id = None;
                            }
                        }
                    }
                }
            }

            if was_dismissed {
                if let Some(db) = app_handle.try_state::<crate::database::Database>() {
                    let _ = db.update_posture_check(&target_id, "dismissed", None, None);
                }

                let _ = app_handle.emit(
                    "notification-dismissed",
                    serde_json::json!({
                        "id": target_id,
                        "reason": "auto_dismiss_timeout",
                        "level": level
                    }),
                );
                // If Level 1, restore standard tray tooltip
                if level == 1 {
                    update_tray_visuals(&app_handle);
                }
            }
        });
    }

    Ok(record)
}

/// Helper: mark active notification as acknowledged and emit event
pub fn acknowledge_active_notification(app: &AppHandle, xp_earned: u32) {
    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("acknowledged");
        }
    }

    if let Some(db) = app.try_state::<crate::database::Database>() {
        if let Ok((updated_progress, newly_unlocked)) =
            db.process_check_acknowledgment(target_id.as_deref(), xp_earned)
        {
            let _ = app.emit("progress-updated", &updated_progress);
            for ach_id in newly_unlocked {
                let _ = app.emit(
                    "achievement-unlocked",
                    serde_json::json!({ "achievementId": ach_id }),
                );
            }
        }
    }

    let _ = app.emit(
        "notification-acknowledged",
        serde_json::json!({
            "id": target_id,
            "xpEarned": xp_earned
        }),
    );
}

/// Helper: mark active notification as snoozed and emit event
pub fn snooze_active_notification(app: &AppHandle, minutes: u32) {
    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("snoozed");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "snoozed", None, None);
        }
    }

    let _ = app.emit(
        "notification-snoozed",
        serde_json::json!({
            "id": target_id,
            "minutes": minutes
        }),
    );
}

/// Helper: mark active notification as expired (e.g. 2x interval passed without action)
pub fn expire_active_notification(app: &AppHandle) {
    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("expired");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "expired", None, None);
        }
    }

    if let Some(id) = target_id {
        let _ = app.emit(
            "notification-expired",
            serde_json::json!({
                "id": id,
                "reason": "interval_doubled_unacknowledged"
            }),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pick_message_non_repeating() {
        let mut mgr = NotificationManager::new();
        let mut prev = String::new();
        for _ in 0..15 {
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
        assert_eq!(record.actions.len(), 2);
        assert_eq!(record.actions[0].id, "sitting_up");

        let updated = mgr.update_status("test-1", "acknowledged");
        assert!(updated);
        assert_eq!(mgr.history[0].status, "acknowledged");
    }

    #[test]
    fn test_supersede_previous_shown_notification() {
        let mut mgr = NotificationManager::new();
        mgr.record_notification(
            "notif-1".to_string(),
            2,
            "Title 1".to_string(),
            "Body 1".to_string(),
            "shown".to_string(),
        );
        assert_eq!(mgr.history[0].status, "shown");

        // Record a second notification
        mgr.record_notification(
            "notif-2".to_string(),
            3,
            "Title 2".to_string(),
            "Body 2".to_string(),
            "shown".to_string(),
        );

        // Previous notification must be marked as dismissed so notifications don't stack
        assert_eq!(mgr.history[0].status, "dismissed");
        assert_eq!(mgr.history[1].status, "shown");
        assert_eq!(mgr.active_notification_id, Some("notif-2".to_string()));
    }

    #[test]
    fn test_history_capacity_cap() {
        let mut mgr = NotificationManager::new();
        for i in 0..120 {
            mgr.record_notification(
                format!("notif-{}", i),
                1,
                "Title".to_string(),
                "Body".to_string(),
                "shown".to_string(),
            );
        }
        assert_eq!(mgr.history.len(), 100);
        assert_eq!(mgr.history.last().unwrap().id, "notif-119");
    }

    #[test]
    fn test_expire_notification_clears_active_and_does_not_repeat() {
        let mut mgr = NotificationManager::new();
        mgr.record_notification(
            "notif-exp".to_string(),
            3,
            "Title".to_string(),
            "Body".to_string(),
            "shown".to_string(),
        );

        assert_eq!(mgr.active_notification_id, Some("notif-exp".to_string()));

        // First expiration attempt succeeds and transitions
        let res1 = mgr.update_latest_active_status("expired");
        assert_eq!(res1, Some("notif-exp".to_string()));
        assert_eq!(mgr.history[0].status, "expired");
        assert_eq!(mgr.active_notification_id, None);

        // Subsequent expiration attempt returns None, preventing repeat IPC emit
        let res2 = mgr.update_latest_active_status("expired");
        assert_eq!(res2, None);
    }
}
