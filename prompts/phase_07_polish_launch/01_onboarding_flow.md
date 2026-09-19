# 7.1 Onboarding Flow

## Context

<context>
This step creates the first-time user experience — the onboarding flow that welcomes new users, explains how Posture Check! works, and helps them configure initial settings. A great onboarding reduces churn and sets expectations. The flow should be short (4–5 screens), skippable, and end with the user's first reminder set up and Ribbit ready to help.
</context>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Desktop onboarding wizard (4 screens)**
   - Screen 1: "Meet Ribbit! 🐸" — introduce the mascot, explain the concept
   - Screen 2: "How it works" — timer fires → notification → acknowledge → earn XP
   - Screen 3: "Set your pace" — choose initial interval (15/30/45/60 min) and intensity (gentle/moderate/firm)
   - Screen 4: "You're all set!" — first reminder scheduled, Ribbit celebrates, CTA to view dashboard
   - Progress dots at the bottom, Skip button, Back/Next navigation

2. **Mobile onboarding (3 screens)**
   - Screen 1: "Your posture companion" — Ribbit introduction
   - Screen 2: "Notifications" — request push notification permission (required for the app to work)
   - Screen 3: "Ready!" — quick interval selection, start first timer
   - Must request notification permission before completing onboarding

3. **Detect first launch**
   - Store `has_completed_onboarding` in SQLite/app state
   - If false on app start: show onboarding before dashboard
   - If true: skip directly to dashboard
   - "Show onboarding again" option in Settings > General
</instructions>

<output_files>
Generate the following files:

1. `apps/desktop/src/pages/Onboarding.tsx` — Desktop onboarding wizard
2. `apps/desktop/src/components/onboarding/OnboardingStep.tsx` — Step component
3. `apps/mobile/app/onboarding.tsx` — Mobile onboarding screen
4. `apps/mobile/components/onboarding/OnboardingSlide.tsx` — Slide component
</output_files>

---

**Next**: [7.2 — Accessibility Polish](./02_accessibility_polish.md)
