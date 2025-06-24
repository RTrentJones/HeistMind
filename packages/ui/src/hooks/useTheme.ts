/**
 * useTheme hook
 * Provides theme management functionality
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  /** Current theme setting */
  theme: Theme;
  /** Resolved theme (system resolved to light/dark) */
  resolvedTheme: 'light' | 'dark';
  /** Whether system theme is dark */
  systemTheme: 'light' | 'dark';
}

const THEME_STORAGE_KEY = 'ui-theme';

/**
 * Hook for managing theme state
 */
export const useTheme = (): ThemeState & {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme);
    };
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(resolvedTheme);

    // Set data attribute for CSS access
    root.setAttribute('data-theme', resolvedTheme);
  }, [theme, systemTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = theme === 'system' ? systemTheme : theme;
    const newTheme = currentResolved === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, systemTheme, setTheme]);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  return {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
  };
};
