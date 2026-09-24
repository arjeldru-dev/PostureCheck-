use std::sync::{Mutex, OnceLock};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::state::AppState;

pub const TRAY_ID: &str = "main-tray";

const TRAY_ACTIVE_BYTES: &[u8] = include_bytes!("../icons/tray-active.png");
const TRAY_PAUSED_BYTES: &[u8] = include_bytes!("../icons/tray-paused.png");
const TRAY_ALERT_BYTES: &[u8] = include_bytes!("../icons/tray-alert.png");

static TRAY_ACTIVE_ICON: OnceLock<Option<Image<'static>>> = OnceLock::new();
static TRAY_PAUSED_ICON: OnceLock<Option<Image<'static>>> = OnceLock::new();
static TRAY_ALERT_ICON: OnceLock<Option<Image<'static>>> = OnceLock::new();

// Store MenuItem references for dynamic updates if needed
pub struct TrayMenuItems {
    pub pause_item: MenuItem<tauri::Wry>,
}

static MENU_ITEMS: OnceLock<TrayMenuItems> = OnceLock::new();

pub fn get_active_icon() -> Option<Image<'static>> {
    TRAY_ACTIVE_ICON
        .get_or_init(|| Image::from_bytes(TRAY_ACTIVE_BYTES).ok())
        .clone()
}

pub fn get_paused_icon() -> Option<Image<'static>> {
    TRAY_PAUSED_ICON
        .get_or_init(|| Image::from_bytes(TRAY_PAUSED_BYTES).ok())
        .clone()
}

pub fn get_alert_icon() -> Option<Image<'static>> {
    TRAY_ALERT_ICON
        .get_or_init(|| Image::from_bytes(TRAY_ALERT_BYTES).ok())
        .clone()
}

pub fn update_tray_visuals(app: &AppHandle) {
    // Release the lock immediately after copying required fields to avoid deadlock
    let (is_dnd, is_paused, next_reminder, dnd_until) = {
        let state = app.state::<Mutex<AppState>>();
        let Ok(s) = state.lock() else { return };
        (
            s.is_dnd_active(),
            s.is_paused,
            s.next_reminder_at,
            s.dnd_until,
        )
    };

    let icon = if is_dnd || is_paused {
        get_paused_icon()
    } else {
        get_active_icon()
    };

    let tooltip = if is_dnd {
        if let Some(until) = dnd_until {
            let local_until = until.with_timezone(&chrono::Local);
            format!("Posture Check! — DND until {}", local_until.format("%-I:%M %p"))
        } else {
            "Posture Check! — Do Not Disturb (Silent)".to_string()
        }
    } else if is_paused {
        "Posture Check! — Reminders Paused 😴".to_string()
    } else if let Some(next) = next_reminder {
        let local_next = next.with_timezone(&chrono::Local);
        format!("Posture Check! — Next reminder at {}", local_next.format("%-I:%M %p"))
    } else {
        "Posture Check! — Ribbit is guarding your posture 🐸".to_string()
    };

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Some(img) = icon {
            let _ = tray.set_icon(Some(img));
        }
        let _ = tray.set_tooltip(Some(tooltip));
    }

    if let Some(items) = MENU_ITEMS.get() {
        let label = if is_dnd {
            "▶ Resume Reminders (Turn Off DND)"
        } else if is_paused {
            "▶ Resume Reminders"
        } else {
            "⏸ Pause Reminders"
        };
        let _ = items.pause_item.set_text(label);
    }
}

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let toggle_pause_item =
        MenuItem::with_id(app, "toggle_pause", "⏸ Pause Reminders", true, None::<&str>)?;

    let dnd_30 = MenuItem::with_id(app, "dnd_30", "30 minutes", true, None::<&str>)?;
    let dnd_60 = MenuItem::with_id(app, "dnd_60", "1 hour", true, None::<&str>)?;
    let dnd_120 = MenuItem::with_id(app, "dnd_120", "2 hours", true, None::<&str>)?;
    let dnd_off = MenuItem::with_id(app, "dnd_off", "Until I turn it off", true, None::<&str>)?;
    let dnd_cancel = MenuItem::with_id(app, "dnd_cancel", "Turn Off DND", true, None::<&str>)?;

    let dnd_submenu = Submenu::with_items(
        app,
        "🔕 Do Not Disturb",
        true,
        &[&dnd_30, &dnd_60, &dnd_120, &dnd_off, &dnd_cancel],
    )?;

    let sep1 = PredefinedMenuItem::separator(app)?;
    let open_dashboard =
        MenuItem::with_id(app, "open_dashboard", "📊 Open Dashboard", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "open_settings", "⚙ Settings", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "❌ Quit Posture Check!", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle_pause_item,
            &dnd_submenu,
            &sep1,
            &open_dashboard,
            &settings,
            &sep2,
            &quit,
        ],
    )?;

    let _ = MENU_ITEMS.set(TrayMenuItems {
        pause_item: toggle_pause_item,
    });

    let initial_icon = get_active_icon()
        .or_else(|| app.default_window_icon().cloned())
        .ok_or_else(|| "Failed to load tray icon".to_string())?;

    let tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(initial_icon)
        .menu(&menu)
        .tooltip("Posture Check! — Ribbit is guarding your posture 🐸")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let event_id = event.id.as_ref();
            match event_id {
                "toggle_pause" => {
                    let mut tray_payload = None;
                    let mut app_payload = None;
                    {
                        let state = app.state::<Mutex<AppState>>();
                        if let Ok(mut s) = state.lock() {
                            if s.is_dnd_active() {
                                s.cancel_dnd();
                            } else {
                                s.toggle_pause();
                            }
                            tray_payload = Some(s.to_tray_payload());
                            app_payload = Some(s.to_app_payload());
                        };
                    }
                    if let (Some(tp), Some(ap)) = (tray_payload, app_payload) {
                        let _ = app.emit("app-state-changed", &ap);
                        let _ = app.emit("tray-state-changed", &tp);
                    }
                    update_tray_visuals(app);
                }
                "dnd_30" => {
                    handle_set_dnd(app, Some(30));
                }
                "dnd_60" => {
                    handle_set_dnd(app, Some(60));
                }
                "dnd_120" => {
                    handle_set_dnd(app, Some(120));
                }
                "dnd_off" => {
                    handle_set_dnd(app, None);
                }
                "dnd_cancel" => {
                    let mut tray_payload = None;
                    let mut app_payload = None;
                    {
                        let state = app.state::<Mutex<AppState>>();
                        if let Ok(mut s) = state.lock() {
                            s.cancel_dnd();
                            tray_payload = Some(s.to_tray_payload());
                            app_payload = Some(s.to_app_payload());
                        };
                    }
                    if let (Some(tp), Some(ap)) = (tray_payload, app_payload) {
                        let _ = app.emit("app-state-changed", &ap);
                        let _ = app.emit("tray-state-changed", &tp);
                    }
                    update_tray_visuals(app);
                }
                "open_dashboard" => {
                    show_main_window(app);
                    let _ = app.emit("navigate-to-dashboard", ());
                }
                "open_settings" => {
                    show_main_window(app);
                    let _ = app.emit("navigate-to-settings", ());
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(app);
            }
        })
        .build(app)?;

    Ok(tray)
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

pub fn handle_set_dnd(app: &AppHandle, duration_minutes: Option<u64>) {
    let mut tray_payload = None;
    let mut app_payload = None;
    {
        let state = app.state::<Mutex<AppState>>();
        if let Ok(mut s) = state.lock() {
            s.set_dnd(duration_minutes);
            tray_payload = Some(s.to_tray_payload());
            app_payload = Some(s.to_app_payload());
        };
    }

    if let (Some(tp), Some(ap)) = (tray_payload, app_payload) {
        let _ = app.emit("app-state-changed", &ap);
        let _ = app.emit("tray-state-changed", &tp);
    }

    update_tray_visuals(app);

    if let Some(minutes) = duration_minutes {
        spawn_dnd_revert_timer(app, minutes);
    }
}

pub fn spawn_dnd_revert_timer(app: &AppHandle, duration_minutes: u64) {
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(duration_minutes * 60)).await;
        let mut was_dnd = false;
        let mut app_payload = None;
        let mut tray_payload = None;
        {
            let state = app_clone.state::<Mutex<AppState>>();
            if let Ok(mut s) = state.lock() {
                // Only cancel if still marked in DND AND the active DND duration has expired
                if s.is_dnd && !s.is_dnd_active() {
                    s.cancel_dnd();
                    was_dnd = true;
                    app_payload = Some(s.to_app_payload());
                    tray_payload = Some(s.to_tray_payload());
                }
            };
        }

        if was_dnd {
            if let Some(ap) = app_payload {
                let _ = app_clone.emit("app-state-changed", &ap);
            }
            if let Some(tp) = tray_payload {
                let _ = app_clone.emit("tray-state-changed", &tp);
            }
            update_tray_visuals(&app_clone);
        }
    });
}
