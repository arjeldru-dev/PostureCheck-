# 0.3 Expo Mobile Scaffolding

## Context

<context>
This step initializes the Expo SDK 57 mobile app inside the monorepo at `apps/mobile/`. The mobile app serves as a companion to the desktop app — it receives routed notifications from the PC, displays the gamification dashboard, and can also run independent phone-based posture reminders. This step creates the scaffolding with navigation, theming, and NativeWind 4 styling. The actual screens and features are built in Phase 5.
</context>

## Prerequisites

<prerequisites>
- Step 0.1 (Monorepo Initialization) is complete
- Step 0.2 (Tauri Desktop Scaffolding) is complete (so we know the monorepo works)
- Expo CLI installed (`npx expo` — bundled with Expo SDK 57)
- For iOS development: macOS with Xcode installed
- For Android development: Android Studio with an emulator or physical device
- An Expo account (for EAS Build) — free tier
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Initialize the Expo project in `apps/mobile/`**
   - Use `npx create-expo-app@latest` with the blank TypeScript template
   - Target Expo SDK 57 — verify the correct SDK version is installed
   - Configure `app.json` / `app.config.ts` for Posture Check!:
     - App name: "Posture Check!"
     - Slug: "posture-check"
     - Bundle identifier (iOS): `com.posturecheck.mobile`
     - Package name (Android): `com.posturecheck.mobile`
     - Version: "1.0.0"
     - Orientation: portrait
     - Icon: placeholder green frog (real assets in Step 0.6)
     - Splash screen: green background with white text "Posture Check!"
     - Enable push notifications plugin
     - Enable SQLite plugin
     - Enable notifications plugin (for local notifications)
     - Scheme: "posturecheck" (for deep linking)

2. **Install and configure NativeWind 4**
   - Install NativeWind 4 and its peer dependencies for Expo SDK 57
   - Configure the NativeWind babel plugin / Metro config
   - Set up `global.css` with the PostureCheck design tokens (matching the desktop Tailwind config)
   - Verify NativeWind classes render correctly on a test component

3. **Set up Expo Router for file-based navigation**
   - Install `expo-router` and configure it in `app.json`
   - Create the initial route structure:
     - `app/(tabs)/` — Bottom tab navigator
       - `app/(tabs)/index.tsx` — Home/Dashboard tab (placeholder)
       - `app/(tabs)/stats.tsx` — Stats tab (placeholder)
       - `app/(tabs)/achievements.tsx` — Achievements tab (placeholder)
       - `app/(tabs)/settings.tsx` — Settings tab (placeholder)
     - `app/(tabs)/_layout.tsx` — Tab layout with icons and theming
     - `app/_layout.tsx` — Root layout with providers (Zustand, theme)
   - Configure tab bar with icons (use @expo/vector-icons)
   - Match tab bar styling to the PostureCheck design (frog-green accent, dark/light mode)

4. **Configure workspace integration**
   - Add `@posture-check/shared` as a workspace dependency in `apps/mobile/package.json`
   - Configure Metro bundler to resolve workspace packages (important for monorepo)
   - Verify imports from `@posture-check/shared` work in the mobile app

5. **Set up the project structure**
   - `app/` — Expo Router pages (file-based routing)
   - `components/` — Reusable UI components
   - `hooks/` — Custom React Native hooks
   - `stores/` — Zustand stores
   - `lib/` — Utilities, Supabase client, notification helpers
   - `assets/` — Images, fonts, sounds
   - `constants/` — Mobile-specific constants (re-exports from shared where applicable)

6. **Add mobile-specific scripts to `apps/mobile/package.json`**
   - `dev` — starts Expo dev server
   - `dev:ios` — starts on iOS simulator
   - `dev:android` — starts on Android emulator
   - `build:dev` — creates a development build via EAS
   - `build:preview` — creates a preview build via EAS
   - `build:production` — creates a production build via EAS
   - `lint` — lints the mobile code
   - `type-check` — TypeScript type checking

7. **Create the EAS configuration**
   - `eas.json` with build profiles: development, preview, production
   - Development profile uses development client (not Expo Go)
   - Preview profile for internal testing (TestFlight / Internal Track)
   - Production profile for App Store / Play Store submission
</instructions>

<requirements>
### Functional Requirements
- Expo app launches on both iOS simulator and Android emulator
- Bottom tab navigation works with 4 tabs (Home, Stats, Achievements, Settings)
- Each tab shows a placeholder screen with the tab name
- NativeWind 4 styles render correctly (test with the frog-green color palette)
- Workspace imports from `@posture-check/shared` resolve and display data

### Technical Requirements
- Expo SDK 57 (not older SDKs)
- TypeScript strict mode
- Expo Router for file-based routing (not React Navigation directly)
- NativeWind 4 for Tailwind-style classes in React Native
- Metro bundler configured for monorepo workspace resolution
- EAS Build profiles configured for dev/preview/production

### File Naming Conventions
- Route files: kebab-case matching URL paths (`index.tsx`, `settings.tsx`)
- Components: PascalCase (`RibbitMascot.tsx`, `StreakCounter.tsx`)
- Hooks: camelCase with `use` prefix (`usePostureTimer.ts`)
- Stores: camelCase (`settingsStore.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/package.json` — Mobile app dependencies and scripts
2. `apps/mobile/app.config.ts` — Expo configuration (dynamic config for env vars)
3. `apps/mobile/tsconfig.json` — TypeScript config
4. `apps/mobile/metro.config.js` — Metro bundler config for monorepo
5. `apps/mobile/babel.config.js` — Babel config with NativeWind plugin
6. `apps/mobile/global.css` — NativeWind 4 global styles with PostureCheck tokens
7. `apps/mobile/eas.json` — EAS Build profiles
8. `apps/mobile/app/_layout.tsx` — Root layout with providers
9. `apps/mobile/app/(tabs)/_layout.tsx` — Tab navigator layout
10. `apps/mobile/app/(tabs)/index.tsx` — Home tab placeholder
11. `apps/mobile/app/(tabs)/stats.tsx` — Stats tab placeholder
12. `apps/mobile/app/(tabs)/achievements.tsx` — Achievements tab placeholder
13. `apps/mobile/app/(tabs)/settings.tsx` — Settings tab placeholder
</output_files>

## Directory Structure

After completing this step, the project should have:

```
posture-check/
├── apps/
│   ├── desktop/             ← from Step 0.2
│   └── mobile/
│       ├── package.json
│       ├── app.config.ts
│       ├── tsconfig.json
│       ├── metro.config.js
│       ├── babel.config.js
│       ├── global.css
│       ├── eas.json
│       ├── app/
│       │   ├── _layout.tsx
│       │   └── (tabs)/
│       │       ├── _layout.tsx
│       │       ├── index.tsx
│       │       ├── stats.tsx
│       │       ├── achievements.tsx
│       │       └── settings.tsx
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       ├── lib/
│       ├── assets/
│       └── constants/
└── packages/
    ├── shared/              ← from Step 0.1
    └── ui/                  ← from Step 0.1
```

## Verification

<verification>
After completing this step, confirm:

- [ ] `cd apps/mobile && npx expo start` launches the Expo dev server without errors
- [ ] The app renders on an iOS simulator or Android emulator with 4 bottom tabs
- [ ] Tapping each tab navigates to the correct placeholder screen
- [ ] NativeWind classes work: a `<View className="bg-frog-green p-4">` renders with the correct green background
- [ ] `import { XP_PER_ACKNOWLEDGE } from '@posture-check/shared'` works in a mobile component
- [ ] TypeScript compiles cleanly: `pnpm type-check`
- [ ] `eas.json` exists with development, preview, and production profiles
- [ ] Running `pnpm dev:mobile` from the monorepo root launches the Expo app
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Metro bundler can't resolve `@posture-check/shared` | Metro not configured for monorepo | Add `watchFolders` and `nodeModulesPaths` to `metro.config.js` pointing to the monorepo root |
| NativeWind classes not applying | Missing babel plugin or incorrect CSS import | Verify `nativewind/babel` is in `babel.config.js` and `global.css` is imported in `_layout.tsx` |
| Expo SDK version mismatch | `create-expo-app` installed wrong SDK | Check `expo` version in `package.json` matches SDK 57. Run `npx expo install --fix` to align dependencies |
| Tab icons not showing | Missing `@expo/vector-icons` | Install `@expo/vector-icons` (usually bundled with Expo, verify import) |
| EAS Build fails | Missing EAS CLI login | Run `npx eas login` and `npx eas build:configure` |

---

**Previous**: [0.2 — Tauri Desktop Scaffolding](./02_tauri_desktop_scaffolding.md) | **Next**: [0.4 — Supabase Setup](./04_supabase_setup.md)
