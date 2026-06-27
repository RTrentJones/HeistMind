import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import i18next from 'eslint-plugin-i18next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
];

export default eslintConfig;
