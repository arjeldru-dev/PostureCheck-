# 7.2 Accessibility Polish

## Context

<context>
This step ensures Posture Check! is accessible to all users — including those who use keyboards, screen readers, or have motion sensitivities. Accessibility is not optional; it's a quality requirement. This covers WCAG 2.1 AA compliance for the desktop app and platform accessibility guidelines for mobile.
</context>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Keyboard navigation**
   - All interactive elements are focusable and operable via keyboard
   - Tab order follows logical reading order
   - Focus indicators are visible (2px frog-green outline)
   - Escape key closes modals and overlays
   - Arrow keys navigate within tab bars and radio groups
   - Enter/Space activate buttons

2. **Screen reader support**
   - All images have meaningful alt text (Ribbit states: "Ribbit the frog mascot, idle")
   - Form controls have associated labels
   - Status messages use `aria-live` regions (XP gained, timer countdown)
   - Navigation landmarks: `main`, `nav`, `header`, `aside`
   - Achievement unlocks announced via `aria-live="assertive"`

3. **Reduced motion**
   - Detect `prefers-reduced-motion: reduce` media query
   - Disable: confetti, breathing animation, slide transitions, bounce effects
   - Replace with: simple opacity fades, instant state changes
   - Celebration modals still appear but without particle effects

4. **Color contrast**
   - All text/background combinations meet WCAG AA (4.5:1 body, 3:1 large)
   - Don't rely on color alone to convey information (add icons/text)
   - Focus indicators visible in both light and dark themes

5. **Mobile accessibility**
   - Touch targets minimum 44×44pt
   - `accessibilityLabel` on all touchable elements
   - `accessibilityRole` set correctly (button, link, tab, etc.)
   - VoiceOver (iOS) and TalkBack (Android) tested
</instructions>

<output_files>
Generate the following files:

1. `apps/desktop/src/hooks/useReducedMotion.ts` — Reduced motion detection hook
2. `apps/desktop/src/index.css` — MODIFIED: add focus styles and reduced motion queries
3. `apps/mobile/hooks/useReducedMotion.ts` — Mobile reduced motion hook
</output_files>

---

**Previous**: [7.1 — Onboarding Flow](./01_onboarding_flow.md) | **Next**: [7.3 — Performance Optimization](./03_performance_optimization.md)
