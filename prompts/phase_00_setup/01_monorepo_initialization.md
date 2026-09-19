# 0.1 Monorepo Initialization

## Context

<context>
This is the very first step of the entire Posture Check! project. We're creating a Turborepo monorepo that will house both the Tauri desktop app and the Expo mobile app, along with shared packages for types, constants, utilities, and UI components. This structure ensures type safety across platforms, eliminates code duplication for shared logic (like Ribbit messages, XP calculations, and gamification rules), and enables efficient builds with Turborepo's caching.
</context>

## Prerequisites

<prerequisites>
- Node.js 22+ installed
- pnpm 9+ installed (package manager for the monorepo)
- Git initialized
- Rust toolchain installed (for Tauri — `rustup` with stable channel)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Initialize the Turborepo monorepo**
   - Create a new Turborepo project at the project root using pnpm workspaces
   - Configure `turbo.json` with pipelines for `build`, `dev`, `lint`, `test`, and `type-check`
   - Set up pnpm workspace with `pnpm-workspace.yaml` defining `apps/*` and `packages/*`

2. **Create the workspace structure**
   - `apps/desktop/` — Will hold the Tauri + React app (created in Step 0.2)
   - `apps/mobile/` — Will hold the Expo app (created in Step 0.3)
   - `packages/shared/` — Shared TypeScript package for types, constants, utilities, and Ribbit messages
   - `packages/ui/` — Shared UI components that work across both React (web) and React Native (with platform-specific implementations)

3. **Configure the shared package (`packages/shared/`)**
   - Initialize with `package.json` (name: `@posture-check/shared`)
   - Set up TypeScript with `tsconfig.json` (strict mode, ESM output)
   - Create the initial directory structure:
     - `src/types/` — Shared TypeScript types and interfaces (User, Device, PostureSettings, PostureCheck, UserProgress, Achievement, etc.)
     - `src/constants/` — App-wide constants (XP values, level thresholds, intensity levels, interval min/max, default settings)
     - `src/utils/` — Pure utility functions (XP calculation, level calculation, streak logic)
     - `src/messages/` — Ribbit mascot message strings organized by intensity level and category
     - `src/index.ts` — Barrel export

4. **Configure the UI package (`packages/ui/`)**
   - Initialize with `package.json` (name: `@posture-check/ui`)
   - Set up TypeScript config
   - Create placeholder structure (actual components added in later phases)

5. **Set up root-level tooling**
   - ESLint config at root with TypeScript rules, shared across all workspaces
   - Prettier config at root for consistent formatting
   - Root `tsconfig.json` with project references
   - `.gitignore` covering node_modules, dist, .env, Tauri build artifacts, Expo build artifacts, Supabase local
   - `.env.example` at root with placeholder variables for Supabase URL, Supabase anon key, Sentry DSN
   - `.nvmrc` with Node.js version

6. **Add convenience scripts to root `package.json`**
   - `dev:desktop` — runs the desktop app in dev mode
   - `dev:mobile` — runs the mobile app in dev mode
   - `build:desktop` — builds the Tauri desktop binary
   - `build:mobile` — triggers EAS Build
   - `lint` — lints all workspaces
   - `type-check` — type-checks all workspaces
   - `test` — runs tests across all workspaces
</instructions>

<requirements>
### Functional Requirements
- All workspaces must be able to import from `@posture-check/shared` with TypeScript path resolution
- The shared package must export typed constants for all gamification values from the spec (XP per action, level thresholds, intensity levels)
- Turborepo caching must work for `build` and `type-check` tasks

### Technical Requirements
- TypeScript strict mode enabled across all packages
- ESM modules throughout (type: "module" in all package.json files)
- pnpm as the package manager (not npm or yarn)
- Node.js 22+ as the runtime target
- All shared types must match the data model from Section 4 of the project spec

### File Naming Conventions
- Files: kebab-case (`user-profile.ts`, `xp-calculator.ts`)
- Types/interfaces: PascalCase (`UserProgress`, `PostureSettings`)
- Constants: UPPER_SNAKE_CASE (`MAX_INTERVAL_MINUTES`, `XP_PER_ACKNOWLEDGE`)
- Functions: camelCase (`calculateLevel`, `getNextReminderTime`)
</requirements>

<output_files>
Generate the following files:

1. `turbo.json` — Turborepo pipeline configuration
2. `pnpm-workspace.yaml` — Workspace definitions
3. `package.json` — Root package.json with scripts and devDependencies
4. `tsconfig.json` — Root TypeScript config with project references
5. `.eslintrc.cjs` — Root ESLint configuration
6. `.prettierrc` — Prettier configuration
7. `.gitignore` — Comprehensive gitignore
8. `.env.example` — Environment variable template
9. `.nvmrc` — Node.js version
10. `packages/shared/package.json` — Shared package config
11. `packages/shared/tsconfig.json` — Shared package TypeScript config
12. `packages/shared/src/index.ts` — Barrel export
13. `packages/shared/src/types/index.ts` — All shared TypeScript types
14. `packages/shared/src/constants/index.ts` — All app constants (XP, levels, intervals, intensity)
15. `packages/shared/src/utils/index.ts` — Utility function stubs
16. `packages/shared/src/messages/index.ts` — Ribbit message collections
17. `packages/ui/package.json` — UI package config
18. `packages/ui/tsconfig.json` — UI package TypeScript config
19. `packages/ui/src/index.ts` — Placeholder barrel export
</output_files>

## Directory Structure

After completing this step, the project should have:

```
posture-check/
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .nvmrc
├── .prettierrc
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
├── apps/
│   ├── desktop/              ← placeholder (created in 0.2)
│   └── mobile/               ← placeholder (created in 0.3)
└── packages/
    ├── shared/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── types/
    │       │   └── index.ts
    │       ├── constants/
    │       │   └── index.ts
    │       ├── utils/
    │       │   └── index.ts
    │       └── messages/
    │           └── index.ts
    └── ui/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts
```

## Verification

<verification>
After completing this step, confirm:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm turbo run type-check` passes for `@posture-check/shared` and `@posture-check/ui`
- [ ] Importing `import { XP_PER_ACKNOWLEDGE, type UserProgress } from '@posture-check/shared'` resolves in a test file
- [ ] `turbo.json` pipelines are configured for build, dev, lint, test, type-check
- [ ] `.env.example` contains SUPABASE_URL, SUPABASE_ANON_KEY, SENTRY_DSN placeholders
- [ ] `.gitignore` covers node_modules, dist, .env, target/ (Rust), .expo/, android/, ios/
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `pnpm install` fails with workspace resolution errors | `pnpm-workspace.yaml` paths don't match actual directories | Verify `apps/*` and `packages/*` globs match the folder structure |
| TypeScript can't find `@posture-check/shared` | Missing or incorrect `exports` field in shared `package.json` | Add `"exports": { ".": "./src/index.ts" }` and ensure `tsconfig.json` has path mappings |
| Turborepo doesn't cache builds | Missing `outputs` in `turbo.json` pipeline | Add `"outputs": ["dist/**"]` to the build pipeline |
| ESLint errors on TypeScript files | Missing `@typescript-eslint` parser | Install `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` as root devDependencies |

---

**Next**: [0.2 — Tauri Desktop Scaffolding](./02_tauri_desktop_scaffolding.md)
