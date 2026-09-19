# 7.4 Error Handling

## Context

<context>
This step adds comprehensive error handling — graceful degradation when things go wrong (network errors, SQLite failures, push delivery failures, Supabase outages). The app should never show a blank screen or cryptic error. Every error should have a user-friendly message and a recovery action. The frog mascot should appear in error states too (concerned expression).
</context>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **React error boundaries**
   - Wrap main routes in error boundaries
   - Error fallback: Ribbit (concerned) + "Something went wrong" + "Try Again" button
   - Log errors to console (production: send to error tracking service placeholder)

2. **Network error handling**
   - Supabase offline: show "📡 Offline — your data is saved locally" banner
   - Auto-retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Sync errors: show in Settings > Sync Status with error details
   - Push delivery failure: fallback to PC notification with warning

3. **Database error handling**
   - SQLite read failure: show cached data with stale warning
   - SQLite write failure: retry 3 times, then show error toast
   - Migration failure: show "Database needs update" screen with "Fix" button

4. **Toast notification system for errors**
   - Create a reusable toast system for error/warning/info messages
   - Positioned at the bottom of the screen
   - Error: coral background, warning: golden, info: frog-green
   - Auto-dismiss after 5 seconds, or tap to dismiss immediately

5. **Crash recovery**
   - On app crash and restart: restore last known good state from SQLite
   - Show "Welcome back! We recovered your data." message
   - Never lose user data even if the app crashes mid-operation
</instructions>

<output_files>
Generate the following files:

1. `apps/desktop/src/components/common/ErrorBoundary.tsx` — React error boundary
2. `apps/desktop/src/components/common/Toast.tsx` — Reusable toast system
3. `apps/desktop/src/components/common/OfflineBanner.tsx` — Offline indicator
4. `apps/mobile/components/common/ErrorBoundary.tsx` — Mobile error boundary
5. `apps/mobile/components/common/Toast.tsx` — Mobile toast system
</output_files>

---

**Previous**: [7.3 — Performance Optimization](./03_performance_optimization.md) | **Next**: [7.5 — Build & Distribution](./05_build_distribution.md)
