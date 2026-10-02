use std::sync::{Arc, Mutex};
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

pub const LEVEL_4_MESSAGES: &[&str] = &[
    "ATTENTION: Serious slouch alert! Straighten your spine now! 🚨",
    "Ribbit is jumping with urgency! Back off the desk! 🐸⚡",
    "You've been hunched too long! Sit up straight and claim your XP!",
    "Posture emergency! Un-hunch immediately for your own good!",
    "Priority check: Lift your chest, pull back your chin.",
    "Your spine called—it wants its natural curve back right now!",
];

pub const LEVEL_5_MESSAGES: &[&str] = &[
    "WAKE UP! FULL STOP! Sit up straight, stretch your arms, and breathe! 🛑🐸",
    "EMERGENCY POSTURE INTERVENTION! Ribbit is panicking! Straighten up!",
    "Screen blocked for your spinal safety! Roll your neck, align your back.",
    "No more excuses! Sit up like royalty before you continue.",
    "CRITICAL RESET: Stand or sit upright. Ribbit demands spine justice!",
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
            4 => LEVEL_4_MESSAGES,
            5 => LEVEL_5_MESSAGES,
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

    // Level 5 requires explicit opt-in confirmation; if not opted in, fall back to Level 4
    let effective_level = if level == 5 {
        let is_opted_in = if let Some(db) = app.try_state::<crate::database::Database>() {
            db.get_settings().map(|s| s.level5_opt_in).unwrap_or(false)
        } else {
            false
        };
        if is_opted_in {
            5
        } else {
            4
        }
    } else {
        level
    };

    // 1. Pick non-repeating message
    let body = match custom_message {
        Some(msg) => msg,
        None => {
            if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    lock.pick_message(effective_level)
                } else {
                    "Ribbit says: Time to sit up tall! 🐸".to_string()
                }
            } else {
                "Ribbit says: Time to sit up tall! 🐸".to_string()
            }
        }
    };

    let title = match effective_level {
        1 => "Posture Check! 🐸 (Whisper)",
        2 => "Posture Check! 🐸 (Nudge)",
        3 => "Posture Alert! 🐸 (Reminder)",
        4 => "⏰ Posture Check!",
        5 => "🚨 POSTURE CHECK! 🚨",
        _ => "Posture Check! 🐸",
    };

    // 2. Dispatch notification
    if effective_level >= 4 {
        // Level 4 (Alert) or Level 5 (Wake Up!): Overlay windows with alarm audio
        // Close prior active overlay to avoid stacking
        close_overlay_windows(app);

        // Play alarm sound (Level 4: repeats every 30s; Level 5: loops continuously)
        play_alarm_sound(app, effective_level);

        // Open custom Tauri overlay window
        if effective_level == 4 {
            show_level4_overlay(app, &notification_id, title, &body);
        } else {
            show_level5_fullscreen(app, &notification_id, title, &body);
        }
    } else {
        // Levels 1-3: continue using native OS notifications
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

            match effective_level {
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

            match effective_level {
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
    }

    // 3. Level 1 visual enhancement: also display subtle tray tooltip
    if effective_level == 1 {
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
                let mut rec = lock.record_notification(
                    notification_id.clone(),
                    effective_level,
                    title.to_string(),
                    body.clone(),
                    "shown".to_string(),
                );
                if effective_level == 5 {
                    rec.actions = vec![NotificationAction {
                        id: "sitting_up".to_string(),
                        label: "✓ I'm sitting up! Let me get back to work!".to_string(),
                    }];
                }
                rec
            } else {
                NotificationRecord {
                    id: notification_id.clone(),
                    timestamp: now.to_rfc3339(),
                    level: effective_level,
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
                level: effective_level,
                title: title.to_string(),
                body: body.clone(),
                status: "shown".to_string(),
                actions: vec![],
            }
        }
    };

    // Ensure check is logged in SQLite database only if not already logged upstream
    if is_new_check {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.log_posture_check(crate::database::NewPostureCheck {
                id: Some(notification_id.clone()),
                fired_at: Some(chrono::Utc::now().to_rfc3339()),
                intensity_level: effective_level,
                message_shown: Some(body),
            });
        }
    }

    // 5. Emit `notification-shown` event to frontend
    let _ = app.emit("notification-shown", &record);

    // 6. Spawn auto-dismiss timer for Level 1 (10s) and Level 2 (30s).
    // Levels 3, 4, 5 stay persistent until acknowledged by the user.
    let auto_dismiss_secs = match effective_level {
        1 => Some(10u64),
        2 => Some(30u64),
        _ => None,
    };

    if let Some(secs) = auto_dismiss_secs {
        let app_handle = app.clone();
        let target_id = notification_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(StdDuration::from_secs(secs)).await;

            let mut was_dismissed = false;
            if let Some(mgr) = app_handle.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
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
                        "level": effective_level
                    }),
                );
                if effective_level == 1 {
                    update_tray_visuals(&app_handle);
                }
            }
        });
    }

    Ok(record)
}

/// Helper: mark active notification as acknowledged, close overlays and emit event
pub fn acknowledge_active_notification(app: &AppHandle, xp_earned: u32) {
    close_overlay_windows(app);

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

/// Helper: mark active notification as snoozed, close overlays and emit event
pub fn snooze_active_notification(app: &AppHandle, minutes: u32) {
    close_overlay_windows(app);

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

/// Helper: mark active notification as expired, close overlays and emit event
pub fn expire_active_notification(app: &AppHandle) {
    close_overlay_windows(app);

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

/// Helper: mark active notification as dismissed, close overlays and emit event
pub fn dismiss_active_notification(app: &AppHandle) {
    close_overlay_windows(app);

    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("dismissed");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "dismissed", None, None);
        }
    }

    if let Some(id) = target_id {
        let _ = app.emit(
            "notification-dismissed",
            serde_json::json!({
                "id": id,
                "reason": "window_closed"
            }),
        );
    }
}

/// Helper: Play alarm sound for Level 4 or Level 5
pub fn play_alarm_sound(app: &AppHandle, level: u8) {
    if let Some(audio) = app.try_state::<Arc<crate::audio::AudioManager>>() {
        let audio_mgr = audio.inner().clone();
        tauri::async_runtime::spawn(async move {
            audio_mgr.play_alarm(level).await;
        });
    }
}

/// Helper: Stop alarm sound immediately
pub fn stop_alarm_sound(app: &AppHandle) {
    if let Some(audio) = app.try_state::<Arc<crate::audio::AudioManager>>() {
        audio.stop_alarm();
    }
}

/// Helper: Close/hide all overlay and fullscreen notification windows and stop audio
pub fn close_overlay_windows(app: &AppHandle) {
    stop_alarm_sound(app);
    if let Some(win) = app.get_webview_window("notification-overlay") {
        let _ = win.hide();
    }
    if let Some(win) = app.get_webview_window("notification-fullscreen") {
        let _ = win.hide();
    }
}

/// Helper: Re-focus fullscreen overlay if blurred
pub fn refocus_fullscreen_overlay(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("notification-fullscreen") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.set_always_on_top(true);
            let _ = win.set_focus();
        }
    }
}

/// Helper: Show Level 4 (Alert) overlay window centered on primary monitor
pub fn show_level4_overlay(app: &AppHandle, id: &str, title: &str, body: &str) {
    let win = if let Some(w) = app.get_webview_window("notification-overlay") {
        w
    } else {
        match tauri::WebviewWindowBuilder::new(
            app,
            "notification-overlay",
            tauri::WebviewUrl::App("overlay.html".into()),
        )
        .title("Posture Check! Alert")
        .inner_size(500.0, 300.0)
        .min_inner_size(500.0, 300.0)
        .max_inner_size(500.0, 300.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .build()
        {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[notifications] Failed to create overlay window: {e}");
                return;
            }
        }
    };

    // Center on primary monitor taking into account DPI scale factor
    if let Ok(Some(primary)) = win.primary_monitor() {
        let pos = primary.position();
        let size = primary.size();
        let scale = primary.scale_factor();
        let win_w = (500.0 * scale) as i32;
        let win_h = (300.0 * scale) as i32;
        let x = pos.x + ((size.width as i32 - win_w) / 2);
        let y = pos.y + ((size.height as i32 - win_h) / 2);
        let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
    } else {
        let _ = win.center();
    }

    let _ = win.set_always_on_top(true);
    let _ = win.show();
    let _ = win.set_focus();

    let _ = win.emit(
        "overlay-data",
        serde_json::json!({
            "id": id,
            "level": 4,
            "title": title,
            "body": body
        }),
    );
}

/// Helper: Show Level 5 (Wake Up!) fullscreen overlay covering primary monitor
pub fn show_level5_fullscreen(app: &AppHandle, id: &str, title: &str, body: &str) {
    let win = if let Some(w) = app.get_webview_window("notification-fullscreen") {
        w
    } else {
        match tauri::WebviewWindowBuilder::new(
            app,
            "notification-fullscreen",
            tauri::WebviewUrl::App("fullscreen.html".into()),
        )
        .title("Posture Check! Wake Up")
        .fullscreen(true)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .build()
        {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[notifications] Failed to create fullscreen window: {e}");
                return;
            }
        }
    };

    // Target the monitor currently active (where cursor is located) or primary monitor
    let target_monitor = if let Ok(cursor) = win.cursor_position() {
        if let Ok(monitors) = win.available_monitors() {
            monitors.into_iter().find(|m| {
                let pos = m.position();
                let size = m.size();
                let cx = cursor.x as i32;
                let cy = cursor.y as i32;
                cx >= pos.x
                    && cx < (pos.x + size.width as i32)
                    && cy >= pos.y
                    && cy < (pos.y + size.height as i32)
            })
        } else {
            None
        }
    } else {
        None
    };

    let active_monitor = target_monitor.or_else(|| win.primary_monitor().ok().flatten());
    if let Some(m) = active_monitor {
        let pos = m.position();
        let _ = win.set_position(tauri::Position::Physical(*pos));
    }

    let _ = win.set_fullscreen(true);
    let _ = win.set_always_on_top(true);
    let _ = win.show();
    let _ = win.set_focus();

    let _ = win.emit(
        "overlay-data",
        serde_json::json!({
            "id": id,
            "level": 5,
            "title": title,
            "body": body
        }),
    );
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
