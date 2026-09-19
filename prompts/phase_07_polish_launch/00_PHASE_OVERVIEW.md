# Phase 7: Polish & Launch

> **Objective**: Final quality pass — accessibility, performance optimization, onboarding flow, error handling, analytics stub, and build/distribution preparation for both desktop (Tauri) and mobile (EAS Build).
> **Duration**: 2 weeks
> **Dependencies**: Phase 6 (Push Routing) must be complete

---

## Phase Goals

1. ✅ Onboarding flow for first-time users (desktop and mobile)
2. ✅ Accessibility improvements (keyboard nav, screen reader, reduced motion)
3. ✅ Performance audit and optimization
4. ✅ Comprehensive error handling with user-friendly messages
5. ✅ Production build configuration for Tauri and Expo

## Prompt Files in This Phase

| # | Prompt | Purpose |
|---|--------|---------|
| 7.1 | [01_onboarding_flow.md](01_onboarding_flow.md) | First-time user experience, welcome screens, tutorial |
| 7.2 | [02_accessibility_polish.md](02_accessibility_polish.md) | Keyboard nav, screen reader, reduced motion |
| 7.3 | [03_performance_optimization.md](03_performance_optimization.md) | Bundle size, render perf, memory leaks |
| 7.4 | [04_error_handling.md](04_error_handling.md) | Graceful errors, offline states, crash recovery |
| 7.5 | [05_build_distribution.md](05_build_distribution.md) | Tauri build, EAS Build, code signing, distribution |

## Exit Criteria

- [ ] First-time user sees a welcoming onboarding flow that explains the app
- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader announces all key content
- [ ] App handles offline, errors, and crashes gracefully
- [ ] Tauri produces a signed installer for Windows/macOS/Linux
- [ ] EAS Build produces a signed IPA and APK

---

This is the **final phase** of MVP development.
