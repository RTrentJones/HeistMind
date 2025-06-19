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
        exclude: [
          'node_modules/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/coverage/**',
          '**/dist/**',
          '**/test/**',
          'supabase-types.ts',
        ],
        thresholds: {
          global: {
            branches: coverageThreshold,
            functions: coverageThreshold,
            lines: coverageThreshold,
            statements: coverageThreshold,
          },
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
