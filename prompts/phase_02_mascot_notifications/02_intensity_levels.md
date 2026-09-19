# 2.2 Intensity Levels 4–5

## Context

<context>
This step implements the two most aggressive notification levels — Level 4 (Alert) and Level 5 (Wake Up!). Unlike Levels 1–3 which use native OS notifications, these levels use custom Tauri windows that overlay the screen. Level 4 is a large overlay that repeats an alarm sound every 30 seconds. Level 5 is a fullscreen overlay that blocks all interaction until acknowledged. Level 5 requires explicit user opt-in with a confirmation dialog. This completes Feature 3.3 (Notification Intensity System) from the project spec.
</context>

## Prerequisites

<prerequisites>
- Step 2.1 (Ribbit Character Integration) is complete
- Ribbit "reminding" SVG asset available
- Notification system (L1–L3) functional from Phase 1
- Audio playback capability via Tauri or web audio API
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the Level 4 (Alert) overlay window**
   - Create a new Tauri window for the overlay notification:
     - Size: 500×300 pixels, centered on primary monitor
     - Always on top of other windows
     - No title bar, no resize, no minimize — just the notification content
     - Semi-transparent dark background behind the window (scrim effect if possible)
   - Content:
     - Large Ribbit (reminding state, ~120px) on the left
     - Title: "⏰ Posture Check!" in Outfit Bold, 24px
     - Message: randomized Ribbit message in Inter, 16px
     - Two large buttons: "✓ I'm sitting up!" (green, primary) and "💤 Snooze 5 min" (gray, secondary)
     - Pulsing border animation (frog-green glow)
   - Behavior:
     - Alarm sound plays on open
     - Sound repeats every 30 seconds until acknowledged
     - Window stays on top — cannot be minimized or hidden behind other windows
     - Clicking outside the window does nothing (window retains focus)

2. **Create the Level 5 (Wake Up!) fullscreen overlay**
   - Create a fullscreen Tauri window:
     - Covers the entire primary monitor
     - Dark semi-transparent background (80% opacity black overlay)
     - Centered notification card (600×400px) with rounded corners
   - Content:
     - Extra-large Ribbit (celebrating/panicking pose, ~200px) centered
     - Title: "🚨 POSTURE CHECK! 🚨" in Outfit Bold, 32px, coral-alert color
     - Message: urgent Ribbit message in Inter, 18px
     - Single large button: "✓ I'm sitting up! Let me get back to work!" (full-width green button)
     - XP reminder: "You'll earn +10 XP for checking in!"
   - Behavior:
     - Loud alarm sound plays on open
     - Sound loops continuously until acknowledged
     - Blocks all mouse interaction outside the notification card
     - Cannot be closed with Alt+F4 or Task Manager (best effort — document limitations)
     - Must be acknowledged by clicking the button

3. **Implement Level 5 opt-in confirmation**
   - When user selects Level 5 in settings:
     - Show a confirmation dialog: "Level 5 will block your entire screen until you acknowledge the reminder. This is the nuclear option. Are you sure?"
     - Require explicit "Yes, block my screen" confirmation
     - If during a fullscreen game/presentation, note the potential interruption
   - Store opt-in preference in SQLite settings

4. **Implement the alarm sound system**
   - Create `apps/desktop/src-tauri/src/audio.rs` for Rust-side audio (or use web audio from the frontend)
   - Sound assets:
     - Level 4: medium alarm sound (2-second clip, not annoying but attention-getting)
     - Level 5: loud alarm sound (3-second clip, urgent)
   - Sound plays through the system's default audio output
   - Volume follows system volume settings (no separate volume control for MVP)
   - Sound stops immediately when the notification is acknowledged

5. **Update the notification manager to route levels correctly**
   - Modify `src-tauri/src/notifications.rs`:
     - Levels 1–3: continue using native OS notifications (from Phase 1)
     - Level 4: create the overlay window
     - Level 5: create the fullscreen window (only if opted in, else fall back to Level 4)
   - Add a `close_overlay()` command to dismiss overlay windows from the frontend

6. **Handle overlay edge cases**
   - Level 4/5 during a fullscreen game: overlay appears on top (may pull focus from the game)
   - Level 4/5 during screen share: document that these will be visible to others (suggest DND or phone routing)
   - Multiple monitors: overlay appears on the primary monitor only
   - If user has Level 5 active and hits Alt+Tab: window re-focuses after 2 seconds
</instructions>

<requirements>
### Functional Requirements
- Level 4: large overlay window with alarm sound repeating every 30s, stays until acknowledged
- Level 5: fullscreen overlay blocking all interaction, loud alarm, requires button click to dismiss
- Level 5 requires explicit opt-in confirmation
- Alarm sounds play through default system audio device
- Sounds stop immediately on acknowledgment
- Overlay windows are always-on-top and cannot be minimized
- Both levels include Ribbit mascot and randomized messages

### Technical Requirements
- Tauri window API for creating overlay/fullscreen windows
- Windows: use `set_always_on_top(true)` and `set_decorations(false)`
- Audio: either Rust-side (rodio crate) or web-side (Web Audio API)
- Sound files embedded as app assets (WAV or OGG format)
- Overlay window is a separate Tauri window with its own HTML entry point

### File Naming Conventions
- Rust modules: snake_case (`audio.rs`)
- Overlay pages: PascalCase (`NotificationOverlay.tsx`)
- Sound assets: kebab-case (`alarm-level4.wav`, `alarm-level5.wav`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/src/audio.rs` — Audio playback manager (Rust)
2. `apps/desktop/src/pages/NotificationOverlay.tsx` — Level 4 overlay window content
3. `apps/desktop/src/pages/NotificationFullscreen.tsx` — Level 5 fullscreen overlay content
4. `apps/desktop/src-tauri/src/notifications.rs` — MODIFIED: route L4/L5 to overlay windows
5. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add overlay commands
6. `apps/desktop/src-tauri/tauri.conf.json` — MODIFIED: add overlay/fullscreen window configs
7. `apps/desktop/src/assets/sounds/alarm-level4.wav` — Level 4 alarm sound
8. `apps/desktop/src/assets/sounds/alarm-level5.wav` — Level 5 alarm sound
</output_files>

## Verification

<verification>
- [ ] `test_notification(4)` opens a large overlay window with Ribbit, alarm sound plays
- [ ] Level 4 alarm repeats every 30 seconds until acknowledged
- [ ] Clicking "I'm sitting up!" on Level 4 dismisses the overlay and stops the sound
- [ ] Level 5 opt-in dialog appears when selecting Level 5 in settings
- [ ] After opt-in, `test_notification(5)` shows fullscreen overlay blocking the screen
- [ ] Level 5 cannot be dismissed with Alt+F4 or by clicking outside
- [ ] Level 5 alarm loops continuously until the button is clicked
- [ ] Overlay windows appear on the primary monitor only
- [ ] Sound stops immediately when any overlay is acknowledged
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Overlay window appears behind other windows | `set_always_on_top` not applied | Apply the flag after window creation, not during; some platforms need a delay |
| Sound doesn't play | Audio device not found or file not bundled | Embed audio files in `src-tauri/resources/` and use Tauri resource path API |
| Fullscreen overlay doesn't cover entire screen | Wrong monitor dimensions or DPI scaling | Use Tauri's monitor API to get actual screen size including DPI scale factor |
| Level 5 can be bypassed with Alt+Tab | OS-level keyboard shortcut can't be blocked | Document limitation; re-focus the window after 2-second delay using a timer |
| Multiple overlay windows open | New notification before previous dismissed | Close existing overlay before opening a new one |

---

**Previous**: [2.1 — Ribbit Character Integration](./01_ribbit_character_integration.md) | **Next**: [2.3 — Notification UI](./03_notification_ui.md)
