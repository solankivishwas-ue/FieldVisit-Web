// ThemeContext — manages light / dark mode for the whole app.
//
// Strategy:
//  • Tailwind `darkMode: 'class'` is used, so toggling dark mode means
//    adding/removing the `dark` class on the root <html> element.
//  • Preference is persisted in localStorage under key 'fv-theme'.
//  • On first load, respects the OS preference (prefers-color-scheme: dark)
//    if the user has not yet set an explicit preference.
//
// Usage:
//   const { isDark, toggleTheme } = useTheme();

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fv-theme';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark')  return true;
    if (stored === 'light') return false;
  } catch {
    // localStorage unavailable (private browsing in some browsers)
  }
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // ignore
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const dark = getInitialDark();
    // Apply immediately to avoid flash of wrong theme on mount
    applyTheme(dark);
    return dark;
  });

  // Keep HTML class in sync with state on every toggle
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>.');
  }
  return ctx;
}
