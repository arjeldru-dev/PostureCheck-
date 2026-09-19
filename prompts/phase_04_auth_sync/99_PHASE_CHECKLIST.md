# Phase 4 Completion Checklist

## All Steps Completed

- [ ] 4.1 - Supabase Auth (sign up, sign in, OAuth, session management)
- [ ] 4.2 - Database Schema & RLS (PostgreSQL tables, policies, Drizzle ORM)
- [ ] 4.3 - Offline-First Sync (SQLite ↔ Supabase merge, push, pull)
- [ ] 4.4 - Settings Sync (real-time via Supabase Realtime, device management)

## Verification Tests

```bash
pnpm turbo run type-check      # Expected: all workspaces pass
supabase db reset               # Expected: migrations apply cleanly
```

## Security Tests

- [ ] RLS: authenticated user can read their own posture_checks
- [ ] RLS: authenticated user CANNOT read another user's posture_checks
- [ ] RLS: unauthenticated request to any table returns empty/error
- [ ] Auth: invalid password returns proper error (not 500)
- [ ] Auth: session expires after 7 days without refresh

## Functional Tests

- [ ] Sign up → sign in → data syncs to cloud
- [ ] Sign out → local data preserved, sync stops
- [ ] Go offline → changes saved locally → go online → changes sync
- [ ] Settings change → appears in Supabase within seconds
- [ ] Device list shows all registered devices
- [ ] Account deletion request sent successfully

## Rollback Plan

If this phase breaks something:
1. Auth issues: check Supabase Dashboard > Authentication > Users
2. Schema issues: `supabase db reset` resets the entire database
3. Sync issues: clear `last_sync_at` from SQLite to force a full re-sync
4. Realtime issues: verify table has Realtime enabled in Supabase Dashboard

---

**Proceed to**: [Phase 5: Mobile Companion App](../phase_05_mobile_app/00_PHASE_OVERVIEW.md)
