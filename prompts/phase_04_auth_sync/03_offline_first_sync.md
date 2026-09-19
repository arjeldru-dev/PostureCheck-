# 4.3 Offline-First Sync Engine

## Context

<context>
This step builds the sync engine that keeps SQLite (local) and Supabase (cloud) in sync. The app is offline-first — everything works locally, and cloud sync is a bonus when signed in. Sync uses a last-write-wins strategy with timestamps for conflict resolution. This enables the core promise: use the app on your PC, sign in, and all your progress appears on your phone.
</context>

## Prerequisites

<prerequisites>
- Steps 4.1–4.2 complete (auth working, schema deployed, RLS configured)
- SQLite data layer functional (from Step 1.4)
- Supabase client configured and authenticated
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the sync engine**
   - `apps/desktop/src/lib/sync-engine.ts`:
     - `SyncEngine` class with methods:
       - `initialSync()` — first sync after sign-in, merges local + cloud
       - `pushChanges()` — uploads local changes to Supabase
       - `pullChanges()` — downloads cloud changes to SQLite
       - `syncAll()` — full bidirectional sync
       - `getLastSyncTimestamp()` — when the last successful sync occurred
     - Sync strategy: last-write-wins using `updated_at` timestamps
     - Sync scope: posture_settings, posture_checks, user_progress, user_achievements, devices

2. **Implement initial sync (first sign-in)**
   - When a user signs in for the first time:
     1. Fetch all cloud data for this user
     2. Fetch all local data from SQLite
     3. For each entity type, merge:
        - If exists only locally: upload to cloud
        - If exists only in cloud: download to SQLite
        - If exists in both: compare `updated_at`, keep the newer one
     4. Record the sync timestamp
     5. Show merge summary to user

3. **Implement incremental sync**
   - After initial sync, use incremental sync:
     - Track `last_sync_at` timestamp per entity type
     - Push: query SQLite for records where `updated_at > last_sync_at`, upsert to Supabase
     - Pull: query Supabase for records where `updated_at > last_sync_at`, upsert to SQLite
     - Run every 5 minutes (configurable), or on-demand when changes are made

4. **Handle conflict resolution**
   - Strategy: last-write-wins based on `updated_at` timestamp
   - If timestamps are identical: prefer the cloud version (tie-breaker)
   - For posture_checks: never overwrite — both versions are kept (append-only)
   - For user_progress: merge intelligently (take the higher XP, longer streak)
   - Log all conflicts to a `sync_log` table for debugging

5. **Create a Rust-side sync trigger**
   - Modify `src-tauri/src/lib.rs`:
     - `trigger_sync()` command — called from frontend after auth state change or periodically
     - Sync runs in a background thread (doesn't block UI)
     - Emit sync status events: `sync-started`, `sync-completed`, `sync-error`

6. **Create the sync status UI**
   - `apps/desktop/src/components/settings/SyncStatus.tsx`:
     - Shows: "✅ Last synced 2 min ago" or "🔄 Syncing..." or "⚠️ Offline — changes saved locally"
     - "Sync Now" manual trigger button
     - Sync error details expandable
   - Add to the Settings > Account tab
</instructions>

<requirements>
### Functional Requirements
- First sign-in merges all local data to the cloud
- Subsequent syncs are incremental (only changed records)
- App works fully offline — sync happens when online
- Conflict resolution uses last-write-wins with timestamps
- Sync status visible in the UI
- Manual "Sync Now" button available

### Technical Requirements
- Sync runs in background (doesn't block UI or timer)
- Batch operations (don't send one record at a time — batch upserts)
- Retry logic with exponential backoff for failed syncs
- Sync respects Supabase rate limits
- `last_sync_at` persisted in SQLite

### File Naming Conventions
- Sync engine: kebab-case (`sync-engine.ts`)
- Components: PascalCase (`SyncStatus.tsx`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/lib/sync-engine.ts` — Sync engine with merge, push, pull logic
2. `apps/desktop/src/components/settings/SyncStatus.tsx` — Sync status display
3. `apps/desktop/src/stores/authStore.ts` — MODIFIED: trigger sync on sign-in
4. `apps/desktop/src-tauri/src/lib.rs` — MODIFIED: add sync trigger command
</output_files>

## Verification

<verification>
- [ ] Sign in for the first time → all local posture checks appear in Supabase
- [ ] Sign in on a "new device" (clear local data, sign in) → cloud data downloads to SQLite
- [ ] Change a setting locally → setting appears in Supabase within 5 minutes
- [ ] Go offline → make changes → go online → changes sync to cloud
- [ ] Conflicting changes: most recent timestamp wins
- [ ] Sync status shows accurate state (synced, syncing, offline)
- [ ] "Sync Now" button triggers immediate sync
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Sync fails with 401 | JWT expired | Ensure Supabase client auto-refreshes the token before sync |
| Duplicate records after sync | Merge not using upsert | Use `ON CONFLICT DO UPDATE` for PostgreSQL upserts |
| Sync takes too long | Too many records synced at once | Implement pagination/batching (500 records per batch) |
| Offline changes lost | Sync didn't run before sign-out | Persist `last_sync_at` and run sync on sign-out if online |

---

**Previous**: [4.2 — Database Schema & RLS](./02_database_schema_rls.md) | **Next**: [4.4 — Settings Sync](./04_settings_sync.md)
