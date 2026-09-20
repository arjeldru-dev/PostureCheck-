import { create } from 'zustand';
import type { ResolvedThemeMode, ThemeMode, ThemeStoreState } from '../types/theme';

const STORAGE_KEY = 'posture-check-theme';

/**
 * Detect current system color scheme preference
 */
export function getSystemTheme(): ResolvedThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // default to Pond dark theme
}

/**
 * Resolve effective mode given a theme mode
 */
export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

/**
 * Read stored theme from localStorage if available
 */
function getInitialMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // Ignore storage read errors (e.g. security sandbox)
    }
  }
  return 'system';
}

/**
 * Apply theme to document element if in a DOM environment
 */
export function applyThemeToDocument(resolved: ResolvedThemeMode): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }
}

const initialMode = getInitialMode();
const initialResolved = resolveThemeMode(initialMode);

// Initialize document theme immediately if running in web/Tauri
if (typeof document !== 'undefined') {
  applyThemeToDocument(initialResolved);
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  mode: initialMode,
  resolvedMode: initialResolved,
  setMode: (mode: ThemeMode) => {
    const resolved = resolveThemeMode(mode);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore storage write errors
      }
    }

    applyThemeToDocument(resolved);

    set({
      mode,
      resolvedMode: resolved,
    });
  },
}));

// Set up system preference change listener in browser environments
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      const state = useThemeStore.getState();
      if (state.mode === 'system') {
        const resolved: ResolvedThemeMode = e.matches ? 'dark' : 'light';
        applyThemeToDocument(resolved);
        useThemeStore.setState({ resolvedMode: resolved });
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
    } else if (typeof (mediaQuery as MediaQueryList).addListener === 'function') {
      (mediaQuery as MediaQueryList).addListener(listener);
    }
  } catch {
    // Ignore mediaQuery registration errors
  }
}
