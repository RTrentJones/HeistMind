// Jest config for @storybook/test-runner (the CI story smoke). Animated stories (PulsingBadge
// et al) can trip "Execution context was destroyed" under CI load — a timing flake, not a
// story bug (the same story passes on quieter runs). Suite-level retries + a wider timeout
// absorb it; a story that fails 3x is genuinely broken and still fails the job.
const path = require('path');
const { getJestConfig } = require('@storybook/test-runner');

const base = getJestConfig();

module.exports = {
  ...base,
  testTimeout: 30000,
  // APPEND to the runner's own setup files (they install the page hooks — replacing them
  // breaks every story with "__sbSetupPage is not a function").
  // <rootDir> resolves to the monorepo parent here, so anchor on this file's dir.
  setupFilesAfterEnv: [
    ...(base.setupFilesAfterEnv ?? []),
    path.join(__dirname, 'test-runner-setup.js'),
  ],
};
