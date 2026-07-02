// The ONE ESLint base every workspace runs (packages via `eslint .`, the web app by spreading
// these blocks into its Next config). Strict-but-adopted: every rule here is enforced at zero
// violations — aspirational rules that would need a mass-disable live in the deviations list in
// CODE-QUALITY.md instead of a config nothing runs.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

/**
 * Shared TypeScript base blocks. `tsconfigRootDir` is the workspace root (pass
 * `import.meta.dirname`); typed rules resolve the nearest tsconfig via the project service.
 * Pass `omitPlugins` for plugin keys a preset earlier in the array already registers (the Next
 * config registers `import` and `@typescript-eslint`) — flat config forbids redefining a plugin
 * key; the rules still resolve against the preset's instance by name.
 */
export function baseConfig(tsconfigRootDir, { omitPlugins = [] } = {}) {
  return [
    js.configs.recommended,
    prettier,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: Object.fromEntries(
        Object.entries({ '@typescript-eslint': tsPlugin, import: importPlugin }).filter(
          ([key]) => !omitPlugins.includes(key)
        )
      ),
      settings: {
        'import/resolver': {
          typescript: { alwaysTryTypes: true },
        },
      },
      rules: {
        // TypeScript itself checks undefined identifiers (incl. Node/DOM globals); the core rule
        // false-positives on `process`/`fetch` in TS files.
        'no-undef': 'off',

        // ===== TYPE SAFETY =====
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        // The seam uses skipToken for conditional queries (R2-PR6); assertions are banned outside
        // tests (see the test-relaxation block below).
        '@typescript-eslint/no-non-null-assertion': 'error',

        // ===== ASYNC CORRECTNESS =====
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

        // ===== HYGIENE =====
        // Core rule off in favor of the TS-aware version (which honors the `_` ignore patterns).
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { fixStyle: 'inline-type-imports' },
        ],
        'import/no-cycle': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    // Tests may use non-null assertions and anys freely — they assert on known fixtures.
    {
      files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // Stories are interactive documentation — console demos in action handlers are the point.
    {
      files: ['**/*.stories.tsx'],
      rules: {
        'no-console': 'off',
      },
    },
    // Config/scripts run under node without type info.
    {
      files: ['**/*.{js,mjs,cjs}'],
      languageOptions: {
        globals: { process: 'readonly', console: 'readonly', __dirname: 'readonly' },
      },
    },
  ];
}

/** Common ignore globs for package-level configs. */
export const baseIgnores = {
  ignores: [
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/storybook-static/**',
    '**/*.tsbuildinfo',
    '**/supabase-types.ts',
  ],
};
