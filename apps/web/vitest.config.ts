import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig({
  ...createBaseConfig(__dirname, {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // Measured 2026-07-04 after the audit-PR-7 tranche (a seam suite in every feature's data/
    // plus the notification + auth store tests): 16.2 lines / 52.37 branches / 31.87 functions.
    // Floor at the lowest measured metric, minus rounding headroom; ratchet upward with every
    // tranche, never down. (History: "70" pre-R2 gated only test-imported files — it verified
    // nothing; honest 0 from R2-PR4, 11 from the round-3 tranche, 15 here.)
    coverageThreshold: 15,
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
