# Phase 6: PC-to-Phone Routing

> **Objective**: Implement the PC-to-phone notification routing system — when the desktop timer fires, optionally send the notification to the phone instead of (or in addition to) the PC using Supabase Edge Functions and Expo Push.
> **Duration**: 1–2 weeks
> **Dependencies**: Phase 5 (Mobile Companion App) must be complete

---

## Phase Goals

1. ✅ Supabase Edge Function receives notification payloads and relays to phone via Expo Push
2. ✅ Desktop routing toggle (PC Only / Phone Only / Both) with per-profile support
3. ✅ Fallback logic: if phone is unreachable, fall back to PC notification
4. ✅ Latency target: phone notification arrives within 3 seconds of timer fire

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 6.1 | [01_edge_function_push_relay.md](01_edge_function_push_relay.md) | Supabase Edge Function for push notification relay |
| 6.2 | [02_routing_toggle_ui.md](02_routing_toggle_ui.md) | Desktop UI for routing mode selection |
| 6.3 | [03_qr_code_pairing.md](03_qr_code_pairing.md) | Finalize QR pairing fallback for no-account routing |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `frontend-dev` — Frontend patterns for routing toggle UI and device management

## Exit Criteria

- [ ] Desktop timer fires with "Phone Only" → push notification arrives on phone within 3 seconds
- [ ] Desktop timer fires with "Both" → both PC notification and phone push arrive
- [ ] Phone offline → desktop falls back to local PC notification
- [ ] Routing preference persists and syncs across sessions

---

**Next Phase**: [Phase 7: Polish & Launch](../phase_07_polish_launch/00_PHASE_OVERVIEW.md)
