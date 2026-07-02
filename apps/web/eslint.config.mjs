import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import i18next from 'eslint-plugin-i18next';
import { baseConfig, baseIgnores } from '../../configs/eslint.base.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  baseIgnores,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // The shared strict base (configs/eslint.base.mjs) — same rules every package runs. Placed after
  // the Next presets so its typed rules + parserOptions win for src files.
  ...baseConfig(__dirname, { omitPlugins: ['import', '@typescript-eslint'] }),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // i18n enforcement: every user-facing JSX string must flow through `t(...)`. This is the guardrail
  // that keeps the translation system from rotting again (it silently went 0%-used once before).
  // `jsx-text-only` checks only rendered JSX text nodes — not className/variant/prop values, not
  // plain JS string literals (so domain constants, persisted advancement labels, and option `value`
  // keys are untouched). `<code>` (schema-doc identifiers) and `<Trans>` children are excluded; the
  // word list lets through punctuation, ALL-CAPS tokens, separator glyphs, and the brand fragments.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'jsx-components': { exclude: ['Trans', 'code'] },
          words: {
            exclude: [
              '[0-9!-/:-@[-`{-~]+',
              '[A-Z_-]+',
              // Decorative symbol glyphs used as (aria-labelled) button/indicator text:
              // − (U+2212), ×, ⓘ, bullets/dashes/arrows, optionally with a trailing digit (e.g. −1).
              '[-+−×·•‣–—→…ⓘ]+\\d*',
              'Heist',
              'Mind',
            ],
          },
        },
      ],
    },
  },
  // The client data-access seam boundary (CODE-QUALITY C14): repositories may only be touched
  // through the per-concept `features/{concept}/data/` modules (hooks + their non-hook `api.ts`
  // surface). This is the enforceable "swap the datastore behind the provider factory with zero
  // frontend changes" guarantee. Domain types + pure rules from `@heist-mind/database` stay
  // importable everywhere — only the factory FUNCTIONS are banned (the ban is importNames-scoped).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/auth',
              importNames: ['getRepositories'],
              message:
                'Repository access is confined to the data seam — consume a hook (or plain api function) from features/{concept}/data/ instead.',
            },
            {
              name: '@heist-mind/database',
              importNames: [
                'createRepositories',
                'createRepositoriesWithClient',
                'createDatabaseProvider',
                'createAuthService',
                'createAuthServiceWithClient',
              ],
              message:
                'Provider factories are wired once in lib/auth — consume the data seam (features/{concept}/data/) instead.',
            },
          ],
        },
      ],
    },
  },
  // The seam itself + the lib/auth wiring are the only code allowed to touch those imports.
  {
    files: ['src/features/*/data/**/*.{ts,tsx}', 'src/lib/auth/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
