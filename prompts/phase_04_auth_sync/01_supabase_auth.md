# 4.1 Supabase Auth Integration

## Context

<context>
This step implements optional user authentication using Supabase Auth. The app is fully functional without an account — authentication enables cross-device sync, cloud backup, and device pairing. Auth supports email/password, Google OAuth, and Apple Sign-In. The first sign-in merges existing local data with the cloud. This implements Feature 3.9 (Optional Account System) from the project spec.
</context>

## Prerequisites

<prerequisites>
- Phase 3 complete (app fully functional locally)
- Supabase project configured (from Step 0.4)
- Supabase client initialized in both desktop and mobile apps
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Create the auth UI for the desktop app**
   - `apps/desktop/src/pages/Auth.tsx` — auth page with tabs for Sign In / Sign Up
   - Sign In form: email + password fields, "Sign In" button, "Forgot password?" link
   - Sign Up form: email + password + display name fields, "Create Account" button
   - Social login buttons: "Continue with Google", "Continue with Apple" (styled per brand guidelines)
   - Error states: invalid email, wrong password, network error
   - Loading states: button spinner during auth request
   - Success: redirect to Dashboard with a welcome message

2. **Implement Supabase Auth flows in the desktop app**
   - `apps/desktop/src/lib/auth.ts`:
     - `signUpWithEmail(email, password, displayName)` — creates account
     - `signInWithEmail(email, password)` — signs in
     - `signInWithGoogle()` — Google OAuth (opens browser for OAuth flow)
     - `signInWithApple()` — Apple Sign-In
     - `signOut()` — signs out, stops sync
     - `resetPassword(email)` — sends password reset email
     - `getSession()` — returns current session
     - `onAuthStateChange(callback)` — listens for auth state changes
   - OAuth redirect handling: Tauri deep link or custom URL scheme for OAuth callback

3. **Create the auth Zustand store**
   - `apps/desktop/src/stores/authStore.ts`:
     - State: `user`, `session`, `isAuthenticated`, `isLoading`
     - Actions: all auth methods from above
     - On sign-in: trigger initial data sync (Step 4.3)
     - On sign-out: stop sync, keep local data, update UI
     - Session persistence: Supabase handles this via localStorage/cookies

4. **Add auth-related settings**
   - Update Settings > Account tab:
     - If signed out: "Sign in to sync across devices" CTA with benefits list
     - If signed in: show user email, display name, account creation date
     - "Sign Out" button with confirmation
     - "Delete Account" button (sends deletion request, clears cloud data in 30 days)
     - "Export My Data" button (downloads all cloud data as JSON — GDPR compliance)
     - Sync status indicator: "✅ Synced" or "🔄 Syncing..." or "⚠️ Offline"

5. **Handle first-time sign-in data merge**
   - When a user signs in for the first time:
     1. Check if cloud data exists for this account
     2. If no cloud data: upload all local data to Supabase
     3. If cloud data exists: merge with local (local wins on timestamp conflicts)
     4. Show a merge summary: "Synced X posture checks, Y achievements"
   - This ensures no data is lost when signing in

6. **Configure OAuth providers in Supabase**
   - Document the setup steps for:
     - Google OAuth: create Google Cloud project, configure OAuth consent screen, add credentials to Supabase
     - Apple Sign-In: configure in Apple Developer portal, add to Supabase
   - Create a setup guide in the prompts that the developer follows
</instructions>

<requirements>
### Functional Requirements
- App works fully without an account (local-only mode is the default)
- Sign up with email + password creates an account
- Google OAuth opens browser, completes flow, returns authenticated
- Sign-in triggers initial data sync
- Sign-out stops sync but preserves all local data
- Account deletion removes all cloud data (GDPR-ready)
- Session persists across app restarts (auto-sign-in)

### Technical Requirements
- Supabase Auth JS client v2
- JWT access tokens with 1-hour expiry, refresh tokens with 7-day expiry
- OAuth uses Tauri deep link scheme (`posturecheck://auth/callback`)
- Auth state changes broadcast to all app components via Zustand store
- No sensitive data stored in localStorage (Supabase handles token storage securely)

### File Naming Conventions
- Auth utilities: kebab-case (`auth.ts`)
- Components: PascalCase (`Auth.tsx`, `SignInForm.tsx`)
- Stores: camelCase (`authStore.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/pages/Auth.tsx` — Auth page with sign in/up forms
2. `apps/desktop/src/lib/auth.ts` — Auth utility functions
3. `apps/desktop/src/stores/authStore.ts` — Auth state management
4. `apps/desktop/src/components/settings/AccountSettings.tsx` — Account section in settings
5. `apps/desktop/src-tauri/tauri.conf.json` — MODIFIED: add deep link scheme for OAuth
</output_files>

## Verification

<verification>
- [ ] Sign up with email creates account (verify in Supabase Dashboard)
- [ ] Sign in with email/password works and session persists
- [ ] Sign out clears session but keeps local data
- [ ] Google OAuth opens browser, completes, returns authenticated user
- [ ] Auth state change updates UI (show/hide sign-in button, show user info)
- [ ] First sign-in triggers data upload to Supabase
- [ ] Session auto-restores on app restart (no re-login needed)
- [ ] Account deletion button sends the request
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| OAuth redirect doesn't return to app | Deep link scheme not configured | Add `posturecheck://` scheme to `tauri.conf.json` and Supabase redirect URLs |
| "Invalid email" error on valid email | Email validation too strict | Use Supabase's built-in email validation, don't add custom regex |
| Session not persisting | Storage adapter not configured | Verify Supabase client uses localStorage (default for web) |
| Google OAuth shows consent screen every time | Missing offline_access scope or consent screen not published | Publish the OAuth consent screen in Google Cloud Console |

---

**Next**: [4.2 — Database Schema & RLS](./02_database_schema_rls.md)
