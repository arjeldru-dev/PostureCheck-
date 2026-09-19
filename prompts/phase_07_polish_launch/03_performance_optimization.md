# 7.3 Performance Optimization

## Context

<context>
This step audits and optimizes performance across both the desktop and mobile apps. The desktop app must feel instant (it's a native Tauri app). The mobile app must scroll at 60fps and launch quickly. Focus areas: bundle size, render performance, memory leaks, animation optimization, and startup time.
</context>

## AI Implementation Prompt

<instructions>
Think step by step:

1. **Desktop bundle optimization**
   - Analyze Vite bundle with `rollup-plugin-visualizer`
   - Tree-shake unused imports from shared package
   - Lazy-load heavy components (Charts, DesignSystem page)
   - SVG optimization: run SVGO on all Ribbit assets
   - Target: < 500KB JS bundle (gzipped)

2. **Desktop render performance**
   - React DevTools Profiler: identify unnecessary re-renders
   - Memoize expensive components (`React.memo`, `useMemo`)
   - Timer countdown: use `requestAnimationFrame` not `setInterval`
   - Confetti: Canvas-based, not DOM particles
   - SQLite queries: cached with stale-while-revalidate pattern

3. **Mobile optimization**
   - Reduce TTI (Time to Interactive): defer non-critical initializations
   - Use `FlatList` with `getItemLayout` for scrollable lists
   - Image optimization: use compressed PNGs, consider `expo-image`
   - Minimize bridge calls (batch Supabase queries)
   - Target: < 3 second cold start on mid-range Android device

4. **Memory leak prevention**
   - Clean up all event listeners on component unmount
   - Clean up Tauri event subscriptions
   - Clean up Supabase Realtime subscriptions
   - Cancel pending async operations on unmount
   - Test with extended use: run app for 1 hour, check memory usage
</instructions>

<output_files>
Generate the following files:

1. `apps/desktop/vite.config.ts` — MODIFIED: add bundle analysis and optimization plugins
2. `apps/desktop/src/App.tsx` — MODIFIED: lazy load routes
</output_files>

---

**Previous**: [7.2 — Accessibility Polish](./02_accessibility_polish.md) | **Next**: [7.4 — Error Handling](./04_error_handling.md)
