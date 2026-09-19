# 4.2 Database Schema & RLS

## Context

<context>
This step creates the production PostgreSQL schema in Supabase and configures Row Level Security (RLS) policies to ensure users can only access their own data. The schema mirrors the SQLite schema from Step 1.4 but uses PostgreSQL-native types (TIMESTAMPTZ, UUID, ENUM). RLS is the primary security mechanism — it runs at the database level, preventing unauthorized access even if the API is compromised. This also sets up Drizzle ORM for type-safe database access from Edge Functions.
</context>

## Prerequisites

<prerequisites>
- Step 4.1 (Auth) complete — users can sign in
- Supabase project running (local and/or cloud)
- Supabase CLI installed for migrations
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the PostgreSQL migration**
   - `supabase/migrations/20240101000001_create_schema.sql`:
   - Create all tables matching the spec's data model (Section 4):
     - `users` (extends Supabase auth.users)
     - `devices`
     - `posture_settings`
     - `posture_checks`
     - `user_progress`
     - `achievements` (reference data)
     - `user_achievements`
   - Use PostgreSQL types: UUID, TIMESTAMPTZ, TEXT, INTEGER, BOOLEAN, custom ENUMs
   - Add indexes from the spec
   - Add `updated_at` triggers for auto-updating timestamps

2. **Create RLS policies for every table**
   - `supabase/migrations/20240101000002_rls_policies.sql`:
   - Enable RLS on ALL tables
   - Policy pattern: users can only SELECT, INSERT, UPDATE, DELETE their own rows
   - `users`: can read/update own profile
   - `devices`: can CRUD own devices (where `user_id = auth.uid()`)
   - `posture_settings`: can CRUD own settings
   - `posture_checks`: can CRUD own checks
   - `user_progress`: can read/update own progress
   - `user_achievements`: can read own, insert own (no delete — achievements are permanent)
   - `achievements`: SELECT for all authenticated users (reference table)

3. **Seed the achievements table**
   - `supabase/migrations/20240101000003_seed_achievements.sql`:
   - Insert all 10 achievements with their conditions and XP rewards

4. **Set up Drizzle ORM**
   - Create `packages/shared/src/db/schema.ts` with Drizzle schema definitions matching the PostgreSQL tables
   - Create `packages/shared/src/db/client.ts` for the Drizzle client factory
   - Generate TypeScript types from the Drizzle schema
   - This will be used by Edge Functions and potentially by the app for type-safe queries

5. **Generate TypeScript types from the database**
   - Run `supabase gen types typescript --local` to generate types
   - Place output in `packages/shared/src/types/database.ts` (replacing the stub from Step 0.4)
   - These types ensure all Supabase queries are type-safe

6. **Create database helper functions**
   - `packages/shared/src/db/queries.ts`:
     - `upsertUserProfile(userId, data)` — create or update user profile
     - `upsertDevice(device)` — register or update a device
     - `syncPostureChecks(userId, checks)` — batch upsert posture checks
     - `syncProgress(userId, progress)` — update user progress
     - `syncSettings(userId, settings)` — upsert settings
     - `getDevicesForUser(userId)` — list paired devices
     - These functions use the Supabase client and return typed results
</instructions>

<requirements>
### Functional Requirements
- All tables from the spec's data model exist in PostgreSQL
- RLS policies prevent users from accessing other users' data
- Achievements are seeded with all 10 badges
- Database types are auto-generated and match the schema exactly

### Technical Requirements
- PostgreSQL 15+ features (TIMESTAMPTZ, UUID gen, JSONB if needed)
- RLS enabled on every table with appropriate policies
- Indexes on frequently queried columns (user_id, fired_at, etc.)
- Drizzle ORM schema matches PostgreSQL schema exactly
- Auto-generated types via `supabase gen types`

### File Naming Conventions
- Migrations: timestamped `YYYYMMDDHHMMSS_description.sql`
- Schema files: kebab-case (`schema.ts`, `queries.ts`)
</requirements>

<output_files>
Generate the following files:

1. `supabase/migrations/20240101000001_create_schema.sql` — Full PostgreSQL schema
2. `supabase/migrations/20240101000002_rls_policies.sql` — RLS policies for all tables
3. `supabase/migrations/20240101000003_seed_achievements.sql` — Achievement seed data
4. `packages/shared/src/db/schema.ts` — Drizzle ORM schema definitions
5. `packages/shared/src/db/client.ts` — Drizzle client factory
6. `packages/shared/src/db/queries.ts` — Database helper functions
7. `packages/shared/src/types/database.ts` — MODIFIED: auto-generated types
</output_files>

## Verification

<verification>
- [ ] `supabase db reset` applies all migrations without errors
- [ ] All tables exist in Supabase Studio with correct columns and types
- [ ] RLS is enabled on all tables (verify in Supabase Studio → Authentication → Policies)
- [ ] Signed-in user can insert and read their own posture checks
- [ ] Signed-in user CANNOT read another user's posture checks (RLS blocks it)
- [ ] Achievements table has all 10 seeded records
- [ ] TypeScript types match the schema (no type errors when using Supabase client)
- [ ] `upsertUserProfile` creates a new profile on first call, updates on subsequent calls
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Migration fails with "relation already exists" | Running migrations on existing DB | Use `supabase db reset` to start fresh, or add `IF NOT EXISTS` |
| RLS blocks all requests | Policy not granting access to authenticated users | Verify `auth.uid()` is used correctly in policies, not `auth.id()` |
| Type generation fails | Schema has syntax errors | Fix migration SQL first, then regenerate types |
| Drizzle types don't match Supabase types | Schema definition mismatch | Ensure Drizzle schema mirrors the SQL exactly |

---

**Previous**: [4.1 — Supabase Auth](./01_supabase_auth.md) | **Next**: [4.3 — Offline-First Sync](./03_offline_first_sync.md)
