# 7.5 Build & Distribution

## Context

<context>
This step configures production builds for both the desktop (Tauri) and mobile (Expo) apps. The desktop app needs signed installers for Windows, macOS, and Linux. The mobile app needs signed builds for TestFlight (iOS) and Google Play Internal Track (Android). This prepares the app for distribution to beta testers and eventually the public.
</context>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Tauri production build configuration**
   - Configure `tauri.conf.json` for production:
     - App name, version, identifier
     - Window settings (default size, min size, resizable)
     - Bundle settings: NSIS installer (Windows), DMG (macOS), AppImage/DEB (Linux)
     - Code signing configuration (placeholder — requires developer certificates)
     - Auto-updater: configure Tauri's built-in updater (endpoint URL)
   - Create build scripts:
     - `pnpm build:desktop:windows` — builds Windows installer
     - `pnpm build:desktop:mac` — builds macOS DMG
     - `pnpm build:desktop:linux` — builds Linux AppImage

2. **Expo EAS Build configuration**
   - Update `apps/mobile/eas.json`:
     - Development: internal distribution, development client
     - Preview: internal distribution (TestFlight + Internal Track)
     - Production: app store submission
   - Create build scripts:
     - `pnpm build:mobile:ios` — builds iOS IPA via EAS
     - `pnpm build:mobile:android` — builds Android AAB/APK via EAS
   - Configure EAS Submit for automated store submission

3. **Environment configuration**
   - Create environment-specific configs:
     - Development: points to local Supabase
     - Staging: points to staging Supabase project
     - Production: points to production Supabase project
   - Environment variables injected at build time

4. **CI/CD pipeline (GitHub Actions)**
   - `.github/workflows/build.yml`:
     - On push to `main`: run type-check, lint, and tests
     - On tag: build desktop and mobile apps
     - Upload artifacts (installers, APKs) to GitHub Releases
   - `.github/workflows/deploy.yml`:
     - Deploy Supabase migrations and Edge Functions to production

5. **Auto-update system**
   - Desktop: Tauri updater checks for updates on app start
   - Mobile: standard App Store / Play Store updates
   - Version checking: compare local version with latest release
</instructions>

<output_files>
Generate the following files:

1. `apps/desktop/src-tauri/tauri.conf.json` — MODIFIED: production build config
2. `apps/mobile/eas.json` — MODIFIED: production build profiles
3. `.github/workflows/build.yml` — CI/CD pipeline
4. `.github/workflows/deploy.yml` — Supabase deployment pipeline
5. `turbo.json` — MODIFIED: add build scripts
</output_files>

---

**Previous**: [7.4 — Error Handling](./04_error_handling.md)

---

**Proceed to Phase Checklist**: [Phase 7 Checklist](./99_PHASE_CHECKLIST.md)
