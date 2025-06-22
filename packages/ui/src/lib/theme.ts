/**
 * Comprehensive theme system for HeistMind UI
 * Provides consistent theming with dark/light mode support
 */

import * as React from 'react';

// Theme configuration interface
export interface ThemeConfig {
  // Core colors
  colors: {
    // Background colors
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
      glass: string;
    };

    // Foreground colors
    foreground: {
      primary: string;
      secondary: string;
      muted: string;
      disabled: string;
    };

    // Brand colors
    brand: {
      primary: string;
      secondary: string;
      accent: string;
    };

    // Semantic colors
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };

    // Game-specific colors
    game: {
      ember: string;
      steel: string;
      shadow: string;
      crimson: string;
      gold: string;
      whisper: string;
    };

    // Border colors
    border: {
      primary: string;
      secondary: string;
      muted: string;
      focus: string;
    };
  };

  // Spacing scale
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };

  // Typography scale
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };

  // Shadow system
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    glow: string;
    neumorphic: {
      raised: string;
      flat: string;
      pressed: string;
    };
  };

  // Border radius
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };

  // Animation durations
  animation: {
    fast: string;
    normal: string;
    slow: string;
  };
}

// Dark theme configuration
const darkTheme: ThemeConfig = {
  colors: {
    background: {
      primary: 'hsl(240 10% 3.9%)', // zinc-950
      secondary: 'hsl(240 5.9% 10%)', // zinc-900
      tertiary: 'hsl(240 4.8% 15.9%)', // zinc-800
      elevated: 'hsl(240 3.7% 21.9%)', // zinc-750
      glass: 'hsla(0 0% 100% / 0.05)',
    },
    foreground: {
      primary: 'hsl(0 0% 98%)', // zinc-50
      secondary: 'hsl(240 5% 84.1%)', // zinc-300
      muted: 'hsl(240 3.8% 46.1%)', // zinc-600
      disabled: 'hsl(240 5% 64.9%)', // zinc-500
    },
    brand: {
      primary: 'hsl(262.1 83.3% 57.8%)', // purple-500
      secondary: 'hsl(263.4 70% 50.4%)', // purple-600
      accent: 'hsl(270.7 91% 65.1%)', // purple-400
    },
    semantic: {
      success: 'hsl(142.1 76.2% 36.3%)', // green-600
      warning: 'hsl(32.6 94.6% 43.7%)', // orange-500
      error: 'hsl(346.8 77.2% 49.8%)', // red-500
      info: 'hsl(217.2 91.2% 59.8%)', // blue-500
    },
    game: {
      ember: 'hsl(14.3 100% 53.3%)', // orange-500 to red-500 gradient
      steel: 'hsl(217.2 91.2% 59.8%)', // blue-500
      shadow: 'hsl(220.9 39.3% 11%)', // slate-900
      crimson: 'hsl(346.8 77.2% 49.8%)', // red-500
      gold: 'hsl(45.4 93.4% 47.5%)', // yellow-400
      whisper: 'hsl(240 4.8% 95.9%)', // zinc-100 (for contrast)
    },
    border: {
      primary: 'hsl(240 3.7% 15.9%)', // zinc-800
      secondary: 'hsl(240 4.8% 21.9%)', // zinc-750
      muted: 'hsl(240 3.8% 46.1%)', // zinc-600
      focus: 'hsl(262.1 83.3% 57.8%)', // purple-500
    },
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },
  typography: {
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '2rem', // 32px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgb(147 51 234 / 0.5)',
    neumorphic: {
      raised: '8px 8px 16px hsl(240 10% 2%), -8px -8px 16px hsl(240 5% 8%)',
      flat: '4px 4px 8px hsl(240 10% 2%), -4px -4px 8px hsl(240 5% 8%)',
      pressed: 'inset 4px 4px 8px hsl(240 10% 2%), inset -4px -4px 8px hsl(240 5% 8%)',
    },
  },
  radius: {
    none: '0',
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    full: '9999px',
  },
  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
};

// Light theme configuration
const lightTheme: ThemeConfig = {
  colors: {
    background: {
      primary: 'hsl(0 0% 100%)', // white
      secondary: 'hsl(240 4.8% 95.9%)', // zinc-100
      tertiary: 'hsl(240 5.9% 90%)', // zinc-200
      elevated: 'hsl(0 0% 100%)', // white with shadow
      glass: 'hsla(0 0% 100% / 0.8)',
    },
    foreground: {
      primary: 'hsl(240 10% 3.9%)', // zinc-950
      secondary: 'hsl(240 5.9% 10%)', // zinc-900
      muted: 'hsl(240 3.8% 46.1%)', // zinc-600
      disabled: 'hsl(240 5% 64.9%)', // zinc-500
    },
    brand: {
      primary: 'hsl(262.1 83.3% 57.8%)', // purple-500
      secondary: 'hsl(263.4 70% 50.4%)', // purple-600
      accent: 'hsl(270.7 91% 65.1%)', // purple-400
    },
    semantic: {
      success: 'hsl(142.1 76.2% 36.3%)', // green-600
      warning: 'hsl(32.6 94.6% 43.7%)', // orange-500
      error: 'hsl(346.8 77.2% 49.8%)', // red-500
      info: 'hsl(217.2 91.2% 59.8%)', // blue-500
    },
    game: {
      ember: 'hsl(14.3 100% 53.3%)', // orange-500
      steel: 'hsl(217.2 91.2% 59.8%)', // blue-500
      shadow: 'hsl(215.4 16.3% 46.9%)', // slate-600 (lighter for light mode)
      crimson: 'hsl(346.8 77.2% 49.8%)', // red-500
      gold: 'hsl(45.4 93.4% 47.5%)', // yellow-400
      whisper: 'hsl(240 4.8% 95.9%)', // zinc-100
    },
    border: {
      primary: 'hsl(240 5.9% 90%)', // zinc-200
      secondary: 'hsl(240 4.8% 83.9%)', // zinc-300
      muted: 'hsl(240 3.8% 46.1%)', // zinc-600
      focus: 'hsl(262.1 83.3% 57.8%)', // purple-500
    },
  },
  spacing: darkTheme.spacing,
  typography: darkTheme.typography,
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgb(147 51 234 / 0.3)',
    neumorphic: {
      raised: '8px 8px 16px hsl(240 5% 85%), -8px -8px 16px hsl(0 0% 100%)',
      flat: '4px 4px 8px hsl(240 5% 85%), -4px -4px 8px hsl(0 0% 100%)',
      pressed: 'inset 4px 4px 8px hsl(240 5% 85%), inset -4px -4px 8px hsl(0 0% 100%)',
    },
  },
  radius: darkTheme.radius,
  animation: darkTheme.animation,
};

// Theme context
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeConfig;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  systemPreference: 'light' | 'dark';
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

// Theme provider component
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  storageKey = 'heistmind-theme',
}: ThemeProviderProps) {
  const [mode, setModeState] = React.useState<ThemeMode>(defaultMode);
  const [systemPreference, setSystemPreference] = React.useState<'light' | 'dark'>('dark');

  // Initialize theme from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setModeState(stored as ThemeMode);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }, [storageKey]);

  // Listen for system preference changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update localStorage when mode changes
  const setMode = React.useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      try {
        localStorage.setItem(storageKey, newMode);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    },
    [storageKey]
  );

  // Calculate resolved mode
  const resolvedMode = mode === 'system' ? systemPreference : mode;

  // Get current theme
  const theme = resolvedMode === 'light' ? lightTheme : darkTheme;

  // Apply theme to document
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);

    // Set CSS custom properties for dynamic theming
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-background-${key}`, value);
    });

    Object.entries(theme.colors.foreground).forEach(([key, value]) => {
      root.style.setProperty(`--color-foreground-${key}`, value);
    });

    Object.entries(theme.colors.brand).forEach(([key, value]) => {
      root.style.setProperty(`--color-brand-${key}`, value);
    });

    Object.entries(theme.colors.semantic).forEach(([key, value]) => {
      root.style.setProperty(`--color-semantic-${key}`, value);
    });

    Object.entries(theme.colors.game).forEach(([key, value]) => {
      root.style.setProperty(`--color-game-${key}`, value);
    });

    Object.entries(theme.colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--color-border-${key}`, value);
    });
  }, [theme, resolvedMode]);

  const contextValue: ThemeContextValue = {
    theme,
    mode,
    setMode,
    systemPreference,
    resolvedMode,
  };

  return React.createElement(ThemeContext.Provider, { value: contextValue }, children);
}

// Theme hook
export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme utilities
export function createThemeAwareClass(lightClass: string, darkClass: string) {
  return `light:${lightClass} dark:${darkClass}`;
}

export function getThemeValue(lightValue: string, darkValue: string, mode: 'light' | 'dark') {
  return mode === 'light' ? lightValue : darkValue;
}

// Theme tokens for consistent usage
export const themeTokens = {
  // Component variants
  variants: {
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive',
    outline: 'outline',
    ghost: 'ghost',
    link: 'link',
    // Game variants
    ember: 'ember',
    steel: 'steel',
    shadow: 'shadow',
    crimson: 'crimson',
    gold: 'gold',
    glass: 'glass',
    neon: 'neon',
  } as const,

  // Component sizes
  sizes: {
    sm: 'sm',
    default: 'default',
    lg: 'lg',
    xl: 'xl',
    icon: 'icon',
  } as const,

  // Semantic states
  states: {
    default: 'default',
    error: 'error',
    success: 'success',
    warning: 'warning',
  } as const,

  // Animation speeds
  animations: {
    fast: 'fast',
    normal: 'normal',
    slow: 'slow',
  } as const,
} as const;

export type ThemeVariant = keyof typeof themeTokens.variants;
export type ThemeSize = keyof typeof themeTokens.sizes;
export type ThemeState = keyof typeof themeTokens.states;
export type ThemeAnimation = keyof typeof themeTokens.animations;

export { darkTheme, lightTheme };
