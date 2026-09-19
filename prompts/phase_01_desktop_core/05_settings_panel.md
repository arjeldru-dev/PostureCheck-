# 1.5 Settings Panel

## Context

<context>
This step builds the desktop Settings panel — the primary UI where users configure all reminder preferences. The settings panel is accessible from the tray context menu ("⚙ Settings") and from the main dashboard. It's organized into tabbed categories: Timing, Notifications, Schedule, DND, and General. All settings persist to SQLite (from Step 1.4) and update the timer engine in real time. This implements Feature 3.8 (Settings & Customization) from the project spec.
</context>

## Prerequisites

<prerequisites>
- Steps 1.1–1.4 are complete (system tray, timer, notifications, SQLite all functional)
- Design tokens established (from Step 0.5)
- Zustand stores for app state and timer state exist
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the Settings page layout**
   - `apps/desktop/src/pages/Settings.tsx`
   - Tabbed layout with vertical tabs on the left, content area on the right
   - Tabs: Timing, Notifications, Schedule, DND, General
   - Each tab renders a distinct settings section component
   - Responsive within the Tauri window (min width 600px)
   - Uses the PostureCheck design system (frog-green accents, Outfit headers, Inter body)

2. **Timing tab**
   - `apps/desktop/src/components/settings/TimingSettings.tsx`
   - Reminder interval slider: 5 min – 120 min (with preset buttons: 15, 30, 45, 60)
   - Visual indicator showing "You'll get a reminder every X minutes"
   - Active hours: start time picker and end time picker (default: 08:00–22:00)
   - Active days: 7 day-of-week toggle buttons (Mon–Sun), default: all selected
   - Changes apply immediately and update the timer engine via Tauri commands

3. **Notifications tab**
   - `apps/desktop/src/components/settings/NotificationSettings.tsx`
   - Intensity level selector: visual cards for each level (1–5) with icon, name, description
   - Preview: "Test Notification" button that sends a test notification at the selected level
   - Auto-escalation toggle: "Escalate if unacknowledged" with explanation text
   - Notification sound dropdown (for levels that support sound): System Default, Custom Chime, Silent
   - Per-device note: "These settings apply to your PC. Phone settings are configured in the mobile app."

4. **Schedule tab (Quick Profiles)**
   - `apps/desktop/src/components/settings/ScheduleSettings.tsx`
   - Profile management: create, edit, delete named profiles (e.g., "Work", "Gaming", "Chill")
   - Each profile stores: interval, intensity, active hours, routing mode
   - Active profile selector: dropdown or card-based switcher
   - Default profiles pre-created: "Default" (30 min, L2), "Work" (45 min, L2), "Gaming" (30 min, L3, phone routing)

5. **DND tab**
   - `apps/desktop/src/components/settings/DndSettings.tsx`
   - DND toggle: large toggle button with current status indicator
   - Quick DND durations: 30 min, 1 hr, 2 hr, "Until I turn it off"
   - Scheduled DND: set recurring DND windows (e.g., every day 12:00–13:00 for lunch)
   - Auto-DND: toggle for "Auto-enable DND during fullscreen apps" (placeholder — implementation is a V1.1 feature, note this in the UI)

6. **General tab**
   - `apps/desktop/src/components/settings/GeneralSettings.tsx`
   - Launch on startup toggle
   - Theme: Light / Dark / System selector with preview
   - Mascot message tone: Encouraging / Sassy / Minimal (changes Ribbit's message pool)
   - Data management: "Export Data as JSON" button, "Clear History" with confirmation dialog
   - About section: version number, links to GitHub repo

7. **Create the settings Zustand store**
   - `apps/desktop/src/stores/settingsStore.ts`
   - Loads initial state from SQLite on app start
   - Persists changes to SQLite on every update
   - Synchronizes changes to the Rust timer engine via Tauri commands
   - Handles optimistic updates (UI updates immediately, DB write is async)

8. **Wire settings to the timer and notification systems**
   - When interval changes → call `set_timer_interval` command
   - When intensity changes → call `set_intensity_level` command
   - When active hours change → call `set_active_hours` command
   - When DND toggles → call `set_dnd` / `cancel_dnd` commands
   - All changes take effect immediately (no "Save" button needed)
</instructions>

<requirements>
### Functional Requirements
- All settings from spec Section 3.8 are configurable via the UI
- Changes apply immediately — no "Save" button, settings auto-save
- Settings persist across app restarts (via SQLite)
- Test notification button sends a real notification at the selected level
- Quick Profiles allow switching entire configurations with one click
- DND can be set for a duration or indefinitely
- Theme switching works in real time (light/dark/system)
- Data export produces a valid JSON file with all posture check history

### Technical Requirements
- All settings components use the PostureCheck design system
- Form inputs are accessible (keyboard navigation, aria labels, focus indicators)
- Settings store uses Zustand with SQLite persistence
- Tauri commands are called for any setting that affects the Rust backend
- Optimistic UI updates (don't wait for SQLite write to update the UI)
- All numeric inputs validated against spec ranges (interval: 5–120, intensity: 1–5)

### File Naming Conventions
- Page components: PascalCase (`Settings.tsx`)
- Settings sections: PascalCase with suffix (`TimingSettings.tsx`, `DndSettings.tsx`)
- Stores: camelCase (`settingsStore.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/pages/Settings.tsx` — Settings page with tabbed layout
2. `apps/desktop/src/components/settings/TimingSettings.tsx` — Timing configuration
3. `apps/desktop/src/components/settings/NotificationSettings.tsx` — Notification intensity configuration
4. `apps/desktop/src/components/settings/ScheduleSettings.tsx` — Quick Profiles management
5. `apps/desktop/src/components/settings/DndSettings.tsx` — Do Not Disturb configuration
6. `apps/desktop/src/components/settings/GeneralSettings.tsx` — General preferences
7. `apps/desktop/src/stores/settingsStore.ts` — Settings state management with SQLite persistence
8. `apps/desktop/src/App.tsx` — MODIFIED: add routing to Settings page
</output_files>

## Directory Structure

After completing this step, the project should have:

```
apps/desktop/src/
├── pages/
│   ├── Settings.tsx                  ← NEW
│   └── DesignSystem.tsx             ← from Step 0.5
├── components/
│   ├── settings/
│   │   ├── TimingSettings.tsx        ← NEW
│   │   ├── NotificationSettings.tsx  ← NEW
│   │   ├── ScheduleSettings.tsx      ← NEW
│   │   ├── DndSettings.tsx           ← NEW
│   │   └── GeneralSettings.tsx       ← NEW
│   └── ribbit/
│       └── RibbitMascot.tsx          ← from Step 0.6
└── stores/
    ├── appStore.ts                   ← from Step 1.1
    ├── timerStore.ts                 ← from Step 1.2
    └── settingsStore.ts              ← NEW
```

## Verification

<verification>
After completing this step, confirm:

- [ ] Settings panel opens from tray menu "⚙ Settings"
- [ ] All 5 tabs render with their respective controls
- [ ] Changing the interval slider updates the timer engine (verify with `get_timer_state()`)
- [ ] Changing intensity level and clicking "Test Notification" sends the correct notification type
- [ ] Creating a Quick Profile saves it; switching profiles applies all settings
- [ ] DND toggle activates DND mode (tray icon changes, timer pauses)
- [ ] Theme toggle switches between light/dark/system correctly
- [ ] Launch on startup toggle works (verify the app appears in system startup programs)
- [ ] All settings persist after restarting the app
- [ ] Export Data produces a downloadable JSON file with posture check history
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Settings don't persist after restart | Zustand store not loading from SQLite on init | Ensure `settingsStore` calls `get_settings()` in its initializer |
| Timer doesn't update when interval changes | Tauri command not called after store update | Add a Zustand `subscribe` that calls `set_timer_interval` when `interval_minutes` changes |
| Theme flickers between light/dark on page change | CSS transition not applied to theme switch | Use `transition: background-color 200ms` on root elements |
| Test notification doesn't fire | Notification permission not granted | Check OS notification permissions, show a warning if disabled |
| Quick Profiles don't switch correctly | Active profile flag not updated in SQLite | Ensure `is_active_profile` is set to 0 for all profiles before setting the new one to 1 |

---

**Previous**: [1.4 — SQLite Local Storage](./04_sqlite_local_storage.md)

---

**Proceed to Phase Checklist**: [Phase 1 Checklist](./99_PHASE_CHECKLIST.md)
