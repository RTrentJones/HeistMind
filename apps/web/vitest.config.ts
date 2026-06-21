import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig({
  ...createBaseConfig(__dirname, {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverageThreshold: 70,
    additionalAliases: {
      '@heist-mind/ui': resolve(__dirname, '../../packages/ui/src'),
      '@heist-mind/database': resolve(__dirname, '../../packages/database/src'),
      '@heist-mind/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  }),
  // Tests don't need Tailwind compiled. Provide an inline (empty) PostCSS config so Vite stops
  // loading apps/web/postcss.config.mjs (Tailwind v4's @tailwindcss/postcss isn't a valid plugin in
  // Vitest's Vite pipeline → "Invalid PostCSS Plugin found at: plugins[0]").
  css: { postcss: { plugins: [] } },
});
