# 0.5 Design System Tokens

## Context

<context>
This step establishes the shared design system for Posture Check! — colors, typography, spacing, shadows, border radii, and animation tokens that are consistent across the desktop (Tailwind CSS 4) and mobile (NativeWind 4) apps. The design system is inspired by Duolingo's playful engagement, Forest's calm gamification, and Headspace's clean UI. The frog mascot theme drives the green-dominant palette. This step creates the foundational tokens; actual UI components are built in later phases.
</context>

## Prerequisites

<prerequisites>
- Steps 0.1–0.4 are complete
- Tailwind CSS 4 configured in `apps/desktop/` (from Step 0.2)
- NativeWind 4 configured in `apps/mobile/` (from Step 0.3)
- Design reference: Section 5 of the project specification
</prerequisites>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Define the color palette as shared constants**
   - Update `packages/shared/src/constants/design-tokens.ts` with the full color palette from the spec:
     - Frog Green (Primary): `#4CAF50` → `#66BB6A` (gradient range)
     - Lily Pad (Secondary): `#81C784`
     - Pond Dark (Background): `#1A2332`
     - Pond Light (Background): `#F5F7FA`
     - Golden XP: `#FFD54F`
     - Coral Alert: `#FF7043`
     - Sky Blue (Accent): `#42A5F5`
     - Surface Dark: `#243447`
     - Surface Light: `#FFFFFF`
     - Text Primary Dark: `#E8ECF0`, Light: `#1A2332`
     - Text Muted Dark: `#8A9BB5`, Light: `#6B7C93`
   - Include semantic color mappings: `success`, `warning`, `error`, `info`
   - Include opacity variants for overlays and disabled states

2. **Configure Tailwind CSS 4 theme for desktop**
   - Update `apps/desktop/src/index.css` with `@theme` block containing:
     - All PostureCheck colors as custom properties
     - Typography: Outfit (display), Inter (body), JetBrains Mono (monospace)
     - Font sizes: xs through 5xl with appropriate line heights
     - Spacing scale: 0.5 through 24 (rem-based)
     - Border radii: sm, md, lg, xl, 2xl, full
     - Shadows: sm, md, lg, xl (styled for the dark "pond" theme)
     - Animations: fade-in, slide-up, slide-down, scale-in, pulse, bounce, confetti
   - Add `@font-face` declarations for Google Fonts (Outfit, Inter, JetBrains Mono) or use Google Fonts CDN in `index.html`
   - Create dark and light theme variants using CSS custom properties on `:root` and `[data-theme="dark"]`

3. **Configure NativeWind 4 theme for mobile**
   - Update `apps/mobile/global.css` with matching tokens
   - Ensure the same color names, spacing, and typography scales are available
   - Add platform-specific adjustments:
     - Safe area padding for iOS notch
     - Status bar height considerations
     - Touch-target minimum sizes (44×44 points)
   - Configure dark/light mode using `prefers-color-scheme` media query

4. **Create a shared theme type definition**
   - In `packages/shared/src/types/theme.ts`, define TypeScript types for:
     - `ColorPalette` — all color tokens
     - `ThemeMode` — 'light' | 'dark' | 'system'
     - `DesignTokens` — complete token set (colors, spacing, radii, etc.)
   - Export from the shared package

5. **Create a theme context/store for runtime theme switching**
   - In `packages/shared/src/stores/theme-store.ts`, create a Zustand store for theme state:
     - `mode`: 'light' | 'dark' | 'system'
     - `resolvedMode`: 'light' | 'dark' (computed from system preference if mode is 'system')
     - `setMode(mode)`: action to change theme
   - This store will be used by both desktop and mobile apps

6. **Create a design system documentation component**
   - In `apps/desktop/src/pages/DesignSystem.tsx`, create a page that renders all design tokens visually:
     - Color swatches with labels and hex values
     - Typography samples at each scale
     - Spacing examples
     - Border radius examples
     - Shadow examples
   - This page is for development reference only (not visible to end users)
</instructions>

<requirements>
### Functional Requirements
- All PostureCheck colors from spec Section 5 are available as Tailwind/NativeWind classes
- Typography uses Outfit (display), Inter (body), JetBrains Mono (stats/numbers)
- Dark mode and light mode are fully themed with appropriate contrast ratios
- Theme switching works at runtime (not just media-query based)

### Technical Requirements
- Tailwind CSS 4 CSS-first configuration (`@theme` blocks, not `tailwind.config.js`)
- NativeWind 4 theme must match desktop tokens exactly
- Colors must meet WCAG 2.1 AA contrast ratio (4.5:1 for body text, 3:1 for large text)
- All tokens exported as TypeScript constants for programmatic access
- Design tokens shared via `@posture-check/shared` for consistency

### File Naming Conventions
- Design token files: kebab-case (`design-tokens.ts`)
- Theme store: camelCase (`theme-store.ts`)
- CSS files: kebab-case (`index.css`, `global.css`)
</requirements>

<output_files>
Generate the following files:

1. `packages/shared/src/constants/design-tokens.ts` — All color, spacing, and typography constants
2. `packages/shared/src/types/theme.ts` — Theme type definitions
3. `packages/shared/src/stores/theme-store.ts` — Zustand theme store
4. `apps/desktop/src/index.css` — MODIFIED: Full Tailwind CSS 4 theme with all PostureCheck tokens
5. `apps/desktop/index.html` — MODIFIED: Add Google Fonts links (Outfit, Inter, JetBrains Mono)
6. `apps/desktop/src/pages/DesignSystem.tsx` — Design token reference page
7. `apps/mobile/global.css` — MODIFIED: Full NativeWind 4 theme with matching tokens
</output_files>

## Directory Structure

After completing this step, the project should have:

```
posture-check/
├── packages/
│   └── shared/
│       └── src/
│           ├── constants/
│           │   ├── index.ts          ← MODIFIED (re-export design-tokens)
│           │   └── design-tokens.ts  ← NEW
│           ├── types/
│           │   ├── index.ts          ← MODIFIED (re-export theme)
│           │   └── theme.ts          ← NEW
│           └── stores/
│               └── theme-store.ts    ← NEW
├── apps/
│   ├── desktop/
│   │   ├── index.html               ← MODIFIED (Google Fonts)
│   │   └── src/
│   │       ├── index.css             ← MODIFIED (full theme)
│   │       └── pages/
│   │           └── DesignSystem.tsx   ← NEW
│   └── mobile/
│       └── global.css                ← MODIFIED (full theme)
```

## Verification

<verification>
After completing this step, confirm:

- [ ] Desktop app: `className="bg-frog-green text-white"` renders correct green (#4CAF50) with white text
- [ ] Desktop app: `className="font-display text-3xl"` renders in Outfit font
- [ ] Desktop app: `className="font-mono text-sm"` renders in JetBrains Mono
- [ ] Desktop app: dark mode toggle switches all surfaces, text, and accent colors correctly
- [ ] Mobile app: same NativeWind classes produce matching colors and typography
- [ ] DesignSystem page renders all color swatches, typography, and spacing samples
- [ ] `import { COLORS, FONT_SIZES } from '@posture-check/shared'` works in both apps
- [ ] Contrast ratios meet WCAG AA for all text/background combinations in both themes
</verification>

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Google Fonts not loading | CDN link incorrect or missing | Verify the `<link>` tag in `index.html`, use `fonts.googleapis.com` with `display=swap` |
| Custom colors not available in Tailwind | Wrong CSS variable syntax | In Tailwind CSS 4, use `@theme { --color-frog-green: #4CAF50; }` syntax |
| NativeWind colors don't match desktop | Different token names or values | Ensure `global.css` uses identical `@theme` values as `index.css` |
| Dark mode flickers on load | Theme not applied before React hydration | Set initial theme via a `<script>` tag in `index.html` that reads from localStorage before React mounts |
| Fonts not rendering on mobile | React Native doesn't load web fonts the same way | Use `expo-font` to load fonts, or `expo install @expo-google-fonts/outfit @expo-google-fonts/inter` |

---

**Previous**: [0.4 — Supabase Setup](./04_supabase_setup.md) | **Next**: [0.6 — Ribbit Mascot Assets](./06_ribbit_mascot_assets.md)
