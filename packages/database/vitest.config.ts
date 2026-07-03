import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// Gate the server-side rules enforcement (the management repository) at high per-file coverage.
// The rules engine itself moved to @heist-mind/core (gated 100% there); the other repositories
// and adapters are covered end-to-end by the Playwright suite, so the global floor is set to
// MEASURED reality (2026-07-02: 36.56 lines / 62.27 branches / 60.22 functions) — an upward-only
// ratchet, never a decoration. Raise it whenever unit coverage grows; never lower it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  lines: 36,
  branches: 62,
  functions: 60,
  statements: 36,
  '**/supabase-character-management-repository.ts': {
    lines: 85,
    functions: 85,
    statements: 85,
    branches: 60,
  },
};

export default defineConfig(base);
