import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig(
  createBaseConfig(__dirname, {
    environment: 'node',
    coverageThreshold: 85,
    additionalAliases: {
      '@heist-mind/database': resolve(__dirname, '../database/src'),
    },
  })
);
