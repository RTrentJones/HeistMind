// Compiles src/styles/globals.css -> dist/index.css, and copies the RAW theme layer
// (src/styles/theme.css -> dist/theme.css) for apps that run their own Tailwind pass.
//
// The `ui` package exports `./styles` -> `./dist/index.css` (a full standalone stylesheet:
// utilities + theme, what Storybook-style standalone consumers want) and `./theme` ->
// `./dist/theme.css` (tokens/component styles ONLY, `@theme` directive left intact). The web
// app imports `./theme` into its own single Tailwind pass — importing the compiled `./styles`
// alongside the app's own utilities put TWO full utility layers on one page, where the later
// base `.hidden` outranked the app's responsive `sm:block` (F83).
//
// It uses the same PostCSS plugins as postcss.config.js (@tailwindcss/postcss +
// autoprefixer), run programmatically so no extra CLI dependency is required.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, 'src/styles/globals.css');
const output = resolve(root, 'dist/index.css');
const themeInput = resolve(root, 'src/styles/theme.css');
const themeOutput = resolve(root, 'dist/theme.css');

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
// Raw copy on purpose: the consuming app's Tailwind pass processes the @theme directive.
await copyFile(themeInput, themeOutput);

console.log(`build-css: wrote ${output} (${result.css.length} bytes) + ${themeOutput}`);
