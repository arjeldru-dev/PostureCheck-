# Phase 4: Auth & Cloud Sync

> **Objective**: Implement optional user authentication via Supabase (email, Google, Apple), create the PostgreSQL database schema with Row Level Security, build the offline-first sync engine, and enable settings/progress synchronization across devices.
> **Duration**: 2 weeks
> **Dependencies**: Phase 3 (Gamification Engine) must be complete

---

## Phase Goals

1. ✅ Optional sign-in with email/password, Google OAuth, and Apple Sign-In
2. ✅ PostgreSQL schema deployed to Supabase with RLS policies
3. ✅ Offline-first sync engine (SQLite ↔ Supabase) with conflict resolution
4. ✅ Settings and gamification progress sync across devices when signed in

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 4.1 | [01_supabase_auth.md](01_supabase_auth.md) | Auth flows: sign up, login, OAuth, session management |
| 4.2 | [02_database_schema_rls.md](02_database_schema_rls.md) | PostgreSQL schema, RLS policies, Drizzle ORM setup |
| 4.3 | [03_offline_first_sync.md](03_offline_first_sync.md) | SQLite ↔ Supabase sync engine with conflict resolution |
| 4.4 | [04_settings_sync.md](04_settings_sync.md) | Settings and device sync via Supabase Realtime |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `login-flow` — Authentication screen design patterns, social SSO buttons, loading/error states

## Exit Criteria

Before moving to Phase 5, verify:

- [ ] User can sign up with email/password and sign in
- [ ] Google OAuth works (redirects to Google, returns authenticated)
- [ ] Signing in merges local data with cloud (local wins on first sync)
- [ ] All tables have RLS policies (users can only access their own data)
- [ ] Signing out stops sync but preserves local data
- [ ] Changes made offline sync when connectivity is restored
- [ ] Settings changed on one device appear on another device within 5 seconds

---

**Next Phase**: [Phase 5: Mobile Companion App](../phase_05_mobile_app/00_PHASE_OVERVIEW.md)
