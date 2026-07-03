import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig(
  createBaseConfig(__dirname, {
    environment: 'node',
    // Measured 2026-07-02: 99 stmts / 84.9 branches / 92 funcs. Floor with headroom; ratchet up only.
    coverageThreshold: 80,
  })
);
