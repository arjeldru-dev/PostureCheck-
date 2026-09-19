# 0.4 Supabase Setup

## Context

<context>
This step sets up the Supabase project for Posture Check! — both the local development environment (Docker-based) and the cloud project. Supabase provides the backend: PostgreSQL database, authentication (email + Google OAuth + Apple Sign-In), Realtime subscriptions (for device sync), and Edge Functions (for push notification relay). At this stage, we're creating the project, configuring the local dev environment, and setting up the Supabase client libraries. The actual database schema and RLS policies are created in Phase 4.
</context>

## Prerequisites

<prerequisites>
- Steps 0.1–0.3 are complete (monorepo with desktop and mobile apps running)
- Docker Desktop installed and running (for Supabase local dev)
- Supabase CLI installed (`npm install -g supabase` or via homebrew)
- A Supabase account (free tier at supabase.com)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the Supabase project structure**
   - Initialize Supabase in the monorepo root: `supabase init`
   - This creates `supabase/` directory with config, migrations, functions, and seed files
   - Configure `supabase/config.toml` with project settings:
     - Project name: "posture-check"
     - API port: 54321
     - DB port: 54322
     - Studio port: 54323
     - Auth: enable email signup, Google OAuth, Apple Sign-In (placeholders for OAuth credentials)

2. **Create a Supabase cloud project**
   - Document the steps for creating the cloud project at supabase.com
   - Create two projects: `posture-check-staging` and `posture-check-prod` (or instruct the user to do so)
   - Note the project URL and anon key for each environment
   - Add these to `.env.example` and create `.env.local` for development

3. **Set up the Supabase client in the shared package**
   - Install `@supabase/supabase-js` in `packages/shared/`
   - Create a typed Supabase client factory in `packages/shared/src/lib/supabase.ts`
   - The client should accept URL and key parameters (injected by each app from their environment)
   - Create database type stubs (will be generated from schema in Phase 4)
   - Export the client factory and types from the shared package

4. **Configure Supabase client in the desktop app**
   - Install `@supabase/supabase-js` in `apps/desktop/`
   - Create `apps/desktop/src/lib/supabase.ts` that initializes the client with Tauri's environment
   - Environment variables loaded via Tauri's config or import.meta.env

5. **Configure Supabase client in the mobile app**
   - Install `@supabase/supabase-js` in `apps/mobile/`
   - Create `apps/mobile/lib/supabase.ts` that initializes the client with Expo's environment
   - Use `expo-constants` for environment variables
   - Configure AsyncStorage adapter for Supabase auth session persistence on mobile

6. **Create the initial migration placeholder**
   - Create `supabase/migrations/00000000000000_initial_setup.sql` as a placeholder
   - Add a comment explaining the full schema will be created in Phase 4 (Step 4.2)
   - Create `supabase/seed.sql` with a comment for seed data

7. **Set up Edge Functions directory**
   - Create `supabase/functions/` directory
   - Create a placeholder `supabase/functions/push-notification-relay/index.ts` with a hello-world function
   - This will be fully implemented in Phase 6

8. **Update environment configuration**
   - Update `.env.example` with all Supabase variables
   - Create `.env.local` template for local development pointing to local Supabase
   - Document how to switch between local, staging, and production environments
</instructions>

<requirements>
### Functional Requirements
- `supabase start` spins up the local development stack (PostgreSQL, Auth, Studio, etc.)
- Supabase Studio is accessible at `http://localhost:54323`
- Both the desktop and mobile apps can connect to the local Supabase instance
- The Supabase client is typed and shared via the `@posture-check/shared` package

### Technical Requirements
- Supabase JS client v2
- TypeScript types for the database (stub for now, auto-generated in Phase 4)
- Auth session persistence via AsyncStorage on mobile, localStorage on desktop
- Environment-based configuration (local, staging, production)
- Supabase CLI version compatible with the cloud project

### File Naming Conventions
- Migration files: timestamped `YYYYMMDDHHMMSS_description.sql`
- Edge Functions: folder-per-function under `supabase/functions/`
- Supabase client: `supabase.ts` in each app's `lib/` directory
</requirements>

<output_files>
Generate the following files:

1. `supabase/config.toml` — Supabase local dev configuration
2. `supabase/migrations/.gitkeep` — Migrations directory placeholder
3. `supabase/seed.sql` — Seed data placeholder
4. `supabase/functions/push-notification-relay/index.ts` — Edge Function placeholder
5. `packages/shared/src/lib/supabase.ts` — Typed Supabase client factory
6. `packages/shared/src/types/database.ts` — Database type stubs
7. `apps/desktop/src/lib/supabase.ts` — Desktop Supabase client
8. `apps/mobile/lib/supabase.ts` — Mobile Supabase client with AsyncStorage
9. `.env.local` — Local development environment variables
10. `.env.example` — Updated with all Supabase variables
</output_files>

## Directory Structure

After completing this step, the project should have:

```
posture-check/
├── .env.example                  ← MODIFIED (added Supabase vars)
├── .env.local                    ← NEW (local dev config)
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── .gitkeep
│   ├── seed.sql
│   └── functions/
│       └── push-notification-relay/
│           └── index.ts
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       └── lib/
│   │           └── supabase.ts   ← NEW
│   └── mobile/
│       └── lib/
│           └── supabase.ts       ← NEW
└── packages/
    └── shared/
        └── src/
            ├── lib/
            │   └── supabase.ts   ← NEW
            └── types/
                └── database.ts   ← NEW
```

## Verification

<verification>
After completing this step, confirm:

- [ ] `supabase start` runs without errors and shows local service URLs
- [ ] Supabase Studio is accessible at `http://localhost:54323`
- [ ] The desktop app can connect to local Supabase: `const { data, error } = await supabase.auth.getSession()` returns without errors
- [ ] The mobile app can connect to local Supabase with the same test
- [ ] `.env.local` has SUPABASE_URL=http://localhost:54321 and the local anon key
- [ ] Edge Function placeholder deploys: `supabase functions serve push-notification-relay`
- [ ] `supabase db reset` runs the migration placeholder without errors
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `supabase start` fails | Docker not running or ports in use | Start Docker Desktop, check no other services on ports 54321-54323 |
| Auth endpoints return 500 | Supabase config issue | Check `supabase/config.toml` auth settings, run `supabase stop && supabase start` |
| Mobile app can't connect to local Supabase | Localhost not accessible from device/emulator | Use your machine's LAN IP (e.g., 192.168.x.x) instead of localhost. For Android emulator, use `10.0.2.2` |
| TypeScript errors on Supabase types | Missing or mismatched type definitions | Run `supabase gen types typescript --local > packages/shared/src/types/database.ts` after schema creation |
| Edge Function import errors | Deno types not configured | Add `import "jsr:@supabase/functions-js/edge-runtime.d.ts"` at top of function |

---

**Previous**: [0.3 — Expo Mobile Scaffolding](./03_expo_mobile_scaffolding.md) | **Next**: [0.5 — Design System Tokens](./05_design_system_tokens.md)
