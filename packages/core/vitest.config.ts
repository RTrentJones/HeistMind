import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// The rules engines are the product's correctness core — gate them at (near-)full coverage.
// The domain/ folder is types-only (no runtime), so no global gate is set for it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  '**/character-rules.ts': { lines: 100, functions: 100, statements: 100, branches: 88 },
  '**/clocks.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/crews.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/factions.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
  '**/dice.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
};

export default defineConfig(base);
