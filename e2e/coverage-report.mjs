// Aggregates the raw V8 coverage dumped by the e2e fixtures (E2E_COVERAGE=1) into an lcov + HTML
// report, remapped to source via the bundles' sourcemaps. Filters to our app/package sources.
//
//   E2E_COVERAGE=1 pnpm exec playwright test gm-* --workers=1
//   node e2e/coverage-report.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CoverageReport } from 'monocart-coverage-reports';

const RAW = join(process.cwd(), 'e2e', '.coverage', 'raw');
if (!existsSync(RAW)) {
  console.error('No raw coverage found. Run the suite with E2E_COVERAGE=1 first.');
  process.exit(1);
}

const report = new CoverageReport({
  name: 'HeistMind E2E coverage',
  outputDir: join(process.cwd(), 'e2e', '.coverage', 'report'),
  reports: ['console-summary', 'v8', 'lcovonly'],
  cleanCache: true,
  // Process the app bundles AND Next's eval-source-map modules (webpack-internal://), which
  // carry the inline sourcemaps back to our .tsx/.ts; the sourceFilter trims to first-party.
  entryFilter: () => true,
  // After sourcemap remap, keep only our own source (drop node_modules + test files).
  sourceFilter: sourcePath =>
    (sourcePath.includes('/apps/web/src/') ||
      sourcePath.includes('/packages/database/src/') ||
      sourcePath.includes('/packages/shared/src/') ||
      sourcePath.includes('/packages/ui/src/')) &&
    !sourcePath.includes('/node_modules/') &&
    !/\.(test|spec)\.[tj]sx?$/.test(sourcePath),
});

const files = readdirSync(RAW).filter(f => f.endsWith('.json'));
let entries = 0;
for (const f of files) {
  const list = JSON.parse(readFileSync(join(RAW, f), 'utf8'));
  entries += list.length;
  await report.add(list);
}
console.log(`Aggregated ${entries} script entries across ${files.length} page sessions.`);
const results = await report.generate();
console.log('\nE2E source coverage:', results?.summary ?? '(see console table above)');
