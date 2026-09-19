# Phase 6 Completion Checklist

## All Steps Completed

- [ ] 6.1 - Edge Function Push Relay (Supabase → Expo Push API)
- [ ] 6.2 - Routing Toggle UI (PC Only / Phone Only / Both)
- [ ] 6.3 - QR Code Pairing Finalization (direct push for no-account users)

## Verification Tests

```bash
supabase functions serve push-notification-relay  # Expected: function starts
pnpm turbo run type-check                          # Expected: all pass
```

## Functional Tests

- [ ] Signed-in user: PC timer → Edge Function → phone push (< 3 seconds)
- [ ] QR-paired user: PC timer → direct Expo Push → phone push (< 3 seconds)
- [ ] "Both" mode: PC notification + phone push simultaneously
- [ ] Phone offline fallback: PC notification + warning toast
- [ ] Rate limiting: 101st push in a day returns error
- [ ] "Phone Friend" achievement unlocks on first routing setup

## Rollback Plan

If this phase breaks something:
1. Edge Function issues: check logs with `supabase functions logs push-notification-relay`
2. Push delivery issues: check Expo Push receipt status
3. Routing issues: set routing back to "PC Only" in settings

---

**Proceed to**: [Phase 7: Polish & Launch](../phase_07_polish_launch/00_PHASE_OVERVIEW.md)
