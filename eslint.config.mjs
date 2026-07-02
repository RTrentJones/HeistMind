// Root ESLint config = the shared base (configs/eslint.base.mjs) + repo-wide ignores.
// Each workspace runs the same base through its own `lint` script (`apps/web` spreads it into its
// Next config); this root file exists so editor integrations resolve a config anywhere in the repo.
// The previous 271-line "strict" config here was wired to NO script — rules now live in the base,
// enforced everywhere or recorded as deviations in CODE-QUALITY.md, never aspirational.
import { baseConfig, baseIgnores } from './configs/eslint.base.mjs';

export default [
  baseIgnores,
  { ignores: ['apps/**', 'e2e/**', 'design-sync/**', 'infra/**', 'supabase/**'] },
  ...baseConfig(import.meta.dirname),
];
