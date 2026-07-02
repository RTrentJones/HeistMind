import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// The use-cases are the bot's behavior spec — gate them high. Branches sit lower because the
// exactOptionalPropertyTypes-safe conditional spreads each add an (untestworthy) arm; measured
// 2026-07-02, ratchet upward only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  lines: 90,
  functions: 90,
  statements: 90,
  branches: 60,
};

export default defineConfig(base);
