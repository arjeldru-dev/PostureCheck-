# 6.3 QR Code Pairing Finalization

## Context

<context>
This step finalizes the QR code pairing flow for users who don't have an account. The basic pairing mechanism was built in Step 5.6; this step adds the routing functionality on top of it — enabling push notification relay for QR-paired (no-account) devices. For QR-paired devices without an account, the desktop must send push notifications directly via Expo Push (not through the Edge Function, which requires auth). This ensures the "Send to Phone" feature works for all users, not just signed-in ones.
</context>

## Prerequisites

<prerequisites>
- Steps 6.1–6.2 complete (Edge Function and routing UI working for signed-in users)
- QR pairing functional (from Step 5.6)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Implement direct push for QR-paired devices**
   - For users without an account (QR-paired only):
     - Desktop stores the phone's Expo push token locally (from QR pairing)
     - When routing to phone: desktop calls Expo Push API directly (not via Edge Function)
     - This requires the Expo Push API to be called from the Tauri Rust backend
   - Create `apps/desktop/src-tauri/src/push.rs`:
     - `send_push_notification(token, title, body, data)` — calls Expo Push API via HTTP

2. **Update the routing logic to handle both methods**
   - If user is signed in with paired devices: use Edge Function relay
   - If user is QR-paired without account: use direct Expo Push from desktop
   - Routing selector UI should work identically in both cases
   - The user doesn't need to know which method is being used

3. **Handle QR-paired device reconnection**
   - QR pairing is session-based (expires when either device restarts)
   - On desktop startup: check if QR-paired device is still reachable
   - If not reachable: show "Re-pair your phone" prompt in Settings
   - Re-pairing is quick (just scan again)

4. **Unlock the "Phone Friend" achievement**
   - When any form of PC-to-phone routing is set up:
     - Check and unlock the "Phone Friend" achievement (+25 XP)
     - Works for both account-based and QR-based pairing
</instructions>

<requirements>
### Functional Requirements
- Phone-only routing works for QR-paired devices (no account needed)
- Direct push via Expo Push API from the desktop Rust backend
- Routing UI identical for signed-in and QR-paired users
- "Phone Friend" achievement unlocks on first routing setup

### Technical Requirements
- HTTP client in Rust (reqwest or ureq crate) for Expo Push API calls
- Expo Push token stored in local SQLite (not Supabase) for QR-paired devices
- Fallback to PC if direct push fails

### File Naming Conventions
- Rust modules: snake_case (`push.rs`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/src/push.rs` — Direct Expo Push API client
2. `apps/desktop/src-tauri/src/timer.rs` — MODIFIED: route via direct push for QR-paired devices
3. `apps/desktop/src/stores/gamificationStore.ts` — MODIFIED: trigger Phone Friend achievement
</output_files>

## Verification

<verification>
- [ ] QR-paired device (no account) receives push when routing mode is "Phone Only"
- [ ] Direct push arrives within 3 seconds
- [ ] Setting up phone routing for the first time unlocks "Phone Friend" achievement
- [ ] QR pairing session survives app minimization
- [ ] Re-pairing after restart works by scanning a new QR code
</verification>

---

**Previous**: [6.2 — Routing Toggle UI](./02_routing_toggle_ui.md)

---

**Proceed to Phase Checklist**: [Phase 6 Checklist](./99_PHASE_CHECKLIST.md)
