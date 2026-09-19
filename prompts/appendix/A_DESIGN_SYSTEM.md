# Appendix A: Design System Reference

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `frog-green` | `#4CAF50` | Primary accent, buttons, active states |
| `frog-green-light` | `#66BB6A` | Gradient end, hover states |
| `lily-pad` | `#81C784` | Secondary accent, borders |
| `pond-dark` | `#1A2332` | Dark mode background |
| `pond-light` | `#F5F7FA` | Light mode background |
| `golden-xp` | `#FFD54F` | XP, rewards, achievements |
| `coral-alert` | `#FF7043` | Alerts, errors, Level 5 |
| `sky-blue` | `#42A5F5` | Info, links, accents |
| `surface-dark` | `#243447` | Dark mode cards |
| `surface-light` | `#FFFFFF` | Light mode cards |
| `text-primary-dark` | `#E8ECF0` | Body text (dark mode) |
| `text-primary-light` | `#1A2332` | Body text (light mode) |
| `text-muted-dark` | `#8A9BB5` | Secondary text (dark mode) |
| `text-muted-light` | `#6B7C93` | Secondary text (light mode) |

## Typography

| Token | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| `font-display` | Outfit | 700 | 24–40px | Headers, titles |
| `font-body` | Inter | 400/500 | 14–16px | Body text, descriptions |
| `font-mono` | JetBrains Mono | 500 | 14–24px | Numbers, stats, XP, countdown |

## Spacing Scale

`4px` | `8px` | `12px` | `16px` | `20px` | `24px` | `32px` | `48px` | `64px` | `96px`

## Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `4px` | Badges, small elements |
| `rounded-md` | `8px` | Buttons, inputs |
| `rounded-lg` | `12px` | Cards, containers |
| `rounded-xl` | `16px` | Modals, large cards |
| `rounded-2xl` | `24px` | Feature cards |
| `rounded-full` | `9999px` | Avatars, circular elements |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.12)` | Subtle elevation |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.15)` | Cards, modals |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.2)` | Overlays, dropdowns |
| `shadow-glow-green` | `0 0 20px rgba(76,175,80,0.3)` | Active/selected states |
| `shadow-glow-golden` | `0 0 20px rgba(255,213,79,0.3)` | XP/achievement highlights |

## Animation Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `duration-fast` | `150ms` | ease-out | Hover states, tooltips |
| `duration-normal` | `250ms` | ease-out | Transitions, fades |
| `duration-slow` | `400ms` | ease-in-out | Page transitions, modals |
| `duration-breathing` | `3000ms` | ease-in-out | Ribbit idle animation |

## Ribbit Mascot States

| State | SVG File | Expression | When |
|-------|----------|-----------|------|
| Idle | `ribbit-idle.svg` | Happy, neutral | Default dashboard |
| Reminding | `ribbit-reminding.svg` | Alert, tapping | Notification time |
| Encouraging | `ribbit-encouraging.svg` | Thumbs up, smile | After acknowledge |
| Celebrating | `ribbit-celebrating.svg` | Jumping, confetti | Level up, streak milestone |
| Concerned | `ribbit-concerned.svg` | Worried, tilted | Ignored reminder |
| Sleeping | `ribbit-sleeping.svg` | Eyes closed, Zzz | DND / paused |
| Disappointed | `ribbit-disappointed.svg` | Sad, droopy | Broken streak |
