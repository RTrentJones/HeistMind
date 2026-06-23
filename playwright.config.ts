// Playwright config for the HeistMind E2E + Greenlight deploy-gate suite.
//
// One suite, three targets, selected entirely by PLAYWRIGHT_BASE_URL:
//   - unset            → boots `pnpm dev:web` locally (paired with a local Supabase stack in CI)
//   - a deployed URL   → runs against that preview/beta/prod deploy (Greenlight gate); no webServer
//
// Auth never goes through Discord: global-setup mints test users via the Supabase service-role
// key and injects their sessions (see e2e/support/*). See e2e/README.md for the full strategy.

import { defineConfig, devices } from '@playwright/test';
import { getE2EEnv } from './e2e/support/env';

const env = getE2EEnv();

// Only manage a dev server when targeting the local default. Against a deployed URL we just hit it.
const isLocal =
  env.baseURL.startsWith('http://localhost') || env.baseURL.startsWith('http://127.0.0.1');
const manageServer = isLocal && !process.env.PLAYWRIGHT_NO_SERVER;

// Reach Vercel-protected preview/beta deploys by sending the bypass header on every request.
const extraHTTPHeaders = env.vercelBypass
  ? { 'x-vercel-protection-bypass': env.vercelBypass, 'x-vercel-set-bypass-cookie': 'true' }
  : undefined;

export default defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'e2e/.report', open: 'never' }], ['list']]
    : [['html', { outputFolder: 'e2e/.report', open: 'never' }], ['list']],

  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: manageServer
    ? {
        command: 'pnpm dev:web',
        url: env.baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
