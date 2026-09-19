# 2.3 Notification UI

## Context

<context>
This step creates polished, visually consistent notification designs for all 5 intensity levels. While Phase 1 implemented the functional notification system and Step 2.2 added the overlay windows, this step focuses on the visual design — making every notification feel premium, on-brand, and mascot-driven. The notification UI should feel like opening Duolingo: playful, polished, and personality-driven. Each level has a distinct visual treatment that communicates urgency through color, size, and animation.
</context>

## Prerequisites

<prerequisites>
- Steps 2.1–2.2 complete (Ribbit integration, L4/L5 overlay windows)
- Design system tokens available (colors, typography, shadows)
- Ribbit SVG assets in all states
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Design the notification component library**
   - Create `apps/desktop/src/components/notifications/` directory with components for each level
   - Each notification component receives: `message`, `ribbitState`, `onAcknowledge`, `onSnooze`, `onDismiss`
   - Shared base styles with level-specific overrides for:
     - Background color/gradient
     - Border treatment
     - Ribbit size and position
     - Text size and color
     - Button styling
     - Animation entrance/exit

2. **Level 1 — Whisper notification**
   - Minimal, subtle tooltip-style notification
   - Appears near the system tray area (bottom-right on Windows, top-right on macOS)
   - Small Ribbit face (32px) winking, next to a short message
   - Muted colors: surface-dark background, text-muted text
   - No buttons — tap anywhere to dismiss, or auto-dismiss in 10s
   - Entrance: subtle fade-in (200ms)
   - Exit: fade-out (200ms)

3. **Level 2 — Nudge notification**
   - Standard toast notification with personality
   - Positioned: bottom-right corner, 360px wide
   - Ribbit (48px) waving on the left, message on the right
   - Lily-pad green accent border on the left edge
   - Two small buttons: "✓ Got it!" and "💤 Snooze"
   - Soft shadow, rounded corners (12px)
   - Entrance: slide-in from the right (300ms ease-out)
   - Exit: slide-out to the right (200ms)

4. **Level 3 — Reminder notification**
   - Prominent banner notification
   - Positioned: bottom-right corner, 420px wide, taller than L2
   - Ribbit (64px) tapping screen pose, message with emphasis
   - Frog-green gradient background (subtle)
   - Two buttons: "✓ Sitting up!" (green, prominent) and "💤 Snooze 5 min" (text button)
   - Gentle pulsing glow on the border to draw attention
   - Entrance: slide-up with bounce (400ms spring)
   - Stays until acknowledged (no auto-dismiss)

5. **Level 4 — Alert overlay (redesign from Step 2.2)**
   - Apply premium visual design to the existing overlay window
   - Coral-alert gradient background with a dark card overlay
   - Large Ribbit (120px) with an animated attention-getting pose
   - Bold typography, urgent but not scary
   - Pulsing red-orange border animation
   - Buttons have press/hover states and micro-animations
   - Sound wave visualizer or pulsing icon to indicate alarm is active

6. **Level 5 — Wake Up! fullscreen (redesign from Step 2.2)**
   - Premium fullscreen experience — dramatic but not ugly
   - Dark background with animated gradient waves (slow-moving frog-green and coral)
   - Centered card: frosted glass effect (backdrop-blur), 600×450px
   - Extra-large Ribbit (200px) with panicking animation
   - Text: large, white, high-contrast
   - Button: oversized, glowing green, satisfying press animation
   - XP indicator: "+10 XP" badge that animates when button is pressed
   - The overall feel should be: "I need to acknowledge this" not "this app is annoying"

7. **Create shared notification animations**
   - `apps/desktop/src/components/notifications/animations.ts`
   - Framer Motion variants for: fadeIn, slideUp, slideRight, bounce, pulse, glow
   - Reusable across all notification levels
   - CSS keyframes for continuous effects (pulse, glow, breathing)
</instructions>

<requirements>
### Functional Requirements
- All 5 notification levels have distinct, premium visual designs
- Each level communicates its urgency through visual hierarchy (color, size, animation)
- Ribbit is present in every notification with the appropriate expression
- Buttons have hover, active, and focus states with micro-animations
- Notifications feel playful and on-brand, not clinical or alarming

### Technical Requirements
- Framer Motion for entrance/exit animations and interactive states
- CSS custom properties for theme-aware notification colors (light/dark mode)
- Notification windows render at 60fps (no dropped frames during animation)
- All text meets WCAG AA contrast requirements against notification backgrounds
- Notifications are positioned correctly on both Windows and macOS

### File Naming Conventions
- Components: PascalCase (`WhisperNotification.tsx`, `AlertOverlay.tsx`)
- Animations: camelCase (`animations.ts`)
</requirements>

<output_files>
Generate the following files:

1. `apps/desktop/src/components/notifications/WhisperNotification.tsx` — Level 1
2. `apps/desktop/src/components/notifications/NudgeNotification.tsx` — Level 2
3. `apps/desktop/src/components/notifications/ReminderNotification.tsx` — Level 3
4. `apps/desktop/src/components/notifications/animations.ts` — Shared animation variants
5. `apps/desktop/src/pages/NotificationOverlay.tsx` — MODIFIED: Level 4 premium redesign
6. `apps/desktop/src/pages/NotificationFullscreen.tsx` — MODIFIED: Level 5 premium redesign
</output_files>

## Verification

<verification>
- [ ] Level 1: subtle, minimal, near tray, auto-dismisses, Ribbit winks
- [ ] Level 2: clean toast, slides in from right, two buttons, soft sound
- [ ] Level 3: prominent banner, slides up with bounce, stays until acknowledged
- [ ] Level 4: overlay with premium design, pulsing border, alarm sound indicator
- [ ] Level 5: fullscreen with frosted glass card, dramatic but polished
- [ ] All notifications look premium in both light and dark mode
- [ ] Button hover/press animations feel responsive and satisfying
- [ ] Entrance/exit animations are smooth (60fps)
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Notifications don't position correctly on macOS | Different screen coordinate origin (top-left vs bottom-left) | Use Tauri's monitor API for cross-platform positioning |
| Framer Motion animations stutter | Too many animated properties at once | Animate only `transform` and `opacity` for GPU acceleration |
| Backdrop-blur not working (Level 5) | CSS `backdrop-filter` not supported in all WebView versions | Add fallback: solid dark background with 90% opacity |
| Notifications appear with wrong theme | Theme mode not passed to notification window | Pass theme as URL parameter when creating the overlay window |

---

**Previous**: [2.2 — Intensity Levels](./02_intensity_levels.md) | **Next**: [2.4 — Message Rotation System](./04_message_rotation_system.md)
