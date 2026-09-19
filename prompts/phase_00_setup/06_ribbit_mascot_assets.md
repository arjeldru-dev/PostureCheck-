# 0.6 Ribbit Mascot Assets

## Context

<context>
This step creates the Ribbit frog mascot assets for Posture Check!. Ribbit is the personality of the entire app — every notification, every screen, and every celebration features this character. Ribbit has 7 emotional states (idle, reminding, encouraging, celebrating, concerned, sleeping, disappointed) that map to different app contexts. At this stage, we create SVG assets for each state. Animations (CSS/Framer Motion for desktop, React Native Animated/Lottie for mobile) will be added in Phase 2 when Ribbit is integrated into the notification system.
</context>

## Prerequisites

<prerequisites>
- Steps 0.1–0.5 are complete
- Design tokens established (frog-green palette, typography)
- Art direction decision: **flat vector SVG** style — modern, clean, friendly, not childish
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Define Ribbit's character design specifications**
   - Style: Flat vector, modern and clean. Think Duolingo's owl but as a frog. Friendly, approachable, not overly detailed.
   - Primary color: Frog Green (`#4CAF50`) with lighter belly (`#81C784`)
   - Eye style: Large, expressive, round eyes with simple dot pupils
   - Size: Designed at 200×200 viewport, scalable
   - Accessories: None for MVP (accessories are a V1.1 cosmetic feature)

2. **Create SVG assets for each Ribbit state**
   - Create 7 SVG files, one per emotional state:

   | State | File | Expression | Context |
   |-------|------|------------|---------|
   | Idle | `ribbit-idle.svg` | Sitting on lily pad, neutral happy face, blinking eyes | Dashboard home screen |
   | Reminding | `ribbit-reminding.svg` | Standing upright, one arm raised tapping, alert expression | Notification time |
   | Encouraging | `ribbit-encouraging.svg` | Thumbs up, big smile, slightly tilted | User acknowledges reminder |
   | Celebrating | `ribbit-celebrating.svg` | Jumping pose, arms up, confetti around, huge grin | Streak milestone, level up, achievement |
   | Concerned | `ribbit-concerned.svg` | Tilted head, worried eyes, slight frown | Long time without acknowledgment |
   | Sleeping | `ribbit-sleeping.svg` | Eyes closed, Zzz text bubbles, relaxed pose | DND / paused mode |
   | Disappointed | `ribbit-disappointed.svg` | Slightly sad expression, droopy eyes, small frown | Broken streak |

3. **Create the Ribbit React component for desktop**
   - `apps/desktop/src/components/ribbit/RibbitMascot.tsx`:
     - Props: `state: RibbitState`, `size: 'sm' | 'md' | 'lg' | 'xl'`, `className?: string`
     - Renders the appropriate SVG based on state
     - Size mappings: sm=48px, md=96px, lg=160px, xl=240px
     - Includes a subtle idle breathing animation (CSS scale pulse) applied to all states

4. **Create the Ribbit React Native component for mobile**
   - `apps/mobile/components/ribbit/RibbitMascot.tsx`:
     - Same props interface as desktop
     - Uses `react-native-svg` to render SVGs natively
     - Same size mappings adjusted for mobile density

5. **Define the RibbitState type in the shared package**
   - In `packages/shared/src/types/ribbit.ts`:
     - `type RibbitState = 'idle' | 'reminding' | 'encouraging' | 'celebrating' | 'concerned' | 'sleeping' | 'disappointed'`
     - `interface RibbitConfig { state: RibbitState; message?: string; showAnimation?: boolean }`
   - Export from shared package

6. **Create the app icon and tray icon from Ribbit**
   - `apps/desktop/src-tauri/icons/` — Tauri app icons at required sizes (32×32, 128×128, 256×256, icon.ico)
   - Generate from the idle Ribbit face, simplified for small sizes
   - Tray icon variants: active (green frog face), paused (sleeping frog), alert (frog with clock)

7. **Create placeholder mobile app icon and splash screen**
   - `apps/mobile/assets/icon.png` — 1024×1024 app icon (Ribbit face on green background)
   - `apps/mobile/assets/splash.png` — Splash screen with Ribbit centered on frog-green gradient
   - `apps/mobile/assets/adaptive-icon.png` — Android adaptive icon
</instructions>

<requirements>
### Functional Requirements
- All 7 Ribbit states render correctly as SVGs on both desktop and mobile
- The RibbitMascot component accepts a `state` prop and renders the corresponding SVG
- Ribbit has a subtle idle breathing animation (gentle scale pulse, 3-second cycle)
- Tray icons are visually distinct at 16×16 and 32×32 pixel sizes
- App icons are recognizable at small sizes (App Store grid, home screen)

### Technical Requirements
- SVGs are optimized (no unnecessary groups, minimal path data)
- SVGs use `currentColor` or the design token colors (not hardcoded hex outside the palette)
- React component supports all 4 size presets with proper scaling
- Mobile component uses `react-native-svg` for native rendering (not WebView)
- Icons exported in all required formats: ICO (Windows), ICNS (macOS), PNG (Linux, mobile)

### File Naming Conventions
- SVG assets: `ribbit-[state].svg` (lowercase, kebab-case)
- Components: PascalCase (`RibbitMascot.tsx`)
- Type files: kebab-case (`ribbit.ts`)
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/types/ribbit.ts` — RibbitState type and config interface
2. `apps/desktop/src/assets/mascot/ribbit-idle.svg` — Idle state SVG
3. `apps/desktop/src/assets/mascot/ribbit-reminding.svg` — Reminding state SVG
4. `apps/desktop/src/assets/mascot/ribbit-encouraging.svg` — Encouraging state SVG
5. `apps/desktop/src/assets/mascot/ribbit-celebrating.svg` — Celebrating state SVG
6. `apps/desktop/src/assets/mascot/ribbit-concerned.svg` — Concerned state SVG
7. `apps/desktop/src/assets/mascot/ribbit-sleeping.svg` — Sleeping state SVG
8. `apps/desktop/src/assets/mascot/ribbit-disappointed.svg` — Disappointed state SVG
9. `apps/desktop/src/components/ribbit/RibbitMascot.tsx` — Desktop Ribbit component
10. `apps/mobile/components/ribbit/RibbitMascot.tsx` — Mobile Ribbit component
11. `apps/mobile/assets/icon.png` — Mobile app icon (1024×1024)
12. `apps/mobile/assets/splash.png` — Splash screen
13. `apps/mobile/assets/adaptive-icon.png` — Android adaptive icon
14. `apps/desktop/src-tauri/icons/icon.ico` — Windows tray/app icon
15. `apps/desktop/src-tauri/icons/icon.png` — Linux app icon (256×256)
</output_files>

## Directory Structure

After completing this step, the project should have:

```
posture-check/
├── packages/
│   └── shared/
│       └── src/
│           └── types/
│               └── ribbit.ts              ← NEW
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   └── mascot/
│   │   │   │       ├── ribbit-idle.svg
│   │   │   │       ├── ribbit-reminding.svg
│   │   │   │       ├── ribbit-encouraging.svg
│   │   │   │       ├── ribbit-celebrating.svg
│   │   │   │       ├── ribbit-concerned.svg
│   │   │   │       ├── ribbit-sleeping.svg
│   │   │   │       └── ribbit-disappointed.svg
│   │   │   └── components/
│   │   │       └── ribbit/
│   │   │           └── RibbitMascot.tsx
│   │   └── src-tauri/
│   │       └── icons/
│   │           ├── icon.ico
│   │           └── icon.png
│   └── mobile/
│       ├── assets/
│       │   ├── icon.png
│       │   ├── splash.png
│       │   └── adaptive-icon.png
│       └── components/
│           └── ribbit/
│               └── RibbitMascot.tsx
```

## Verification

<verification>
After completing this step, confirm:

- [ ] All 7 SVG files render correctly in a browser (open directly or via the desktop app)
- [ ] `<RibbitMascot state="idle" size="lg" />` renders the idle frog at 160px on desktop
- [ ] `<RibbitMascot state="celebrating" size="md" />` renders the celebrating frog on mobile
- [ ] The breathing animation (idle pulse) is visible and smooth (not jarring)
- [ ] Tray icon is visible and distinguishable at 16×16 pixels in the system tray
- [ ] Mobile app icon renders correctly in the simulator app list
- [ ] Splash screen displays on mobile app launch
- [ ] TypeScript type `RibbitState` is importable from `@posture-check/shared`
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| SVG not rendering in React | Missing SVG loader in Vite | Install `vite-plugin-svgr` and configure in `vite.config.ts` |
| SVG not rendering in React Native | Missing `react-native-svg` | Install `react-native-svg` and `react-native-svg-transformer`, configure Metro |
| Tray icon appears blurry | Wrong resolution for HiDPI/Retina | Provide @2x versions (64×64 for 32×32 display) |
| Breathing animation is janky | CSS animation not using `transform` | Use `transform: scale()` instead of `width/height` for GPU-accelerated animation |
| Mobile splash screen not showing | Incorrect config in `app.config.ts` | Verify `splash.image` path and `splash.backgroundColor` in Expo config |

---

**Previous**: [0.5 — Design System Tokens](./05_design_system_tokens.md)

---

**Proceed to Phase Checklist**: [Phase 0 Checklist](./99_PHASE_CHECKLIST.md)
