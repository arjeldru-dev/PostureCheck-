pub mod state;
pub mod tray;

use std::sync::Mutex;
use tauri::{Emitter, Manager, State, WindowEvent};

use state::{
    AppState, AppStatePayload, TrayStatePayload, MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES,
};
use tray::update_tray_visuals;

/// Command: Get current system tray state (isActive, isDnd, nextReminderAt, etc.)
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
    let (tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        if app_state.is_dnd_active() {
            app_state.cancel_dnd();
        } else {
            app_state.toggle_pause();
        }
        (app_state.to_tray_payload(), app_state.to_app_payload())
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

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
    let (tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.set_dnd(duration_minutes);
        (app_state.to_tray_payload(), app_state.to_app_payload())
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

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
    let (tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.cancel_dnd();
        (app_state.to_tray_payload(), app_state.to_app_payload())
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    update_tray_visuals(&app);
    Ok(tray_payload)
}

/// Command: Get legacy app state payload
#[tauri::command]
fn get_app_state(state: State<'_, Mutex<AppState>>) -> Result<AppStatePayload, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.to_app_payload())
}

/// Command: Set timer interval in minutes (enforces 5-120 min bounds)
#[tauri::command]
fn set_timer_interval(
    interval: u32,
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    if interval < MIN_INTERVAL_MINUTES || interval > MAX_INTERVAL_MINUTES {
        return Err(format!(
            "Interval must be between {} and {} minutes",
            MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES
        ));
    }
    let (tray_payload, app_payload) = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.interval_minutes = interval;
        app_state.refresh_next_reminder();
        (app_state.to_tray_payload(), app_state.to_app_payload())
    };

    let _ = app.emit("tray-state-changed", &tray_payload);
    let _ = app.emit("app-state-changed", &app_payload);

    update_tray_visuals(&app);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppState::new()))
        .invoke_handler(tauri::generate_handler![
            get_tray_state,
            toggle_pause,
            set_dnd,
            cancel_dnd,
            get_app_state,
            set_timer_interval,
            send_test_notification
        ])
        .setup(|app| {
            // Setup System Tray
            tray::create_tray(app.handle())?;

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
