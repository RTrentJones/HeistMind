import { join } from 'node:path';

// The suite always runs from the repo root (playwright.config.ts lives there, and both CI and the
// Greenlight suite command invoke it from there), so anchor to cwd — avoids import.meta/__dirname,
// which Playwright's transform handles inconsistently across its CJS/ESM modes.
export const E2E_ROOT = join(process.cwd(), 'e2e');

/** Where global-setup writes injected-session storageState files (gitignored). */
export const AUTH_DIR = join(E2E_ROOT, '.auth');

export const storageStatePath = (persona: string) => join(AUTH_DIR, `${persona}.json`);
