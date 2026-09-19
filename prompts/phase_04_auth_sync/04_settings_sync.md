# 4.4 Settings Sync

## Context

<context>
This step enables real-time settings synchronization between paired devices using Supabase Realtime. When a user changes a setting on their PC, the change should propagate to their phone (and vice versa) within seconds. This uses Supabase's Realtime subscriptions to listen for database changes and apply them locally. This completes the cross-device experience that makes the account system valuable.
</context>

## Prerequisites

<prerequisites>
- Steps 4.1–4.3 complete (auth, schema, sync engine working)
- Supabase Realtime enabled on the project
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Set up Supabase Realtime subscriptions**
   - `apps/desktop/src/lib/realtime.ts`:
     - Subscribe to changes on `posture_settings` for the current user
     - Subscribe to changes on `devices` for the current user
     - When a change is received:
       1. Compare with local version
       2. If cloud version is newer: update SQLite + update Zustand store
       3. If local version is newer: ignore (our push will overwrite)
     - Handle subscription lifecycle: subscribe on sign-in, unsubscribe on sign-out

2. **Implement real-time settings push**
   - When a setting changes locally:
     1. Update SQLite immediately
     2. Update Supabase immediately (don't wait for periodic sync)
     3. The Realtime subscription on the other device picks it up
   - Settings that sync in real-time:
     - Interval, intensity, active hours, active days
     - DND state
     - Routing mode (PC only / Phone only / Both)
     - Quick Profile switches

3. **Create device registration and discovery**
   - On app start (if signed in):
     - Register this device in the `devices` table (upsert by device ID)
     - Set `is_active = true` and `last_seen_at = now()`
     - Heartbeat: update `last_seen_at` every 5 minutes
   - List paired devices: show all devices for this user in settings
   - Device naming: auto-detect device name (e.g., "DESKTOP-ABC" on Windows, "iPhone" on mobile)

4. **Create the device management UI**
   - Update Settings > Devices tab (add a new tab or expand Account):
     - List of paired devices with: name, platform icon, last seen time, active/inactive status
     - "This Device" indicator on the current device
     - "Remove Device" button for each device (removes from the list, revokes sync)
     - Device count: "2 devices connected"

5. **Handle Realtime edge cases**
   - Connection lost: show "⚠️ Real-time sync paused" indicator
   - Connection restored: re-subscribe and pull latest changes
   - User signed in on 3+ devices: all devices receive updates
   - Rapid changes (user sliding a slider): debounce Supabase updates (500ms)
</instructions>

<requirements>
### Functional Requirements
- Setting change on PC appears on phone within 5 seconds
- Device list shows all paired devices with status
- DND toggled on PC reflects on phone immediately
- Removing a device from the list stops sync for that device
- Connection status indicator shows real-time sync health

### Technical Requirements
- Supabase Realtime subscriptions (WebSocket-based)
- Debounce rapid changes (500ms) to avoid excessive database writes
- Subscription cleanup on sign-out (no leaked subscriptions)
- Heartbeat every 5 minutes to keep device status current

### File Naming Conventions
- Realtime utilities: kebab-case (`realtime.ts`)
- Components: PascalCase (`DeviceList.tsx`, `SyncStatus.tsx`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/lib/realtime.ts` — Supabase Realtime subscription manager
2. `apps/desktop/src/lib/device-manager.ts` — Device registration and discovery
3. `apps/desktop/src/components/settings/DeviceList.tsx` — Paired device management UI
4. `apps/desktop/src/stores/settingsStore.ts` — MODIFIED: integrate real-time sync
5. `apps/desktop/src/stores/authStore.ts` — MODIFIED: subscribe/unsubscribe on auth change
</output_files>

## Verification

<verification>
- [ ] Changing interval on desktop → interval updates in Supabase within 1 second
- [ ] Toggling DND on desktop → DND state appears in Supabase immediately
- [ ] Device list shows the current desktop device with "This Device" indicator
- [ ] Removing a device from the list removes it from the `devices` table
- [ ] Connection loss shows warning indicator; reconnection resumes sync
- [ ] Rapid slider changes are debounced (only 1 DB write per 500ms)
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Real-time updates not received | Realtime not enabled on the table | Enable Realtime in Supabase Studio > Table > Realtime toggle |
| Subscription drops after 60 seconds | WebSocket idle timeout | Implement heartbeat/keepalive pings |
| Rapid changes cause rate limiting | No debounce on Supabase writes | Add 500ms debounce to settings update function |
| Device shows as inactive | Heartbeat not running | Schedule heartbeat update every 5 minutes using `setInterval` |

---

**Previous**: [4.3 — Offline-First Sync](./03_offline_first_sync.md)

---

**Proceed to Phase Checklist**: [Phase 4 Checklist](./99_PHASE_CHECKLIST.md)
