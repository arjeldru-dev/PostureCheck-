// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Register modules from desktop core lib
pub use posture_check_desktop_lib::notifications;
pub use posture_check_desktop_lib::timer;

fn main() {
    posture_check_desktop_lib::run();
}
