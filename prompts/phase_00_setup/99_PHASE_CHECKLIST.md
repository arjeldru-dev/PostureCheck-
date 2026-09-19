# Phase 0 Completion Checklist

## All Steps Completed

- [ ] 0.1 - Monorepo Initialization (Turborepo + shared packages)
- [ ] 0.2 - Tauri Desktop Scaffolding (React 19 + Vite + Tailwind CSS 4)
- [ ] 0.3 - Expo Mobile Scaffolding (SDK 57 + NativeWind 4 + Expo Router)
- [ ] 0.4 - Supabase Setup (local dev + cloud projects + client config)
- [ ] 0.5 - Design System Tokens (colors, typography, spacing across platforms)
- [ ] 0.6 - Ribbit Mascot Assets (7 SVG states + components + icons)

## Verification Tests

Run these commands and confirm they pass:

```bash
# Monorepo health
pnpm install                     # Expected: no errors
pnpm turbo run type-check        # Expected: all workspaces pass

# Desktop app
cd apps/desktop && pnpm tauri dev  # Expected: Tauri window opens with React content

# Mobile app
cd apps/mobile && npx expo start   # Expected: Expo dev server starts, app runs on simulator

# Supabase
supabase start                    # Expected: local services start (Postgres, Auth, Studio)
curl http://localhost:54321/rest/v1/  # Expected: Supabase REST API responds

# Shared package
cd packages/shared && pnpm type-check  # Expected: no TypeScript errors
```

## Code Quality Checks

- [ ] All TypeScript files compile with zero errors: `pnpm turbo run type-check`
- [ ] Linting passes across all workspaces: `pnpm turbo run lint`
- [ ] No `console.log` statements in production code
- [ ] All new files have proper imports/exports
- [ ] `.env.local` exists with local Supabase credentials (NOT committed to git)
- [ ] `.env.example` has all required variables documented

## Design System Checks

- [ ] Frog Green (#4CAF50) renders correctly on both desktop and mobile
- [ ] Outfit, Inter, and JetBrains Mono fonts load on desktop
- [ ] Fonts load on mobile via expo-font
- [ ] Dark mode and light mode switch correctly
- [ ] All color combinations meet WCAG AA contrast requirements

## Mascot Checks

- [ ] All 7 Ribbit SVGs render on desktop
- [ ] All 7 Ribbit SVGs render on mobile
- [ ] RibbitMascot component accepts state and size props
- [ ] Breathing animation is smooth and subtle
- [ ] System tray icon is visible at small sizes

## Cross-Platform Checks

- [ ] `@posture-check/shared` imports work in desktop app
- [ ] `@posture-check/shared` imports work in mobile app
- [ ] Design tokens produce identical colors on both platforms
- [ ] Zustand theme store works in both apps

## Manual Verification

- [ ] Tauri app minimizes to system tray (window hides, tray icon remains)
- [ ] Right-clicking tray icon shows a context menu
- [ ] Mobile app has 4 bottom tabs with correct icons
- [ ] Supabase Studio is accessible and shows an empty database
- [ ] DesignSystem dev page renders all color swatches and typography samples

## Rollback Plan

If this phase breaks something:
1. The monorepo is initialized from scratch — there's no "previous state" to roll back to
2. If Tauri setup fails: delete `apps/desktop/src-tauri/` and re-initialize with `pnpm tauri init`
3. If Expo setup fails: delete `apps/mobile/` and re-create with `npx create-expo-app@latest`
4. If Supabase local fails: `supabase stop`, delete `supabase/.temp/`, and `supabase start`

---

**Proceed to**: [Phase 1: Desktop Core & Timer](../phase_01_desktop_core/00_PHASE_OVERVIEW.md)
