import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig(
  createBaseConfig(__dirname, {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverageThreshold: 70,
    additionalAliases: {
      '@heist-mind/ui': resolve(__dirname, '../../packages/ui/src'),
      '@heist-mind/database': resolve(__dirname, '../../packages/database/src'),
      '@heist-mind/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  })
);
