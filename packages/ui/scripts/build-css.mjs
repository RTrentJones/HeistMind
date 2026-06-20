// Compiles src/styles/globals.css -> dist/index.css
//
// The `ui` package exports `./styles` -> `./dist/index.css` (see package.json),
// which the web app imports via `@import "@heist-mind/ui/styles"`. tsup only
// bundles JS, so this script produces the CSS artifact as part of `build`.
//
// It uses the same PostCSS plugins as postcss.config.js (@tailwindcss/postcss +
// autoprefixer), run programmatically so no extra CLI dependency is required.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, 'src/styles/globals.css');
const output = resolve(root, 'dist/index.css');

const css = await readFile(input, 'utf8');

const result = await postcss([tailwindcss(), autoprefixer()]).process(css, {
  from: input,
  to: output,
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, result.css, 'utf8');
if (result.map) {
  await writeFile(`${output}.map`, result.map.toString(), 'utf8');
}

console.log(`build-css: wrote ${output} (${result.css.length} bytes)`);
