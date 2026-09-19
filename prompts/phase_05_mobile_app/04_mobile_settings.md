# 5.4 Mobile Settings

## Context

<context>
This step builds the Settings screen for the mobile app — covering notification preferences, timer configuration, account management, and device pairing. Mobile settings follow platform conventions (iOS grouped lists, Android Material sections) while maintaining the PostureCheck design language. Settings sync with the desktop app via Supabase when signed in.
</context>

## Prerequisites

<prerequisites>
- Steps 5.1–5.3 complete
- Auth store functional for mobile
- Settings store mirrors desktop structure
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Build the Settings screen**
   - `apps/mobile/app/(tabs)/settings.tsx`:
     - Grouped list sections (iOS style) or Material sections (Android):
       - **Timing**: Interval slider, active hours, active days
       - **Notifications**: Intensity level, sound, auto-escalation
       - **Account**: Sign in/out, sync status, paired devices
       - **General**: Theme, mascot tone, about
     - Each row is a tappable setting with current value displayed on the right

2. **Create the mobile auth screens**
   - `apps/mobile/app/auth/sign-in.tsx` — Sign in form
   - `apps/mobile/app/auth/sign-up.tsx` — Sign up form
   - Social login buttons: Google and Apple (Apple only on iOS)
   - Biometric auth option (Face ID / Touch ID for quick sign-in after initial setup)

3. **Create the settings store for mobile**
   - `apps/mobile/stores/settingsStore.ts`:
     - Mirrors desktop settings store structure
     - Loads from local SQLite
     - Pushes changes to Supabase in real-time when signed in
     - Subscribes to Supabase Realtime for changes from other devices

4. **Create settings components**
   - `apps/mobile/components/settings/IntervalPicker.tsx` — Slider with value label
   - `apps/mobile/components/settings/TimePicker.tsx` — Native time picker for active hours
   - `apps/mobile/components/settings/IntensitySelector.tsx` — Card selector for 1–5 levels
   - `apps/mobile/components/settings/DaySelector.tsx` — 7 day toggle buttons
</instructions>

<requirements>
### Functional Requirements
- All settings from the desktop app are configurable on mobile
- Settings sync between desktop and mobile when signed in
- Auth flows (sign in, sign up, OAuth) work on mobile
- Settings persist locally in SQLite

### Technical Requirements
- Platform-native pickers (iOS DateTimePicker, Android equivalent)
- NativeWind 4 styling
- Settings changes apply immediately (no save button)
- Haptic feedback on toggle switches (iOS)

### File Naming Conventions
- Route files: lowercase
- Components: PascalCase
</requirements>

<output_files>
Generate the following files:

1. `apps/mobile/app/(tabs)/settings.tsx` — Settings screen
2. `apps/mobile/app/auth/sign-in.tsx` — Sign in screen
3. `apps/mobile/app/auth/sign-up.tsx` — Sign up screen
4. `apps/mobile/stores/settingsStore.ts` — Settings state
5. `apps/mobile/components/settings/IntervalPicker.tsx`
6. `apps/mobile/components/settings/IntensitySelector.tsx`
7. `apps/mobile/components/settings/DaySelector.tsx`
</output_files>

## Verification

<verification>
- [ ] Settings screen renders all groups with correct current values
- [ ] Changing interval updates the local timer immediately
- [ ] Sign in on mobile syncs all data from cloud
- [ ] Settings changed on mobile appear on desktop within 5 seconds
- [ ] Theme toggle switches dark/light mode
</verification>

---

**Previous**: [5.3 — Stats & Achievements](./03_stats_achievements_screens.md) | **Next**: [5.5 — Local Timer & Notifications](./05_local_timer_notifications.md)
