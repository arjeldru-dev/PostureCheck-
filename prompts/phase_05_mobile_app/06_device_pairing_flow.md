# 5.6 Device Pairing Flow

## Context

<context>
This step implements device pairing between the desktop PC and mobile phone. Two pairing methods: (1) account-based auto-discovery — sign in on both devices and they find each other automatically, and (2) QR code pairing — for users without an account, scan a QR code on the PC with the phone to pair via local network. Pairing enables PC-to-phone notification routing (fully implemented in Phase 6).
</context>

## Prerequisites

<prerequisites>
- Step 5.5 complete (push token registered in Supabase)
- Auth system functional on both desktop and mobile
- Device registration in Supabase `devices` table
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Account-based auto-discovery**
   - When signed in on both devices:
     - Both devices register in the `devices` table with user_id
     - Desktop queries `devices` for other devices with the same user_id
     - Mobile devices appear in the desktop's device list automatically
     - No manual pairing needed — it "just works"
   - Show in desktop Settings > Devices: "📱 Alex's iPhone — Connected"

2. **QR code pairing (no account)**
   - Desktop generates a QR code containing:
     - A pairing token (one-time use, expires in 5 minutes)
     - The desktop's local IP address and pairing port
   - Mobile scans the QR code using the camera
   - Mobile sends its push token to the desktop via local HTTP
   - Desktop stores the push token locally for direct push relay
   - This method only works on the same local network

3. **Create the QR code pairing UI**
   - Desktop: `apps/desktop/src/components/settings/QrPairing.tsx`
     - Displays a large QR code in the Settings > Devices section
     - Instructions: "Scan this QR code with your phone's Posture Check! app"
     - QR code refreshes every 5 minutes
     - Shows pairing status: "Waiting for scan..." → "Paired! ✅"
   - Mobile: `apps/mobile/app/pair.tsx`
     - Camera-based QR scanner screen
     - Accessed from Settings > "Pair with PC"
     - Shows result: "Paired with DESKTOP-ABC ✅"

4. **Create the pairing service**
   - `apps/desktop/src/lib/pairing-service.ts`:
     - Generates pairing tokens
     - Starts a temporary local HTTP server for receiving the push token
     - Stores paired device info in SQLite
   - `apps/mobile/lib/pairing-service.ts`:
     - Scans QR code and extracts pairing data
     - Sends push token to the desktop's local server
     - Stores paired device info in SQLite

5. **Handle pairing edge cases**
   - Account-based: user signs in on a third device → all devices discover each other
   - QR-based: expired token → show "Expired, please refresh" error
   - QR-based: different network → show "Devices must be on the same Wi-Fi network"
   - Unpair: remove device from list → stops routing to that device
</instructions>

<requirements>
### Functional Requirements
- Account-based pairing is automatic (zero clicks needed)
- QR code pairing works without an account on the same local network
- Paired devices appear in both desktop and mobile device lists
- Unpairing removes the device from routing

### Technical Requirements
- QR code generation: `qrcode` npm package on desktop
- QR code scanning: `expo-camera` with barcode scanning
- Local HTTP server: lightweight HTTP in Tauri (or use Tauri IPC)
- Pairing tokens: cryptographically random, single-use, 5-minute expiry

### File Naming Conventions
- Service files: kebab-case
- Components: PascalCase
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/components/settings/QrPairing.tsx` — QR code display
2. `apps/desktop/src/lib/pairing-service.ts` — Desktop pairing logic
3. `apps/mobile/app/pair.tsx` — QR scanner screen
4. `apps/mobile/lib/pairing-service.ts` — Mobile pairing logic
</output_files>

## Verification

<verification>
- [ ] Sign in on both devices → mobile appears in desktop device list
- [ ] Desktop generates QR code in Settings > Devices
- [ ] Mobile scans QR code → pairing confirmed on both devices
- [ ] Paired device shows in both desktop and mobile device lists
- [ ] Unpairing removes the device from the list
- [ ] Expired QR code shows refresh prompt
</verification>

---

**Previous**: [5.5 — Local Timer & Notifications](./05_local_timer_notifications.md)

---

**Proceed to Phase Checklist**: [Phase 5 Checklist](./99_PHASE_CHECKLIST.md)
