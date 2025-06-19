import { defineConfig } from 'vitest/config';
import { createBaseConfig } from '../../configs/vitest.base';

export default defineConfig(
  createBaseConfig(__dirname, {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverageThreshold: 80,
  })
);
