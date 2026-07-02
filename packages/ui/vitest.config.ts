import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, {
  environment: 'jsdom',
  setupFiles: ['./test/setup.ts'],
  // Set from measured reality (see CODE-QUALITY.md R2-PR4) — ratchet upward, never down.
  coverageThreshold: 0,
});

// Process forks for better isolation of DOM tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.pool = 'forks';

export default defineConfig(base);
