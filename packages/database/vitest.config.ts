import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

const base = createBaseConfig(__dirname, { environment: 'node' });

// Gate the server-side rules enforcement (the management repository) at high per-file coverage.
// The rules engine itself moved to @heist-mind/core (gated 100% there); the other repositories
// and adapters are covered end-to-end by the Playwright suite, so the global floor is set to
// MEASURED reality — an upward-only ratchet, never a decoration. Raise it whenever unit coverage
// grows; never lower it. (2026-07-02: 36.56 / 62.27 / 60.22; 2026-10-17 F94 repository-surface
// suite: 65.2 lines / 76.2 branches / 79.57 functions → floors at measured minus ~1pt.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(base as any).test.coverage.thresholds = {
  lines: 64,
  branches: 75,
  functions: 78,
  statements: 64,
  '**/supabase-character-management-repository.ts': {
    lines: 85,
    functions: 85,
    statements: 85,
    branches: 60,
  },
};

export default defineConfig(base);
