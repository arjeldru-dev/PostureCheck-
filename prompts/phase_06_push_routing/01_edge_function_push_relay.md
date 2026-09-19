# 6.1 Edge Function Push Relay

## Context

<context>
This step implements the Supabase Edge Function that receives notification payloads from the desktop app and relays them to the user's phone via Expo Push API. This is the server-side bridge that enables PC-to-phone routing — the core feature for gamers and presenters who don't want notifications on their screen. The flow: Desktop timer fires → Rust calls Edge Function → Edge Function sends push via Expo → Phone receives notification.
</context>

## Prerequisites

<prerequisites>
- Phase 5 complete (mobile push token registered in Supabase)
- Edge Function directory exists (from Step 0.4)
- Expo Push API available (free, unlimited notifications)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Implement the push relay Edge Function**
   - `supabase/functions/push-notification-relay/index.ts`:
     - Receives POST request with:
       - `userId`: UUID of the authenticated user
       - `message`: Ribbit message text
       - `title`: notification title
       - `intensityLevel`: 1–5
       - `data`: additional data (posture check ID, XP value)
     - Validates JWT from the request header (authenticate the caller)
     - Looks up the user's mobile device push token from `devices` table
     - Sends push notification via Expo Push API (`https://exp.host/--/api/v2/push/send`)
     - Returns success/failure and Expo receipt ID

2. **Handle Expo Push API integration**
   - Send push notification with:
     - `to`: Expo push token
     - `title`: "Posture Check! 🐸"
     - `body`: Ribbit message
     - `sound`: "default" for L2+, none for L1
     - `data`: `{ checkId, intensityLevel, xpReward }`
     - `categoryId`: "posture-check" (for action buttons)
   - Handle Expo Push receipts: check delivery status after sending

3. **Add rate limiting**
   - Maximum 100 push notifications per user per day (prevent abuse)
   - Track count in a `push_notification_log` table or in-memory counter
   - Return 429 if limit exceeded

4. **Integrate with the desktop timer**
   - Modify `apps/desktop/src-tauri/src/timer.rs`:
     - When routing mode is "phone_only" or "both":
       1. Call the Edge Function with the notification payload
       2. If "phone_only": don't show desktop notification
       3. If "both": also show desktop notification
     - On Edge Function failure (network error, timeout):
       - Fall back to desktop notification
       - Show warning: "⚠️ Couldn't reach phone, showing on PC instead"

5. **Create the Edge Function deployment config**
   - `supabase/functions/push-notification-relay/deno.json` — Deno configuration
   - Document the deployment command: `supabase functions deploy push-notification-relay`
</instructions>

<requirements>
### Functional Requirements
- Edge Function receives notification payload and sends push to phone
- Push notification arrives on phone within 3 seconds of timer fire
- Rate limit: 100 pushes per user per day
- Fallback to desktop notification if Edge Function fails
- JWT authentication required (no unauthenticated access)

### Technical Requirements
- Supabase Edge Functions (Deno runtime)
- Expo Push API v2
- JWT validation via Supabase auth helpers
- HTTPS only
- Error handling with proper HTTP status codes

### File Naming Conventions
- Edge Functions: folder per function, `index.ts` entry point
</requirements>

<output_files>
Generate the following files:

1. `supabase/functions/push-notification-relay/index.ts` — MODIFIED: full implementation
2. `supabase/functions/push-notification-relay/deno.json` — Deno config
3. `apps/desktop/src-tauri/src/timer.rs` — MODIFIED: add push routing logic
4. `apps/desktop/src/lib/push-relay.ts` — Frontend helper to call the Edge Function
</output_files>

## Verification

<verification>
- [ ] Edge Function deploys: `supabase functions deploy push-notification-relay`
- [ ] Calling the Edge Function with a valid JWT sends a push to the phone
- [ ] Push arrives on phone within 3 seconds
- [ ] Calling without JWT returns 401
- [ ] Calling 101 times returns 429 (rate limited)
- [ ] Edge Function down → desktop shows fallback notification + warning
</verification>

---

**Next**: [6.2 — Routing Toggle UI](./02_routing_toggle_ui.md)
