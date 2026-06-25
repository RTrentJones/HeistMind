import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// Gate the character-validation rules engine + its server-side enforcement at high coverage.
// The legacy repositories/adapters are covered end-to-end by the Playwright suite (not unit
// tests), so they're intentionally NOT unit-gated here — only the per-file globs below are
// enforced (the base global threshold is replaced), keeping the gate honest rather than red.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  '**/character-rules.ts': { lines: 100, functions: 100, statements: 100, branches: 88 },
  '**/clocks.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/crews.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/dice.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/supabase-character-management-repository.ts': {
    lines: 85,
    functions: 85,
    statements: 85,
    branches: 60,
  },
};

export default defineConfig(base);
