pub mod notifications;
pub mod state;
pub mod timer;
pub mod tray;

use std::sync::{Arc, Mutex};
use chrono::NaiveTime;
use notifications::{
    acknowledge_active_notification, show_posture_notification, snooze_active_notification,
    NotificationManager, NotificationRecord,
};
use tauri::{Emitter, Manager, State, WindowEvent};
use tokio::sync::Notify;

use state::{
    AppState, AppStatePayload, TrayStatePayload, MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES,
    TEST_INTERVAL_MINUTES,
};
use timer::{
    start_timer_engine, AcknowledgePayload, TimerNotifier, TimerStatePayload,
};
use tray::update_tray_visuals;

/// Command: Get current system tray state
#[tauri::command]
fn get_tray_state(state: State<'_, Mutex<AppState>>) -> Result<TrayStatePayload, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.to_tray_payload())
}

/// Command: Toggle pause/resume state of posture reminders
#[tauri::command]
fn toggle_pause(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TrayStatePayload, String> {
    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        if app_state.is_dnd_active() {
            app_state.cancel_dnd();
        } else {
            app_state.toggle_pause();
        }
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(tray_payload)
}

/// Command: Set Do Not Disturb mode with optional duration in minutes
#[tauri::command]
fn set_dnd(
    duration_minutes: Option<u64>,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TrayStatePayload, String> {
    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.set_dnd(duration_minutes);
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);

    if let Some(minutes) = duration_minutes {
        tray::spawn_dnd_revert_timer(&app, minutes);
    }

    Ok(tray_payload)
}

/// Command: Cancel Do Not Disturb mode
#[tauri::command]
fn cancel_dnd(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TrayStatePayload, String> {
    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.cancel_dnd();
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(tray_payload)
}

/// Command: Get legacy app state payload
#[tauri::command]
fn get_app_state(state: State<'_, Mutex<AppState>>) -> Result<AppStatePayload, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.to_app_payload())
}

/// Command: Get current rich timer engine state
#[tauri::command]
fn get_timer_state(state: State<'_, Mutex<AppState>>) -> Result<TimerStatePayload, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.to_timer_payload())
}

/// Command: Set timer interval in minutes (enforces 1-120 min bounds)
#[tauri::command]
fn set_timer_interval(
    interval: u32,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TimerStatePayload, String> {
    if (interval < MIN_INTERVAL_MINUTES && interval != TEST_INTERVAL_MINUTES)
        || interval > MAX_INTERVAL_MINUTES
    {
        return Err(format!(
            "Interval must be between {} and {} minutes",
            MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES
        ));
    }
    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_interval(interval);
        app_state.sync_from_timer();
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(timer_payload)
}

/// Command: Acknowledge the current reminder, award XP, and reset timer
#[tauri::command]
fn acknowledge_reminder(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<AcknowledgePayload, String> {
    let (ack_payload, timer_payload, tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        let ack = app_state.timer.acknowledge();
        app_state.sync_from_timer();
        (
            ack,
            app_state.to_timer_payload(),
            app_state.to_tray_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    // Update active notification status and emit notification-acknowledged with XP
    acknowledge_active_notification(&app, ack_payload.xp_earned);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(ack_payload)
}

/// Command: Snooze the reminder by X minutes
#[tauri::command]
fn snooze_reminder(
    minutes: u32,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TimerStatePayload, String> {
    let (timer_payload, tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.snooze(minutes);
        app_state.sync_from_timer();
        (
            app_state.to_timer_payload(),
            app_state.to_tray_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    // Update active notification status and emit notification-snoozed
    snooze_active_notification(&app, minutes);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(timer_payload)
}

/// Command: Set active hours window (e.g. "08:00", "22:00")
#[tauri::command]
fn set_active_hours(
    start: String,
    end: String,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TimerStatePayload, String> {
    let parsed_start = NaiveTime::parse_from_str(&start, "%H:%M")
        .map_err(|e| format!("Invalid start time (expected HH:MM): {}", e))?;
    let parsed_end = NaiveTime::parse_from_str(&end, "%H:%M")
        .map_err(|e| format!("Invalid end time (expected HH:MM): {}", e))?;

    let (timer_payload, tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_active_hours(parsed_start, parsed_end);
        app_state.sync_from_timer();
        (
            app_state.to_timer_payload(),
            app_state.to_tray_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(timer_payload)
}

/// Command: Set active days of week (1=Mon, ..., 7=Sun)
#[tauri::command]
fn set_active_days(
    days: Vec<u8>,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TimerStatePayload, String> {
    let (timer_payload, tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_active_days(days);
        app_state.sync_from_timer();
        (
            app_state.to_timer_payload(),
            app_state.to_tray_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(timer_payload)
}

/// Command: Configure auto-escalation settings
#[tauri::command]
fn set_escalation_settings(
    enabled: bool,
    max_level: Option<u8>,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<TimerStatePayload, String> {
    let (timer_payload, tray_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.escalation_enabled = enabled;
        if let Some(ml) = max_level {
            app_state.timer.max_escalation_level = ml.clamp(1, 5);
        }
        (app_state.to_timer_payload(), app_state.to_tray_payload())
    };

    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
    Ok(timer_payload)
}

/// Command: Set default notification intensity level (1..=5, validated to 1..=3 for Phase 1)
#[tauri::command]
fn set_intensity_level(
    level: u8,
    mgr: State<'_, Mutex<NotificationManager>>,
) -> Result<u8, String> {
    if !(1..=5).contains(&level) {
        return Err("Intensity level must be between 1 and 5".to_string());
    }
    let mut lock = mgr.lock().map_err(|e| e.to_string())?;
    lock.default_intensity_level = level;
    Ok(level)
}

/// Command: Get recent notification history
#[tauri::command]
fn get_notification_history(
    limit: Option<u32>,
    mgr: State<'_, Mutex<NotificationManager>>,
) -> Result<Vec<NotificationRecord>, String> {
    let lock = mgr.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50) as usize;
    let history = lock.history.iter().rev().take(lim).cloned().collect();
    Ok(history)
}

/// Command: Send a test notification at specified intensity level (1..=3)
#[tauri::command]
fn test_notification(
    level: u8,
    app: tauri::AppHandle,
) -> Result<NotificationRecord, String> {
    let clamped_level = level.clamp(1, 3);
    show_posture_notification(&app, clamped_level, None)
}

/// Command: Send a native test notification to verify OS capabilities
#[tauri::command]
fn send_test_notification(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title("Posture Check! 🐸")
        .body("Ribbit says: Time to sit up tall and stretch!")
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Command: Process action triggered on a notification (e.g. "sitting_up", "snooze", "dismiss")
#[tauri::command]
fn handle_notification_action(
    action: String,
    notification_id: Option<String>,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    match action.as_str() {
        "sitting_up" | "acknowledge" => {
            let ack = acknowledge_reminder(app.clone(), state)?;
            Ok(serde_json::json!({
                "action": "sitting_up",
                "success": true,
                "xpEarned": ack.xp_earned,
                "notificationId": notification_id
            }))
        }
        "snooze" => {
            let _ = snooze_reminder(5, app.clone(), state)?;
            Ok(serde_json::json!({
                "action": "snooze",
                "success": true,
                "snoozeMinutes": 5,
                "notificationId": notification_id
            }))
        }
        "dismiss" => {
            if let Some(id) = &notification_id {
                if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
                    if let Ok(mut lock) = mgr.lock() {
                        lock.update_status(id, "dismissed");
                    }
                }
            }
            let _ = app.emit(
                "notification-dismissed",
                serde_json::json!({
                    "id": notification_id,
                    "reason": "user_dismissed"
                }),
            );
            Ok(serde_json::json!({
                "action": "dismiss",
                "success": true,
                "notificationId": notification_id
            }))
        }
        _ => Err(format!("Unknown notification action: {}", action)),
    }
}

/// Command: Check OS-level notification permission state
#[tauri::command]
fn check_notification_permission(_app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::core::HSTRING;
        use windows::UI::Notifications::{NotificationSetting, ToastNotificationManager};

        // 1. Check WinRT ToastNotifier setting for com.posturecheck.app
        if let Ok(notifier) = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from("com.posturecheck.app")) {
            if let Ok(setting) = notifier.Setting() {
                match setting {
                    NotificationSetting::DisabledForApplication
                    | NotificationSetting::DisabledForUser
                    | NotificationSetting::DisabledByGroupPolicy
                    | NotificationSetting::DisabledByManifest => {
                        return Ok("denied".to_string());
                    }
                    _ => {}
                }
            }
        }

        // 2. Fallback check: registry Enabled flag for com.posturecheck.app
        use std::os::windows::process::CommandExt;
        if let Ok(output) = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                r#"(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\com.posturecheck.app' -ErrorAction SilentlyContinue).Enabled"#,
            ])
            .creation_flags(0x08000000)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if text == "0" {
                return Ok("denied".to_string());
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use tauri_plugin_notification::NotificationExt;
        let perm = app.notification().permission_state().map_err(|e| e.to_string())?;
        let status = match perm {
            tauri_plugin_notification::PermissionState::Granted => "granted",
            tauri_plugin_notification::PermissionState::Denied => "denied",
            tauri_plugin_notification::PermissionState::Prompt
            | tauri_plugin_notification::PermissionState::PromptWithRationale => "prompt",
        };
        return Ok(status.to_string());
    }

    Ok("granted".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let notify = Arc::new(Notify::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppState::new()))
        .manage(Mutex::new(NotificationManager::new()))
        .manage(TimerNotifier(notify.clone()))
        .invoke_handler(tauri::generate_handler![
            get_tray_state,
            toggle_pause,
            set_dnd,
            cancel_dnd,
            get_app_state,
            get_timer_state,
            set_timer_interval,
            acknowledge_reminder,
            snooze_reminder,
            set_active_hours,
            set_active_days,
            set_escalation_settings,
            send_test_notification,
            set_intensity_level,
            get_notification_history,
            test_notification,
            handle_notification_action,
            check_notification_permission
        ])
        .setup(move |app| {
            // Setup System Tray
            tray::create_tray(app.handle())?;

            #[cfg(target_os = "windows")]
            crate::notifications::ensure_windows_aumid_registered();

            // Start Rust Background Timer Engine
            start_timer_engine(app.handle().clone(), notify);

            // If main window exists, center it
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.center();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent app from quitting on window close, hide to tray instead
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Posture Check! desktop application");
}
