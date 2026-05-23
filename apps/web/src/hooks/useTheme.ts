import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'atx-theme';

/**
 * Theme management hook.
 * Supports dark, light, and system (auto-detect OS preference).
 * Persists the user's choice in localStorage.
 * Applies the theme by setting the `data-theme` attribute on <html>.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
  });

  const getSystemTheme = useCallback((): 'dark' | 'light' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;

    // Add transitioning class for smooth color change
    root.setAttribute('data-theme-transitioning', '');
    root.setAttribute('data-theme', resolvedTheme);

    const timeout = setTimeout(() => {
      root.removeAttribute('data-theme-transitioning');
    }, 250);

    localStorage.setItem(STORAGE_KEY, theme);

    // Listen for OS theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => {
        clearTimeout(timeout);
        mediaQuery.removeEventListener('change', handler);
      };
    }

    return () => clearTimeout(timeout);
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return { theme, resolvedTheme, setTheme } as const;
}
