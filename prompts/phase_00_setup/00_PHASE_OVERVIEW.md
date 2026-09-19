# Phase 0: Setup & Design System

> **Objective**: Scaffold the monorepo, initialize Tauri and Expo projects, set up Supabase, establish the design system, and prepare Ribbit mascot assets — creating the foundation for all subsequent phases.
> **Duration**: 1–2 weeks
> **Dependencies**: None (this is the first phase)

---

## Phase Goals

1. ✅ Turborepo monorepo with shared TypeScript packages between desktop and mobile
2. ✅ Tauri 2.0 desktop app running with React 19 + Vite + Tailwind CSS 4
3. ✅ Expo SDK 57 mobile app running with NativeWind 4
4. ✅ Supabase project created with initial config (local Docker for dev)
5. ✅ Design system tokens (colors, typography, spacing) shared across platforms
6. ✅ Ribbit mascot assets (SVG) ready for integration in later phases
7. ✅ CI/CD pipeline scaffolded (GitHub Actions for Tauri builds + EAS builds)

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 0.1 | [01_monorepo_initialization.md](01_monorepo_initialization.md) | Turborepo monorepo structure with shared packages |
| 0.2 | [02_tauri_desktop_scaffolding.md](02_tauri_desktop_scaffolding.md) | Tauri 2.0 desktop app with React 19 + Vite + Tailwind CSS 4 |
| 0.3 | [03_expo_mobile_scaffolding.md](03_expo_mobile_scaffolding.md) | Expo SDK 57 mobile app with NativeWind 4 |
| 0.4 | [04_supabase_setup.md](04_supabase_setup.md) | Supabase project, local dev environment, initial config |
| 0.5 | [05_design_system_tokens.md](05_design_system_tokens.md) | Shared design tokens (colors, typography, spacing) for both platforms |
| 0.6 | [06_ribbit_mascot_assets.md](06_ribbit_mascot_assets.md) | Ribbit frog mascot SVG assets for all character states |

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | Turborepo | Simpler than Nx, less overhead for 2 apps + shared packages, great caching |
| Desktop framework | Tauri 2.0 | 10× smaller than Electron (~5 MB), native system tray, Rust backend for timer performance |
| Mobile framework | Expo SDK 57 (managed) | OTA updates, managed workflow, EAS Build for native binaries, push notifications |
| Styling strategy | Tailwind CSS 4 (desktop) + NativeWind 4 (mobile) | Consistent design tokens across platforms using the same utility-first approach |
| State management | Zustand | Lightweight, TypeScript-native, works in both React and React Native |
| Backend | Supabase | Free tier is generous, built-in Auth + Realtime + Edge Functions, RLS for security |
| Ribbit art style | Flat vector SVG | Modern, clean, scales perfectly at any size, easy to animate with CSS/Framer Motion |

## Skills to Load

Before starting this phase, load these skill files from `d:\skills-ng-mama-mo\skill-md\[skill-id]\SKILL.md`:
- `brand-guidelines` — Establish the Posture Check! brand identity, color palette, and visual rules
- `color-expert` — Calibrate the frog-themed color palette for accessibility and visual harmony
- `design-md` — Generate the DESIGN.md file with design system tokens and conventions
- `frontend-design` — Establish the premium, non-generic UI direction for both platforms

## Exit Criteria

Before moving to Phase 1, verify:

- [ ] `pnpm install` runs without errors at the monorepo root
- [ ] `pnpm dev:desktop` launches the Tauri app with a blank React page and system tray icon
- [ ] `pnpm dev:mobile` launches the Expo app on a simulator/device
- [ ] Supabase local dev environment starts with `supabase start`
- [ ] Shared `@posture-check/ui` and `@posture-check/shared` packages import correctly in both apps
- [ ] Design tokens (colors, fonts, spacing) are defined and consumable in both Tailwind CSS 4 and NativeWind 4
- [ ] Ribbit SVG assets render in a test component on both desktop and mobile
- [ ] GitHub Actions workflow file exists (even if builds are not yet configured end-to-end)

---

**Next Phase**: [Phase 1: Desktop Core & Timer](../phase_01_desktop_core/00_PHASE_OVERVIEW.md)
