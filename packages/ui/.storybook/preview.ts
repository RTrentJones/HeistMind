import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/globals.css';
import { ThemeProvider, type ThemeMode } from '../src/lib/theme';
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
      // Drive the REAL ThemeProvider from the Storybook toolbar. The previous decorator
      // hand-rolled a fresh React.createContext here — a DIFFERENT context object from the
      // private one useTheme() reads in src/lib/theme.ts — so every ThemeToggle-bearing story
      // threw "useTheme must be used within a ThemeProvider". Nothing noticed until the CI
      // story smoke first executed the stories (audit PR 8).
      const storybookTheme = (context.globals.theme || 'dark') as ThemeMode;
      // The provider initializes from localStorage after mount; seed it with the toolbar's
      // choice (own key) and key the element so toolbar switches remount cleanly.
      try {
        window.localStorage.setItem('sb-heistmind-theme', storybookTheme);
      } catch {
        /* storage unavailable in some sandboxed contexts — defaultMode still applies */
      }
      return React.createElement(
        ThemeProvider,
        { key: storybookTheme, defaultMode: storybookTheme, storageKey: 'sb-heistmind-theme' },
        React.createElement(TooltipProvider, { delayDuration: 300 }, React.createElement(Story))
      );
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
