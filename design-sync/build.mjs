// design-sync/build.mjs — render the catalog into a self-contained @dsCard bundle.
//
// Reads the BUILT `@heist-mind/ui` (packages/ui/dist), renders each catalog entry with
// react-dom/server, and inlines packages/ui/dist/index.css so every card is a standalone
// HTML file that opens anywhere — and that the Claude DesignSync tool / `/design-sync`
// skill uploads to a claude.ai/design Design System project. The first line of each file
// is the `<!-- @dsCard group="…" -->` marker the Design System pane reads.
//
// Resolution note: react / react-dom live under packages/ui in this pnpm workspace, not at
// the repo root, so we resolve them via a createRequire anchored at packages/ui. That makes
// the script runnable from any cwd (`node design-sync/build.mjs`) and guarantees the SAME
// React instance the components were built against (no "two Reacts" hook error).
//
// Run: `pnpm design:bundle` (builds ui first). Output: design-sync/bundle/ (gitignored).

import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const uiDir = join(repoRoot, 'packages', 'ui');
const distMjs = join(uiDir, 'dist', 'index.mjs');
const distCss = join(uiDir, 'dist', 'index.css');
const outDir = join(here, 'bundle');

const uiRequire = createRequire(join(uiDir, 'package.json'));
const imp = async spec => import(pathToFileURL(uiRequire.resolve(spec)).href);

const reactMod = await imp('react');
const React = reactMod.default ?? reactMod;
const h = React.createElement;

const serverMod = await imp('react-dom/server');
const renderToStaticMarkup =
  serverMod.renderToStaticMarkup ?? serverMod.default?.renderToStaticMarkup;
if (typeof renderToStaticMarkup !== 'function') {
  throw new Error('react-dom/server.renderToStaticMarkup not found — is packages/ui built?');
}

let ui;
try {
  ui = await import(pathToFileURL(distMjs).href);
} catch (err) {
  throw new Error(
    `Could not import ${distMjs}. Build the UI first: \`pnpm build:ui\`.\n  cause: ${err.message}`
  );
}

const css = await readFile(distCss, 'utf8');
const { default: buildCatalog } = await import(pathToFileURL(join(here, 'catalog.mjs')).href);
const catalog = buildCatalog(ui, h);

// Self-contained card. `class="dark"` selects HeistMind's dark theme tokens (globals.css
// `.dark { --color-… }`), matching the live app. The @dsCard marker MUST be line 1.
const page = (spec, inner) => `<!-- @dsCard group="${spec.group}" -->
<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${spec.title}</title>
<style>${css}</style>
<style>
  html, body { margin: 0; }
  body {
    background: var(--color-background-primary, hsl(240 10% 3.9%));
    color: var(--color-foreground-primary, hsl(0 0% 98%));
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 40px;
  }
  .ds-title { margin: 0 0 4px; font: 700 18px system-ui; }
  .ds-sub { margin: 0 0 28px; color: #9ca3af; font: 400 13px system-ui; }
  .ds-stage { display: inline-block; }
</style>
</head>
<body>
  <h1 class="ds-title">${spec.title}</h1>
  <p class="ds-sub">${spec.subtitle ?? ''}</p>
  <div class="ds-stage">${inner}</div>
</body>
</html>
`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const report = [];
for (const spec of catalog) {
  try {
    const inner = renderToStaticMarkup(spec.node);
    const file = `${spec.id}.html`;
    const html = page(spec, inner);
    await writeFile(join(outDir, file), html, 'utf8');
    report.push({ id: spec.id, group: spec.group, file, ok: true, bytes: html.length });
    console.log(`  ✓ ${spec.group.padEnd(14)} ${spec.id}`);
  } catch (err) {
    report.push({ id: spec.id, group: spec.group, ok: false, error: err.message });
    console.error(`  ✗ ${spec.group.padEnd(14)} ${spec.id} — ${err.message}`);
  }
}

// Local build report (NOT the Design System manifest — the app derives _ds_manifest.json
// from the @dsCard markers itself). Handy for the sync step + for spotting render failures.
await writeFile(
  join(outDir, 'build-report.json'),
  `${JSON.stringify({ cards: report }, null, 2)}\n`
);

const ok = report.filter(r => r.ok).length;
const bad = report.length - ok;
console.log(`\nbundle: ${ok} card(s) → ${outDir}${bad ? `  (${bad} failed)` : ''}`);
if (bad) process.exitCode = 1;
