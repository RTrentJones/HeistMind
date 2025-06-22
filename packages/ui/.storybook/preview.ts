import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/globals.css';
import { type ThemeMode } from '../src/lib/theme';
import { TooltipProvider } from '../src/components/Tooltip';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      // theme: 'dark', // Temporarily disabled to fix docs color function error
    },
    backgrounds: {
      disable: true, // Disable Storybook backgrounds since we handle theme switching
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        'desktop-large': {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      // Get theme from Storybook context
      const storybookTheme = context.globals.theme || 'dark';

      // Create a custom ThemeProvider that's controlled by Storybook
      const StorybookThemeProvider = ({ children }: { children: React.ReactNode }) => {
        const [mode, setMode] = React.useState<ThemeMode>(storybookTheme as ThemeMode);
        const [systemPreference, setSystemPreference] = React.useState<'light' | 'dark'>('dark');

        // Update mode when Storybook global changes
        React.useEffect(() => {
          setMode(storybookTheme as ThemeMode);
        }, [storybookTheme]);

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

        // Calculate resolved mode
        const resolvedMode = mode === 'system' ? systemPreference : mode;

        // Apply theme to document using CSS classes - Tailwind v4 approach
        React.useEffect(() => {
          const root = document.documentElement;
          const body = document.body;

          console.log('Applying theme:', resolvedMode);

          // Remove any existing theme classes from all relevant elements
          [root, body].forEach(element => {
            element.classList.remove('light', 'dark');
          });

          // Add the resolved theme class to all relevant elements
          [root, body].forEach(element => {
            element.classList.add(resolvedMode);
          });

          // Force style recalculation by triggering reflow
          root.style.setProperty('--theme-mode', resolvedMode);
          body.offsetHeight; // Force reflow

          // Get computed styles to debug CSS variables
          const computedStyle = getComputedStyle(root);
          const bgPrimary = computedStyle.getPropertyValue('--color-background-primary').trim();
          const fgPrimary = computedStyle.getPropertyValue('--color-foreground-primary').trim();

          console.log('Theme CSS variables:', {
            theme: resolvedMode,
            bgPrimary,
            fgPrimary,
            rootClasses: root.className,
            bodyClasses: body.className,
          });

          // Update body styles using CSS variables
          body.style.backgroundColor = 'var(--color-background-primary)';
          body.style.color = 'var(--color-foreground-primary)';

          // Update Storybook canvas and preview areas
          const canvas = document.querySelector('.sb-show-main');
          const preview = document.querySelector('#storybook-preview-iframe');
          const docs = document.querySelector('[data-docs-page]');

          [canvas, preview, docs].forEach(element => {
            if (element instanceof HTMLElement) {
              element.classList.remove('light', 'dark');
              element.classList.add(resolvedMode);
              element.style.backgroundColor = 'var(--color-background-primary)';
              element.style.color = 'var(--color-foreground-primary)';
            }
          });

          // Ensure the Storybook root maintains theme colors
          const storybookRoot = document.querySelector('#storybook-root');
          if (storybookRoot instanceof HTMLElement) {
            storybookRoot.classList.remove('light', 'dark');
            storybookRoot.classList.add(resolvedMode);
            storybookRoot.style.backgroundColor = 'var(--color-background-primary)';
            storybookRoot.style.color = 'var(--color-foreground-primary)';
          }

          // Force a repaint after a short delay to ensure everything updates
          setTimeout(() => {
            const newBgPrimary = getComputedStyle(root)
              .getPropertyValue('--color-background-primary')
              .trim();
            console.log('Theme applied successfully. Background color:', newBgPrimary);
          }, 100);
        }, [resolvedMode]);

        // Create a theme context for components that need it
        const ThemeContext = React.createContext({
          mode,
          setMode,
          systemPreference,
          resolvedMode,
        });

        return React.createElement(
          ThemeContext.Provider,
          { value: { mode, setMode, systemPreference, resolvedMode } },
          React.createElement(TooltipProvider, {}, children)
        );
      };

      return React.createElement(StorybookThemeProvider, null, React.createElement(Story));
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'system', title: 'System', icon: 'monitor' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
