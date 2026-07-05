import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, {
  environment: 'jsdom',
  setupFiles: ['./test/setup.ts'],
});

// Process forks for better isolation of DOM tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.pool = 'forks';

// MEASURED floors (audit PR 8 — was 0, i.e. no gate): 41.75/63.46/45.66/41.75 at 214 tests, set
// with ~1pt headroom. Ratchet upward as component tests are added, never down.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  lines: 40,
  branches: 62,
  functions: 44,
  statements: 40,
};

export default defineConfig(base);
