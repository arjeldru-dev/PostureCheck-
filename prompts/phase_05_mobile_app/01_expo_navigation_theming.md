# 5.1 Navigation & Theming Finalization

## Context

<context>
This step finalizes the Expo Router navigation, applies the PostureCheck theme comprehensively, and creates the production-ready splash/loading experience. The tab structure was scaffolded in Step 0.3; now we polish it with proper icons, animations, and theme integration. The mobile app should feel native and premium — matching the desktop app's design language while respecting iOS and Android platform conventions.
</context>

## Prerequisites

<prerequisites>
- Phase 4 complete (auth and sync functional)
- Expo Router navigation scaffolded (from Step 0.3)
- NativeWind 4 configured with design tokens (from Step 0.3/0.5)
- Ribbit assets available (from Step 0.6)
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Finalize tab bar styling**
   - Update `app/(tabs)/_layout.tsx` with production-ready tab bar:
     - 4 tabs: Home (🏠), Stats (📊), Achievements (🏆), Settings (⚙)
     - Active tab: frog-green color with filled icon
     - Inactive tab: muted text color with outline icon
     - Tab bar background: dark surface (dark mode) or white (light mode)
     - Subtle shadow/border separating tab bar from content
     - Safe area handling for iOS notch and Android navigation bar
     - Haptic feedback on tab press (iOS)

2. **Set up the root layout with providers**
   - Update `app/_layout.tsx`:
     - Wrap with NativeWind theme provider
     - Wrap with Zustand store providers
     - Initialize Supabase auth session on app start
     - Initialize local SQLite database
     - Load fonts (Outfit, Inter, JetBrains Mono via expo-font)
     - Handle auth state: redirect to sign-in if needed for sync features
     - Keep splash screen visible until fonts and initial data are loaded

3. **Configure the splash screen**
   - Use `expo-splash-screen` to show a branded splash:
     - Background: frog-green gradient
     - Centered Ribbit mascot (idle pose, white outline version)
     - App name "Posture Check!" in Outfit Bold, white
     - Hold splash until fonts load, auth session restores, and SQLite initializes

4. **Set up dark/light mode theming**
   - Use `useColorScheme()` from React Native for system preference
   - Theme store (from shared package) manages manual override
   - All screens use NativeWind dark: variants for dark mode
   - Status bar adapts to theme (light content on dark mode, dark content on light mode)

5. **Add navigation transitions**
   - Tab switches: cross-fade animation (200ms)
   - Modal screens (settings modals, auth): slide up from bottom
   - Stack screens: slide from right (iOS) or fade (Android)

6. **Create the mobile Supabase and SQLite initialization**
   - `apps/mobile/lib/database.ts`:
     - Initialize Expo SQLite with the same schema as desktop (from Step 1.4)
     - Run migrations on app start
   - `apps/mobile/lib/supabase.ts`:
     - Already created in Step 0.4; verify it works with auth session persistence via SecureStore
</instructions>

<requirements>
### Functional Requirements
- Tab bar with 4 tabs, proper icons, active/inactive states
- Dark and light mode work correctly with system preference
- Splash screen shows until the app is ready (fonts, auth, database)
- Navigation transitions feel native to each platform
- Fonts (Outfit, Inter, JetBrains Mono) load before any screen renders

### Technical Requirements
- Expo Router for file-based navigation
- expo-font for font loading
- expo-splash-screen for splash management
- NativeWind 4 dark mode via `prefers-color-scheme`
- expo-secure-store for auth token storage
- Expo SQLite for local database
- Haptic feedback via expo-haptics

### File Naming Conventions
- Route files: lowercase matching URL paths
- Layout files: `_layout.tsx`
- Lib files: kebab-case (`database.ts`, `supabase.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/app/_layout.tsx` — MODIFIED: full root layout with providers
2. `apps/mobile/app/(tabs)/_layout.tsx` — MODIFIED: polished tab bar
3. `apps/mobile/lib/database.ts` — SQLite initialization and migrations
4. `apps/mobile/stores/themeStore.ts` — Theme management for mobile
5. `apps/mobile/stores/authStore.ts` — Auth state for mobile
</output_files>

## Verification

<verification>
- [ ] App launches with splash screen, loads fonts, then shows the tab bar
- [ ] All 4 tabs show with correct icons and active states
- [ ] Dark mode toggle in system settings changes the app theme
- [ ] Tab transitions are smooth with cross-fade animation
- [ ] SQLite database creates on first launch without errors
- [ ] Auth session restores on app restart (if previously signed in)
- [ ] Fonts render correctly (Outfit for headers, Inter for body)
</verification>

---

**Next**: [5.2 — Mobile Dashboard](./02_mobile_dashboard.md)
