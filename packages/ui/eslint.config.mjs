// Runs the shared base (configs/eslint.base.mjs) over this workspace.
import { baseConfig, baseIgnores } from '../../configs/eslint.base.mjs';

export default [baseIgnores, ...baseConfig(import.meta.dirname)];
