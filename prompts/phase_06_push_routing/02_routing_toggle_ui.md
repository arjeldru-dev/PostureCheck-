# 6.2 Routing Toggle UI

## Context

<context>
This step creates the desktop UI for controlling notification routing — where reminders are delivered (PC, phone, or both). The routing toggle is accessible from Settings and from the Quick Actions bar on the dashboard. Different routing modes can be saved per Quick Profile (e.g., "Gaming" = phone only, "Work" = PC only). This completes Feature 3.5 (PC-to-Phone Notification Routing).
</context>

## Prerequisites

<prerequisites>
- Step 6.1 (Edge Function) deployed and functional
- Device pairing complete (from Step 5.6)
- Settings panel exists with Quick Profiles (from Step 1.5)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the routing mode selector**
   - `apps/desktop/src/components/settings/RoutingSelector.tsx`:
     - Three mode cards (radio selection):
       - 🖥 **PC Only**: reminders show on your computer (default)
       - 📱 **Phone Only**: reminders go to your phone silently
       - 🖥📱 **Both**: reminders appear on both devices
     - Each card shows an icon, name, and brief description
     - Selected card has frog-green border highlight
     - "Phone Only" and "Both" show a warning if no phone is paired: "⚠️ Pair a phone first"

2. **Add routing to Quick Actions on the dashboard**
   - Add a routing quick-toggle to `QuickActions.tsx`:
     - Shows current routing mode icon
     - Tapping cycles through: PC → Phone → Both → PC
     - Tooltip shows current mode name
     - Only enabled if a phone is paired

3. **Integrate routing with Quick Profiles**
   - Each Quick Profile stores `routing_mode`
   - Switching to "Gaming" profile automatically sets routing to "Phone Only"
   - Switching to "Work" profile sets routing to "PC Only"

4. **Create the routing status indicator**
   - `apps/desktop/src/components/dashboard/RoutingIndicator.tsx`:
     - Small indicator on the dashboard showing where the next notification will go
     - "📱 Reminders going to your phone" or "🖥 Reminders showing on PC"
     - Animated icon showing the routing direction
     - Warning indicator if phone was last seen >5 minutes ago: "Phone may be offline"

5. **Handle routing failures gracefully**
   - If routing to phone fails:
     - Automatically fall back to PC notification
     - Show a toast: "Couldn't reach your phone — showing reminder here instead"
     - Log the failure in activity feed
   - If phone has notifications disabled at OS level:
     - Show persistent warning on desktop dashboard
     - "⚠️ Phone notifications are disabled. Enable them in your phone's Settings."
</instructions>

<requirements>
### Functional Requirements
- Three routing modes: PC Only, Phone Only, Both
- Routing preference saved per Quick Profile
- Quick toggle on dashboard for fast switching
- Fallback to PC on phone delivery failure
- Warning when no phone is paired or phone is unreachable

### Technical Requirements
- Routing mode stored in SQLite posture_settings and synced to Supabase
- Routing mode change triggers immediate reconfiguration of the timer
- Phone reachability checked via `last_seen_at` in devices table

### File Naming Conventions
- Components: PascalCase
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/components/settings/RoutingSelector.tsx` — Routing mode UI
2. `apps/desktop/src/components/dashboard/RoutingIndicator.tsx` — Current routing status
3. `apps/desktop/src/components/dashboard/QuickActions.tsx` — MODIFIED: add routing toggle
4. `apps/desktop/src/stores/settingsStore.ts` — MODIFIED: add routing mode state
</output_files>

## Verification

<verification>
- [ ] Selecting "Phone Only" → next timer fire sends push to phone (no PC notification)
- [ ] Selecting "Both" → both PC and phone get the notification
- [ ] Selecting "PC Only" → only PC notification (default behavior)
- [ ] Quick toggle cycles through modes with correct icons
- [ ] Switching to "Gaming" profile sets routing to phone
- [ ] No phone paired → "Phone Only" shows warning and is disabled
- [ ] Phone offline → fallback to PC with warning toast
</verification>

---

**Previous**: [6.1 — Edge Function Push Relay](./01_edge_function_push_relay.md) | **Next**: [6.3 — QR Code Pairing](./03_qr_code_pairing.md)
