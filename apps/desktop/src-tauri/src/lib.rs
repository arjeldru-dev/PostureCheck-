pub mod audio;
pub mod database;
pub mod notifications;
pub mod state;
pub mod timer;
pub mod tray;

use std::sync::{Arc, Mutex};
use chrono::{DateTime, Local, NaiveTime, Weekday};
use database::{
    AchievementItem, Database, PersistedAppState, PostureCheck, PostureSettings,
    SaveSettingsInput, TodayStats, UserProgress,
};
use notifications::{
    acknowledge_active_notification, show_posture_notification as core_show_posture_notification,
    snooze_active_notification, NotificationManager, NotificationRecord,
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

    if let Some(db) = app.try_state::<Database>() {
        let mut current_state = db.get_app_state().unwrap_or_default();
        current_state.is_paused = tray_payload.status == "paused";
        current_state.is_dnd = tray_payload.is_dnd;
        current_state.dnd_until = tray_payload.dnd_until.clone();
        let _ = db.save_app_state(&current_state);
    }

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

    if let Some(db) = app.try_state::<Database>() {
        let mut current_state = db.get_app_state().unwrap_or_default();
        current_state.is_paused = tray_payload.status == "paused";
        current_state.is_dnd = tray_payload.is_dnd;
        current_state.dnd_until = tray_payload.dnd_until.clone();
        let _ = db.save_app_state(&current_state);
    }

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

    if let Some(db) = app.try_state::<Database>() {
        let mut current_state = db.get_app_state().unwrap_or_default();
        current_state.is_paused = tray_payload.status == "paused";
        current_state.is_dnd = tray_payload.is_dnd;
        current_state.dnd_until = tray_payload.dnd_until.clone();
        let _ = db.save_app_state(&current_state);
    }

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

/// Command: Set default notification intensity level (1..=5)
#[tauri::command]
fn set_intensity_level(
    level: u8,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
    mgr: State<'_, Mutex<NotificationManager>>,
) -> Result<u8, String> {
    if !(1..=5).contains(&level) {
        return Err("Intensity level must be between 1 and 5".to_string());
    }
    {
        let mut lock = mgr.lock().map_err(|e| e.to_string())?;
        lock.default_intensity_level = level;
    }
    let (timer_payload, tray_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_intensity_level(level);
        (app_state.to_timer_payload(), app_state.to_tray_payload())
    };
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("tray-state-changed", &tray_payload);
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

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostureNotificationPayload {
    pub title: Option<String>,
    pub body: Option<String>,
    #[serde(alias = "intensity_level")]
    pub intensity_level: Option<u8>,
}

/// Command: Display a posture check notification (supports object payload or level param)
#[tauri::command]
fn show_posture_notification(
    notification: Option<PostureNotificationPayload>,
    level: Option<u8>,
    message: Option<String>,
    app: tauri::AppHandle,
) -> Result<NotificationRecord, String> {
    let lvl = notification
        .as_ref()
        .and_then(|n| n.intensity_level)
        .or(level)
        .unwrap_or(2)
        .clamp(1, 5);
    let msg = notification
        .as_ref()
        .and_then(|n| n.body.clone())
        .or(message);
    core_show_posture_notification(&app, lvl, msg)
}

/// Command: Send a test notification at specified intensity level (1..=5)
#[tauri::command]
fn test_notification(
    level: u8,
    app: tauri::AppHandle,
) -> Result<NotificationRecord, String> {
    let clamped_level = level.clamp(1, 5);
    core_show_posture_notification(&app, clamped_level, None)
}

/// Command: Close any open overlay/fullscreen windows and stop alarm audio
#[tauri::command]
fn close_overlay(app: tauri::AppHandle) -> Result<(), String> {
    notifications::close_overlay_windows(&app);
    Ok(())
}

/// Command: Re-focus fullscreen overlay if blurred
#[tauri::command]
fn refocus_fullscreen_overlay(app: tauri::AppHandle) -> Result<(), String> {
    notifications::refocus_fullscreen_overlay(&app);
    Ok(())
}

/// Command: Play alarm sound for a given intensity level
#[tauri::command]
fn play_alarm_sound(level: u8, app: tauri::AppHandle) -> Result<(), String> {
    notifications::play_alarm_sound(&app, level);
    Ok(())
}

/// Command: Stop alarm sound immediately
#[tauri::command]
fn stop_alarm_sound(app: tauri::AppHandle) -> Result<(), String> {
    notifications::stop_alarm_sound(&app);
    Ok(())
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
                if let Some(db) = app.try_state::<Database>() {
                    let _ = db.update_posture_check(id, "dismissed", None, None);
                }
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

/// Command: Get active posture settings from database
#[tauri::command]
fn get_settings(db: State<'_, Database>) -> Result<PostureSettings, String> {
    db.get_settings()
}

/// Command: Save posture settings to database and sync timer state
#[tauri::command]
fn save_settings(
    settings: SaveSettingsInput,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
    db: State<'_, Database>,
) -> Result<PostureSettings, String> {
    let saved = db.save_settings(settings)?;

    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_interval(saved.interval_minutes);
        app_state.timer.set_intensity_level(saved.intensity_level);
        app_state.timer.escalation_enabled = saved.auto_escalation;

        if let Ok(start) = NaiveTime::parse_from_str(&saved.active_hours_start, "%H:%M") {
            if let Ok(end) = NaiveTime::parse_from_str(&saved.active_hours_end, "%H:%M") {
                app_state.timer.set_active_hours(start, end);
            }
        }

        let parsed_days: Vec<u8> = saved
            .active_days
            .split(',')
            .filter_map(|s| s.trim().parse::<u8>().ok())
            .collect();
        if !parsed_days.is_empty() {
            app_state.timer.set_active_days(parsed_days);
        }

        app_state.sync_from_timer();
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("settings-changed", &saved);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            lock.default_intensity_level = saved.intensity_level;
        }
    }

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(saved)
}

/// Command: Get paginated posture check history from database
#[tauri::command]
fn get_posture_history(
    limit: Option<u32>,
    offset: Option<u32>,
    db: State<'_, Database>,
) -> Result<Vec<PostureCheck>, String> {
    db.get_posture_checks(limit.unwrap_or(50), offset.unwrap_or(0))
}

/// Command: Get user gamification progress (XP, level, streak)
#[tauri::command]
fn get_progress(db: State<'_, Database>) -> Result<UserProgress, String> {
    db.get_user_progress()
}

/// Command: Get all achievements with unlock status
#[tauri::command]
fn get_achievements(db: State<'_, Database>) -> Result<Vec<AchievementItem>, String> {
    db.get_achievements()
}

/// Command: Get today's statistics
#[tauri::command]
fn get_today_stats(db: State<'_, Database>) -> Result<TodayStats, String> {
    db.get_today_stats()
}

/// Command: Get persisted app state from database
#[tauri::command]
fn get_persisted_app_state(db: State<'_, Database>) -> Result<PersistedAppState, String> {
    db.get_app_state()
}

/// Command: Save persisted app state to database
#[tauri::command]
fn save_app_state(
    state: PersistedAppState,
    db: State<'_, Database>,
) -> Result<PersistedAppState, String> {
    db.save_app_state(&state)
}

/// Command: Get all profiles from database
#[tauri::command]
fn get_profiles(db: State<'_, Database>) -> Result<Vec<PostureSettings>, String> {
    db.get_profiles()
}

/// Command: Switch active profile and sync timer engine
#[tauri::command]
fn switch_profile(
    profile_id: String,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
    db: State<'_, Database>,
) -> Result<PostureSettings, String> {
    let saved = db.switch_profile(&profile_id)?;

    let (tray_payload, timer_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.timer.set_interval(saved.interval_minutes);
        app_state.timer.set_intensity_level(saved.intensity_level);
        app_state.timer.escalation_enabled = saved.auto_escalation;

        if let Ok(start) = NaiveTime::parse_from_str(&saved.active_hours_start, "%H:%M") {
            if let Ok(end) = NaiveTime::parse_from_str(&saved.active_hours_end, "%H:%M") {
                app_state.timer.set_active_hours(start, end);
            }
        }

        let parsed_days: Vec<u8> = saved
            .active_days
            .split(',')
            .filter_map(|s| s.trim().parse::<u8>().ok())
            .collect();
        if !parsed_days.is_empty() {
            app_state.timer.set_active_days(parsed_days);
        }

        app_state.sync_from_timer();
        (
            app_state.to_tray_payload(),
            app_state.to_timer_payload(),
            app_state.to_app_payload(),
        )
    };

    let _ = app.emit("settings-changed", &saved);
    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("timer-state-changed", &timer_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            lock.default_intensity_level = saved.intensity_level;
        }
    }

    if let Some(notifier) = app.try_state::<TimerNotifier>() {
        notifier.0.notify_one();
    }

    update_tray_visuals(&app);
    Ok(saved)
}

/// Command: Create a new custom posture profile
#[tauri::command]
fn create_profile(
    settings: SaveSettingsInput,
    db: State<'_, Database>,
) -> Result<PostureSettings, String> {
    db.create_profile(settings)
}

/// Command: Delete a posture profile
#[tauri::command]
fn delete_profile(
    profile_id: String,
    db: State<'_, Database>,
) -> Result<bool, String> {
    db.delete_profile(&profile_id)
}

/// Command: Clear all posture check history
#[tauri::command]
fn clear_posture_history(db: State<'_, Database>) -> Result<usize, String> {
    db.clear_posture_history()
}

/// Command: Export complete app & posture check data as JSON
#[tauri::command]
fn export_posture_data(db: State<'_, Database>) -> Result<String, String> {
    db.export_posture_data()
}

/// Command: Set launch on startup preference and Windows registry Run key
#[tauri::command]
fn set_launch_on_startup(
    enabled: bool,
    db: State<'_, Database>,
) -> Result<bool, String> {
    let mut state = db.get_app_state().unwrap_or_default();
    state.launch_on_startup = enabled;
    db.save_app_state(&state)?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        if enabled {
            if let Ok(current_exe) = std::env::current_exe() {
                let exe_str = current_exe.to_string_lossy().replace('\'', "''");
                let _ = std::process::Command::new("powershell")
                    .args([
                        "-NoProfile",
                        "-NonInteractive",
                        "-Command",
                        &format!(
                            r#"Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PostureCheck' -Value '"{}"'"#,
                            exe_str
                        ),
                    ])
                    .creation_flags(0x08000000)
                    .output();
            }
        } else {
            let _ = std::process::Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    r#"Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PostureCheck' -ErrorAction SilentlyContinue"#,
                ])
                .creation_flags(0x08000000)
                .output();
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On macOS / Linux platforms, launch_on_startup preference is saved in SQLite app_state;
        // OS autostart files (LaunchAgents / .desktop entries) are handled during packaging/installation.
    }

    Ok(enabled)
}

/// Command: Open an external URL in the system default browser safely
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Only http and https URLs are allowed".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let notify = Arc::new(Notify::new());

    let audio_mgr = Arc::new(audio::AudioManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppState::new()))
        .manage(Mutex::new(NotificationManager::new()))
        .manage(TimerNotifier(notify.clone()))
        .manage(audio_mgr)
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
            check_notification_permission,
            get_settings,
            save_settings,
            get_posture_history,
            get_progress,
            get_achievements,
            get_today_stats,
            get_persisted_app_state,
            save_app_state,
            show_posture_notification,
            get_profiles,
            switch_profile,
            create_profile,
            delete_profile,
            clear_posture_history,
            export_posture_data,
            set_launch_on_startup,
            open_external_url,
            close_overlay,
            refocus_fullscreen_overlay,
            play_alarm_sound,
            stop_alarm_sound
        ])
        .setup(move |app| {
            // 1. Initialize SQLite Database and run migrations
            let db = database::init_database(app.handle())?;

            // 2. Load settings and persisted app state to restore initial state
            let settings = db.get_settings().unwrap_or_default();
            let persisted_state = db.get_app_state().unwrap_or_default();

            {
                if let Ok(mut state) = app.state::<Mutex<AppState>>().lock() {
                    state.interval_minutes = settings.interval_minutes;
                    state.timer.interval_minutes = settings.interval_minutes;
                    state.timer.set_intensity_level(settings.intensity_level);
                    state.timer.escalation_enabled = settings.auto_escalation;

                    if let Ok(start) = NaiveTime::parse_from_str(&settings.active_hours_start, "%H:%M") {
                        state.timer.active_hours_start = start;
                    }
                    if let Ok(end) = NaiveTime::parse_from_str(&settings.active_hours_end, "%H:%M") {
                        state.timer.active_hours_end = end;
                    }

                    let parsed_days: Vec<Weekday> = settings
                        .active_days
                        .split(',')
                        .filter_map(|s| s.trim().parse::<u8>().ok())
                        .filter_map(|num| match num {
                            1 => Some(Weekday::Mon),
                            2 => Some(Weekday::Tue),
                            3 => Some(Weekday::Wed),
                            4 => Some(Weekday::Thu),
                            5 => Some(Weekday::Fri),
                            6 => Some(Weekday::Sat),
                            7 => Some(Weekday::Sun),
                            _ => None,
                        })
                        .collect();
                    if !parsed_days.is_empty() {
                        state.timer.active_days = parsed_days;
                    }

                    if persisted_state.is_paused {
                        state.is_paused = true;
                        state.timer.is_running = false;
                        state.next_reminder_at = None;
                        state.timer.next_fire_at = None;
                    } else if persisted_state.is_dnd {
                        let mut still_dnd = true;
                        if let Some(ref until_str) = persisted_state.dnd_until {
                            if let Ok(until_dt) = DateTime::parse_from_rfc3339(until_str) {
                                let until_local = until_dt.with_timezone(&Local);
                                if Local::now() < until_local {
                                    state.is_dnd = true;
                                    state.dnd_until = Some(until_local);
                                    state.timer.is_running = false;
                                    state.next_reminder_at = None;
                                    state.timer.next_fire_at = None;
                                } else {
                                    still_dnd = false;
                                }
                            }
                        } else {
                            state.is_dnd = true;
                            state.dnd_until = None;
                            state.timer.is_running = false;
                            state.next_reminder_at = None;
                            state.timer.next_fire_at = None;
                        }

                        if !still_dnd {
                            state.cancel_dnd();
                        }
                    } else {
                        state.refresh_next_reminder();
                    }
                }
            }

            if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    lock.default_intensity_level = settings.intensity_level;
                }
            }

            // Manage database handle
            app.manage(db);

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
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    if window.label() == "notification-fullscreen" {
                        // Level 5 fullscreen overlay blocks closing until acknowledged
                    } else if window.label() == "notification-overlay" {
                        notifications::dismiss_active_notification(&window.app_handle());
                    } else {
                        // Prevent app from quitting on main window close, hide to tray instead
                        let _ = window.hide();
                    }
                }
                WindowEvent::Focused(false) => {
                    if window.label() == "notification-fullscreen" && window.is_visible().unwrap_or(false) {
                        let win_clone = window.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                            let _ = win_clone.set_always_on_top(true);
                            let _ = win_clone.set_focus();
                        });
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Posture Check! desktop application");
}
