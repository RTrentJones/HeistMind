# design-sync NOTES — @heist-mind/ui

Repo-specific gotchas for future syncs. Append as you learn things.

## Build / environment

- **`--node-modules` must point at `apps/web/node_modules`**, NOT the repo root.
  This is a pnpm workspace: `react`/`react-dom` (19.1.0) are NOT symlinked into the
  repo-root `node_modules` (root package doesn't depend on react) nor into
  `packages/ui/node_modules` (react is a peerDep there). `apps/web` depends on
  react+react-dom directly, so its `node_modules` has the real `react/package.json`
  pair the converter's vendorReact needs. `[GENERAL]`
- **buildCmd**: `pnpm -F "@heist-mind/ui..." build` (trailing `...` builds workspace
  deps shared+database first). Produces `dist/index.mjs` (ESM entry, `--entry`),
  `dist/index.css` (128KB compiled theme), `dist/index.d.ts` (built by `tsc`, since
  tsup `dts:false`).
- **sb-reference**: `pnpm --filter @heist-mind/ui exec storybook build -c .storybook -o <repo-root>/.design-sync/sb-reference`.
- Node pinned 20.18.0 (.nvmrc) but engines allow `>=20`; built fine on system node 24.12.0.
- Playwright: repo pins 1.61.0 → chromium build 1228 (installed in `.ds-sync`).

## Components

- 18 storied components map to exports; story titles use groups
  Components/ Layout/ Typography/ Status & Feedback/ Navigation/ Game Components/.
- Two non-component showcase stories: `System/Theme System` (Theme.stories.tsx) and
  `System/Component Integration Test` (\_ComponentTest.stories.tsx) — no single export
  to pair; handle via titleMap/skip during the loop.
- No stories (bundle-importable, no rich card): Alert, Textarea, ThemeToggle, ErrorFallbacks,
  Clock, HarmTracker (the last two added 2026-06; exported from `index.ts`, no `.stories.tsx`).
- Tooltip uses TooltipProvider + portals (overlay → likely cardMode "single").

## Solo-phase learnings (global fixes — all in config)

- `[GENERAL]` **Providers**: previews need `cfg.provider` = `PreviewRuntime → ThemeProvider{defaultMode:"dark"} → TooltipProvider`. The `.storybook/preview` decorator bundle FAILS (`Could not resolve "tailwindcss"` from its `globals.css` import), so the theme/tooltip context it provided must come from config. `ThemeProvider` was NOT a public export — added `export { ThemeProvider }` to `packages/ui/src/index.ts` so the dist bundle exposes it (its `ThemeContext` is the one the dist components read; a source-compiled provider would be a different instance).
- `[GENERAL]` **framer-motion entrance animations render blank under the screenshotter.** Button (and others) use `motion.*` with `initial opacity:0 → animate opacity:1` via WAAPI. The compare harness emulates reduced-motion + freezes the document timeline, stranding the WAAPI animation at opacity 0 → blank capture (live render is fine). Fixed by `.design-sync/extra/preview-runtime.mjs` (`PreviewRuntime`, merged via `cfg.extraEntries`) setting `MotionGlobalConfig.skipAnimations = true` during render. Scoped to preview cards only; designs the agent builds are unaffected.
- `[GENERAL]` **Dark card surface.** The preview-card template hard-codes `body{background:#fff}`; this DS is dark-themed, so light text/transparent surfaces vanish on white. `PreviewRuntime` paints `document.body` background/color with the DS tokens via inline style (beats the card's `<style>`), matching the storybook decorator.
- `[GENERAL]` **Display fonts** Cinzel + Playfair Display shipped via `packages/ui/.storybook/preview-head.html` (base64 variable woff2, OFL) → auto-harvested into the bundle (`[FONTS_FROM_PREVIEW_HEAD]`) and rendered by the oracle. Repo previously loaded neither (serif fallback everywhere); these are wired only for the synced DS + storybook.
- `extraEntries` resolution: `.design-sync/extra/preview-runtime.mjs` imports `framer-motion`, which esbuild can't resolve from `.design-sync/`. Fix (fresh-clone setup): `ln -sfn ../packages/ui/node_modules .design-sync/node_modules` (gitignored symlink; dedupes to the bundle's framer-motion instance).
- Header `With Logo` story is `sb-error` (`useTheme must be used within a ThemeProvider` — storybook's fake decorator context). Skipped via `cfg.overrides.Header.skip: ["navigation-header--with-logo"]`. The real preview (with ThemeProvider) renders it fine; skipped only because the oracle can't.
- Solo set (Button, Tooltip, Header, Heading) all graded **match** on every captured story.
- No remote-image stories (ASSETS_BLOCKED canary N/A). No open-tooltip stories (Tooltip needs no cardMode single).
- **Fan-out (3 batches, 14 components) all graded `match` with zero per-component fixes** — the global fixes covered everything. No owned previews authored; `.design-sync/previews/` stays empty. ErrorBoundary's error/interaction stories all render the working (non-thrown) UI on both panels — no skip needed. LoadingSpinner/StatusIcon animations settle correctly (motion fix). All 18 components verified match.
- Cosmetic-only delta across the board: preview frames on the full-page viewport (extra empty space) vs storybook's tight canvas crop — framing, ignored per rubric.

## Re-sync risks

- `cfg.provider` depends on `ThemeProvider` being a bundle export. As of 2026-06 it's a **first-class
  upstream export** (`export { ThemeProvider, type ThemeProviderProps } from './lib/theme'` in
  `index.ts`) — the earlier manual `export { ThemeProvider }` workaround is no longer needed. If
  upstream removes/renames it, `cfg.provider` breaks (`[PROVIDER_UNEXPORTED]`).
- `PreviewRuntime` is a public bundle export (harmless no-op wrapper) — appears in `window.HeistMindUi`.
- Display fonts depend on `packages/ui/.storybook/preview-head.html` (base64 woff2). If removed, `[FONT_MISSING]` returns and the oracle reverts to serif.
- STORY_CAP: components grade the first 6 stories; tail stories are verified-by-upload. Raise `--max-stories` if tail variants need explicit checks.
- `.design-sync/node_modules` symlink must be recreated on a fresh clone (see above).
