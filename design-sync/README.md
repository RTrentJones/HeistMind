# Design Sync — HeistMind ⇄ Claude Design

Keep the HeistMind design system (`packages/ui`) in sync with a **claude.ai/design Design
System project**, so designs can be reviewed, iterated, and shared in Claude — and always
reflect the _real, shipped_ components, not a mock that drifts.

The source of truth is **`packages/ui`** (the built `@heist-mind/ui`). This system renders
each component's real variants into self-contained preview cards and uploads them to Claude.

```
packages/ui (built)  →  catalog.mjs  →  build.mjs  →  design-sync/bundle/*.html  →  /design-sync  →  claude.ai/design
   real components       what to show     renders + inlines CSS    @dsCard previews       (DesignSync tool)     Design System project
```

## How it works

- **`catalog.mjs`** — the single list of what gets synced: one entry per component family,
  each rendering the component's real variants from the built `@heist-mind/ui`. Adding a
  component is one entry here; the card then always matches the shipped component.
- **`build.mjs`** — renders every catalog entry with `react-dom/server` and inlines
  `packages/ui/dist/index.css`, producing a standalone HTML file per card. The first line of
  each file is the `<!-- @dsCard group="…" -->` marker the Claude Design System pane reads to
  build its card index (`_ds_manifest.json`). Output lands in `design-sync/bundle/`
  (gitignored — it's a build artifact; each card inlines the full theme CSS).

## Build the bundle

```bash
pnpm design:bundle      # builds @heist-mind/ui, then renders design-sync/bundle/*.html
```

Open any `design-sync/bundle/*.html` in a browser to preview a card exactly as Claude will
render it. A failed render prints `✗ <id>` and is recorded in `bundle/build-report.json` (the
command exits non-zero), so a broken component surfaces immediately.

## Sync to Claude Design

The upload is driven by the **`/design-sync` skill** (the `DesignSync` tool) inside Claude
Code — it talks to claude.ai/design through your Claude login. After building the bundle:

1. Run `pnpm design:bundle` (or `pnpm design:sync`, which builds then prints this reminder).
2. In Claude Code, run **`/design-sync`**. It will:
   - list your design-system projects (or create one — name it **HeistMind** — if none),
   - diff `design-sync/bundle/` against the project, and
   - upload the changed cards (one component at a time, never a wholesale replace).
3. The Design System pane groups cards by the `@dsCard group` label (Actions, Typography,
   Layout, Forms, Feedback, Data display).

> The sync is intentionally **not** a CI step or a plain CLI call: it writes to your
> claude.ai account through your login, so a human runs it from Claude Code. Nothing here
> stores or echoes any Claude credential.

## The round-trip (designing in Claude → back into code)

1. Iterate on a component in the claude.ai/design project.
2. Pull the change back with `/design-sync` (it reads the remote and shows the diff).
3. Reconcile the change into the real component in `packages/ui/src/components/…` and its
   `*.stories.tsx`.
4. `pnpm design:bundle` to re-render, then `/design-sync` to push the now-matching card.

Code stays the source of truth; Claude Design is the canvas. The loop closes when the card
re-renders identically from the updated component.

## Adding / changing a component

Edit **`catalog.mjs`**: import the component from `ui`, add a `{ id, group, title, subtitle,
node }` entry, and show several variants in `node` so the card isn't flagged "thin". Then
`pnpm design:bundle`. No JSX build step — `node` is `React.createElement`, passed in.

## Relationship to Storybook

Storybook (`pnpm --filter @heist-mind/ui storybook`) remains the interactive dev surface for
building components. This system is the **bridge to Claude Design** for visual design review
and iteration — it reuses the same built components, so the two never disagree.
