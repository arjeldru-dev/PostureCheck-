use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State, WindowEvent,
};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppStatePayload {
    pub status: String,
    pub interval_minutes: u32,
    pub is_paused: bool,
}

pub struct AppState {
    pub status: String,
    pub interval_minutes: u32,
    pub is_paused: bool,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            status: "active".to_string(),
            interval_minutes: 30,
            is_paused: false,
        }
    }

    pub fn to_payload(&self) -> AppStatePayload {
        AppStatePayload {
            status: self.status.clone(),
            interval_minutes: self.interval_minutes,
            is_paused: self.is_paused,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

const MIN_INTERVAL_MINUTES: u32 = 5;
const MAX_INTERVAL_MINUTES: u32 = 120;

/// Command: Get current application state
#[tauri::command]
fn get_app_state(state: State<'_, Mutex<AppState>>) -> Result<AppStatePayload, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.to_payload())
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
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.interval_minutes = interval;
    let payload = app_state.to_payload();
    let _ = app.emit("app-state-changed", &payload);
    Ok(())
}

/// Command: Toggle pause/resume state
#[tauri::command]
fn toggle_pause(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<AppStatePayload, String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.is_paused = !app_state.is_paused;
    app_state.status = if app_state.is_paused {
        "paused".to_string()
    } else {
        "active".to_string()
    };
    let payload = app_state.to_payload();
    let _ = app.emit("app-state-changed", &payload);
    Ok(payload)
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
            get_app_state,
            set_timer_interval,
            toggle_pause,
            send_test_notification
        ])
        .setup(|app| {
            // Setup System Tray Menu
            let show_i = MenuItem::with_id(app, "show", "Show Posture Check!", true, None::<&str>)?;
            let toggle_pause_i = MenuItem::with_id(app, "toggle_pause", "Pause / Resume Reminders", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Posture Check!", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &toggle_pause_i, &quit_i])?;

            let tray_icon = app
                .default_window_icon()
                .cloned()
                .ok_or_else(|| "Failed to load default window icon".to_string())?;

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .tooltip("Posture Check! - Ribbit is guarding your back 🐸")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "toggle_pause" => {
                        let state = app.state::<Mutex<AppState>>();
                        let lock_result = state.lock();
                        if let Ok(mut s) = lock_result {
                            s.is_paused = !s.is_paused;
                            s.status = if s.is_paused {
                                "paused".to_string()
                            } else {
                                "active".to_string()
                            };
                            let payload = s.to_payload();
                            let _ = app.emit("app-state-changed", &payload);
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // In dev mode, show window automatically on startup so developers can immediately see the UI
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
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
