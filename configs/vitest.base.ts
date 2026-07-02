import { resolve } from 'path';
import type { UserConfigExport } from 'vite';

interface BaseConfigOptions {
  environment?: 'node' | 'jsdom' | 'happy-dom';
  setupFiles?: string[];
  coverageThreshold?: number;
  additionalAliases?: Record<string, string>;
}

export const createBaseConfig = (
  dirname: string,
  options: BaseConfigOptions = {}
): UserConfigExport => {
  const {
    environment = 'node',
    setupFiles = [],
    coverageThreshold = 75,
    additionalAliases = {},
  } = options;

  return {
    test: {
      globals: true,
      environment,
      setupFiles,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        // Measure the WHOLE package, not just files the tests happen to import — without `all`,
        // the threshold gates a tiny slice and overstates real protection.
        all: true,
        exclude: [
          'node_modules/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/coverage/**',
          '**/dist/**',
          '**/test/**',
          '**/__tests__/**',
          '**/*.stories.*',
          '**/.storybook/**',
          'supabase-types.ts',
        ],
        // Vitest v2/v3 thresholds are FLAT keys (a nested `global` object is parsed as a file
        // glob matching nothing — the previous shape silently gated nothing).
        thresholds: {
          branches: coverageThreshold,
          functions: coverageThreshold,
          lines: coverageThreshold,
          statements: coverageThreshold,
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(dirname, './src'),
        ...additionalAliases,
      },
    },
  };
};
