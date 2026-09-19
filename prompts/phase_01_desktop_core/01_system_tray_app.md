# 1.1 System Tray App

## Context

<context>
This step implements the Tauri 2.0 system tray functionality — the foundation of the desktop experience. Posture Check! runs as a background app that lives in the system tray. The system tray icon shows the app's current state, and the context menu provides quick access to core actions. The main window opens on left-click and closes back to the tray (it doesn't quit the app). This implements Feature 3.1 (System Tray Background App) from the project spec.
</context>

## Prerequisites

<prerequisites>
- Phase 0 is complete (Tauri app scaffolded and running)
- Tauri system tray plugin configured in `src-tauri/Cargo.toml` and `tauri.conf.json`
- Ribbit icon assets created (from Step 0.6)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Implement the system tray manager in Rust**
   - Create `src-tauri/src/tray.rs` module
   - Set up the system tray with the Ribbit frog icon (active state)
   - Configure three tray icon variants:
     - Active: 🐸 green frog face (default) — `icon-active.png`
     - Paused/DND: 😴 sleeping frog — `icon-paused.png`
     - Alert: ⏰ frog with indicator — `icon-alert.png`
   - Set tooltip text: "Posture Check! — Next reminder in X:XX"
   - Update tooltip dynamically as the timer counts down

2. **Create the tray context menu**
   - Right-click on tray icon opens a context menu with these items:
     - "⏸ Pause Reminders" / "▶ Resume Reminders" — toggles pause state
     - "🔕 Do Not Disturb" — toggles DND mode (submenu with duration: 30 min, 1 hr, 2 hr, Until I turn it off)
     - Separator
     - "📊 Open Dashboard" — shows the main window
     - "⚙ Settings" — shows the main window on the Settings tab
     - Separator
     - "❌ Quit Posture Check!" — exits the application completely
   - Menu items update dynamically (e.g., Pause ↔ Resume based on state)

3. **Implement window show/hide behavior**
   - Left-click on tray icon: toggle window visibility (show if hidden, hide if visible)
   - Clicking the window close button (X): hide the window to tray, do NOT quit the app
   - "Open Dashboard" menu item: show and focus the window
   - When window is shown, it appears centered on the primary monitor
   - Window remembers its last position and size between show/hide cycles

4. **Set up app lifecycle management**
   - App starts minimized to tray (no visible window on launch)
   - Optional: launch on system startup (configurable, default: off)
   - On startup, restore last known state (active/paused) from SQLite (Step 1.4)
   - Graceful shutdown: save state to SQLite before quitting
   - Crash recovery: if the app crashes, auto-restart with last settings (use OS-level restart if available)

5. **Create the Tauri commands for tray state**
   - `get_tray_state` → returns `{ isActive: boolean, isDnd: boolean, nextReminderAt: string | null }`
   - `toggle_pause` → toggles active/paused state, returns new state
   - `set_dnd` → sets DND with optional duration (null = until manually turned off)
   - `cancel_dnd` → cancels DND mode
   - These commands are called from the React frontend

6. **Create the frontend tray state hook**
   - `apps/desktop/src/hooks/useTrayState.ts`
   - Uses Tauri event listeners to react to tray state changes
   - Provides reactive state: `isActive`, `isDnd`, `nextReminderAt`
   - Provides actions: `togglePause()`, `setDnd(duration)`, `cancelDnd()`
</instructions>

<requirements>
### Functional Requirements
- App starts and immediately appears in the system tray with no visible window
- Left-clicking the tray icon toggles the main window
- Right-clicking shows the context menu with all listed items
- Pausing reminders changes the tray icon to the sleeping variant
- DND mode changes the tray icon and suppresses all notifications for the set duration
- Closing the window (X button) hides it to tray — does NOT quit the app
- "Quit" in the context menu fully exits the application
- Tooltip shows "Next reminder in X:XX" and updates dynamically

### Technical Requirements
- Tauri 2.0 system tray API (not v1)
- Tray icon must be at least 32×32 pixels for Retina/HiDPI displays
- Context menu items must update dynamically (Pause ↔ Resume label swap)
- Window position/size persisted between show/hide cycles
- All tray state exposed to React via Tauri commands and events

### File Naming Conventions
- Rust modules: snake_case (`tray.rs`, `app_state.rs`)
- React hooks: camelCase with `use` prefix (`useTrayState.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/src/tray.rs` — System tray manager (Rust)
2. `apps/desktop/src-tauri/src/state.rs` — App state manager (Rust)
3. `apps/desktop/src-tauri/src/main.rs` — MODIFIED: register tray and state modules
4. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add tray commands
5. `apps/desktop/src/hooks/useTrayState.ts` — React hook for tray state
6. `apps/desktop/src/stores/appStore.ts` — Zustand store for app-wide state
</output_files>

## Directory Structure

After completing this step, the project should have:

```
apps/desktop/
├── src/
│   ├── hooks/
│   │   └── useTrayState.ts        ← NEW
│   └── stores/
│       └── appStore.ts            ← NEW
└── src-tauri/
    └── src/
        ├── main.rs                ← MODIFIED
        ├── lib.rs                 ← MODIFIED
        ├── tray.rs                ← NEW
        └── state.rs               ← NEW
```

## Verification

<verification>
After completing this step, confirm:

- [ ] App launches with no visible window — only a tray icon appears
- [ ] Left-clicking the tray icon shows the main window
- [ ] Left-clicking again hides the window
- [ ] Right-clicking shows context menu with Pause, DND, Dashboard, Settings, Quit
- [ ] Clicking "Pause" changes menu text to "Resume" and changes the tray icon
- [ ] Clicking "Quit" fully exits the application (process gone from Task Manager)
- [ ] Clicking the window close button (X) hides the window, NOT quits the app
- [ ] DND submenu shows duration options and activates DND mode
- [ ] Tooltip shows "Posture Check! — Active" or similar status text
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Tray icon not visible | Icon file path incorrect or icon format unsupported | Ensure PNG icons are in `src-tauri/icons/` and referenced correctly in tray setup |
| Context menu doesn't appear on right-click | Event handler not registered | Verify `on_tray_icon_event` handler is set in the Tauri builder |
| Window doesn't hide on close | Missing `on_window_event` handler for `CloseRequested` | Handle `CloseRequested` event: call `window.hide()` instead of closing |
| Tray icon disappears on system tray overflow (Windows) | Icon not pinned | Document for users: right-click taskbar → Taskbar Settings → turn on Posture Check! |
| DND timer doesn't auto-cancel | Duration countdown not implemented | Use `tokio::time::sleep` in Rust for timed DND cancellation |

---

**Next**: [1.2 — Timer Engine](./02_timer_engine.md)
