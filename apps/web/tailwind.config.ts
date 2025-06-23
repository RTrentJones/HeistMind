import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // Include UI package components in content scanning
    '../../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Extend/preset the UI package Tailwind configuration
  presets: [
    // Import the UI package Tailwind config as a preset
    require('@heist-mind/ui/tailwind'),
  ],
  // Web app specific overrides (should be minimal)
  theme: {
    extend: {
      // Only web app specific extensions here
      // All main design tokens come from UI package
    },
  },
  // Plugins are inherited from UI package preset
  plugins: [],
};

export default config;
