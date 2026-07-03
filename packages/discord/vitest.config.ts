import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// The handlers are pure request→response functions and the verifier is security-critical —
// gate them high. Branches sit lower for the same conditional-spread reason as the engine;
// measured 2026-07-03, ratchet upward only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  lines: 90,
  functions: 90,
  statements: 90,
  branches: 70,
};

export default defineConfig(base);
