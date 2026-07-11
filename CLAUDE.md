# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HeistMind is a **rules-driven character + crew manager** for Blades in the Dark and other Forged in the Dark (FitD) tabletop RPG systems. It works two ways: **(1)** as your **character sheet anywhere** — build a rules-valid scoundrel and crew (every action the app offers is legal for your ruleset, so you don't re-read the book) and bring it to any table; and **(2)** as the **live mechanical layer for async, play-by-post games on Discord** — rolls, clocks, stress, per-score gear, crew/faction state, and a score-grouped campaign log that the table builds up as the story posts over days. The narrative stays in Discord prose; the mechanics and shared truth live in HeistMind — _think "Avrae for Forged in the Dark."_ Play itself can happen in person, on Discord, or in-app — nothing is forced (à la carte). Game Masters upload custom FitD rulesets and run campaigns; players build characters and share DB-backed campaign state loaded on view. Auth is Discord OAuth; multi-tenant isolation is enforced via per-environment Postgres schemas + Supabase Row Level Security.

The **scope-of-record is `.claude/skills/cx-map/BRD.md`** (product requirements + the core-value / à-la-carte principles); `STATUS.md` and `COMPETITIVE.md` (vs D&D Beyond and Avrae) sit alongside it. Avoid the bare "play-by-post play engine" framing — HeistMind is the mechanical _tracker/layer_, not a VTT or forum where the story happens. (A first-class player invite/join flow is not yet built — see `cx-map` `FINDINGS.md`.)

## Monorepo Structure

pnpm workspaces + Turborepo monorepo (workspaces: `apps/*`, `packages/*`):

- **apps/web** — Next.js 15 (App Router) with React 19, the main web application
- **packages/discord** — the Discord client: Ed25519 request verification, the interaction
  router, slash-command handlers, and the command manifest + registration script. The web app's
  `/api/discord` route is a thin transport over this package (no separate bot app — Discord
  interactions are HTTP webhooks, not a gateway process; see BRD Phase 4)
- **packages/core** — the pure domain: FitD types (split per domain) + the rules engines
  (dice/clocks/crews/factions/character-rules). No I/O, no framework — every client (web, the
  future Discord bot) and the data layer build on it
- **packages/database** — Supabase repositories/adapters/factories over the core domain (the
  client-agnostic data-access layer; import domain types from `core`, persistence from here)
- **packages/ui** — Shared component library built on Radix UI primitives + Tailwind CSS 4
- **packages/shared** — Cross-client ruleset content (builtin rulesets + validation; depends on `core`)

Build order matters: `core` ← `database` ← `shared` ← `ui` ← `web`. Turbo's `^build` dependency
enforces this, so `pnpm build` (or any `dev`/`test`/`lint` task) rebuilds upstream packages
first. After editing a `packages/*` source file, downstream packages consume its built `dist/`,
not its source — rebuild the package (or run its `dev` watcher) for changes to propagate.

Shared tooling config lives in `configs/` (`tsconfig.base.json`, `vitest.base.ts` —
`createBaseConfig` is imported by each package's `vitest.config.ts`).

## Commands

```bash
pnpm dev                # Start all dev servers
pnpm build              # Build all packages (Turborepo cached)
pnpm lint               # ESLint across all packages
pnpm lint:fix           # Auto-fix lint issues
pnpm type-check         # TypeScript validation
pnpm test               # Run all tests once
pnpm test:watch         # Watch mode
pnpm test:coverage      # Tests with coverage reports
pnpm validate           # lint + type-check + test (full CI check)
pnpm format             # Prettier format all files

# Package-scoped
pnpm dev:web            # Web app dev server only
pnpm dev:ui             # UI package dev mode only
pnpm build:web          # Build web app only
pnpm build:ui           # Build UI package only
pnpm db:push            # Push schema to Supabase
pnpm db:types           # Generate types from Supabase schema
```

Run a single test file:

```bash
pnpm --filter @heist-mind/web exec vitest run src/path/to/file.test.ts
pnpm --filter @heist-mind/ui exec vitest run src/path/to/file.test.ts
```

## Local development & migrations

Copy `.env.example` → `.env.local` and fill the Supabase vars (see **Environment Variables** below).
The everyday loop:

```bash
supabase start          # boot the local Postgres + Auth stack (Docker); supabase/config.toml configures it
pnpm db:push            # apply supabase/migrations/* to the database
pnpm dev                # run all dev servers (or pnpm dev:web)
```

**The migration → type-regen handoff (don't skip it).** Domain types are generated from the live
schema into `packages/database/src/supabase-types.ts`. **Adding or changing a DB column/table requires
regenerating those types before the repository adapter type-checks** — a fresh column simply won't
exist on the generated types until you regen, and `pnpm type-check` (and CI) will fail. After a
migration lands:

```bash
# Against the REMOTE schema — needs SUPABASE_PROJECT_ID in your env:
pnpm db:types
# …or against a running LOCAL stack:
pnpm --filter database db:types-local
```

Migrations follow the **single-`DO`-block, per-env-schema** pattern (one block that targets the
`development`/`production` schema). Character mechanics ride a JSONB column, so most character-shape
changes need **no** migration. See `packages/database/README.md` and `e2e/README.md` for the local
Supabase + E2E specifics.

## Tech Stack

- **Runtime**: Node 20.19.0+, pnpm 9.15.0+
- **Frontend**: Next.js 15.3, React 19, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 with PostCSS
- **State**: Zustand 5 (devtools + persist middleware), TanStack Query 5
- **Backend**: Supabase (PostgreSQL 15+, Auth, RLS)
- **Auth**: Discord OAuth via Supabase Auth v2
- **Testing**: Vitest 2, @testing-library/react 16, jsdom
- **Linting**: ESLint 9 flat config, Prettier
- **CI/CD**: GitHub Actions, deployed to Vercel

## Architecture Patterns

### Frontend (apps/web/src)

- **app/** — Next.js App Router pages and layouts
- **features/** — Domain-organized screens (auth, games, characters), each with its own stores and components
- **shared/** — Cross-feature pieces: the notification store + toaster, `ResourceList`, `AppShell`, shared types
- **lib/** — Core infrastructure (auth setup, i18n config)

### State Management

Zustand stores use a consistent pattern: `create<State>()(devtools(persist(...)))`. Domain stores live in `features/{domain}/stores/`, cross-cutting stores in `shared/stores/`. Always use `useShallow` for selectors to prevent infinite re-render loops. Only persist essential state via `partialize`.

### Data access (the React Query seam)

The app has **no REST API** — the web client reads and writes through the Supabase repositories in
`@heist-mind/database`, which return a `Result<T>`. Repository access is confined (ESLint-enforced)
to the per-concept data seam `features/{concept}/data/`: `queries.ts` (queryOptions factories +
hooks, `skipToken` conditionals), `mutations.ts` (`useMutation` + `invalidateQueries`), and
`api.ts` (the non-hook surface for Zustand store actions). `unwrap()` throws `RepositoryError`
(React Query's registered error type). See `apps/web/src/features/README.md` for the full
conventions (mutation call styles, staleness policy, cross-feature import rules).

### Database (packages/database)

Repository pattern: domain types and repository interfaces are exported publicly; Supabase-specific implementations are internal. Factory functions (`createDatabaseProvider`, `createRepositories`, `createAuthService`) provide the public API. Auth uses Discord OAuth with automatic profile creation via database triggers.

SQL migrations live in `supabase/migrations/` (`supabase/config.toml` configures the local stack); `pnpm db:push` applies them. `pnpm db:types` regenerates `src/supabase-types.ts` from the remote schema (`db:types-local` from a local stack), so run it after schema changes.

### UI Library (packages/ui)

Components wrap Radix UI primitives with Tailwind CSS 4 styling. Built with tsup (CJS + ESM). Has Storybook 8 for documentation.

## Code Style

- **Formatting**: Prettier — single quotes, trailing commas (es5), 100 char width, no tabs, arrow parens avoided
- **TypeScript**: Strict mode, no `any`, prefer nullish coalescing and optional chaining
- **Naming**: camelCase for variables, PascalCase for types/components, no `I` prefix on interfaces
- **Imports**: ESLint enforced ordering (builtin → external → internal), no import cycles
- **React**: Strict hooks rules, jsx-a11y accessibility enforcement

## Project knowledge (living docs)

The **`cx-map` skill** (`.claude/skills/cx-map/`) is the central home for product knowledge. It
**replaces the old Cline `.memory-bank/`** (removed — it had gone badly stale, describing a
pre-launch app). Plain-Markdown files, kept current via the skill:

- `STATUS.md` — what HeistMind is, what's built, architecture/constraints worth knowing, current plans.
- `BRD.md` — **the scope-of-record**: product requirements, the core-value / à-la-carte principles, the phased plan.
- `CX-MAP.md` — every page + user flow (routes, the character wizard, campaign panels, roles, journeys).
- `COMPETITIVE.md` — value prop + competitive frame (vs D&D Beyond and Avrae) + the ranked P0 gaps.
- `FINDINGS.md` — severity-scored CX flaws + FitD-rule gaps (the de-facto backlog).
- `SKILL.md` — the maintenance + audit discipline.

**Live-update rule:** whenever you change a route, screen, flow, or user-facing copy, update the
matching `CX-MAP.md` section (and bump its `_Last verified:_` marker) in the same PR, and log any
issue you find in `FINDINGS.md`. It's the guide for user validation and for deciding what to fix next.

## Environment Variables

`.env.example` is the authoritative list (copy it to `.env.local`). The essentials:

- **App (required):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **`SUPABASE_PROJECT_ID`** — needed by `pnpm db:types` (remote type regen). Not needed for `db:types-local`.
- **`NEXT_PUBLIC_HEISTMIND_SCHEMA`** — env-named Postgres schema (`development`/`production`); defaults to `development`.
- **Discord** (future bot): `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.
- **E2E / Playwright:** `PLAYWRIGHT_BASE_URL` (unset → boots a local dev server; set to a deployed URL to gate it), optional `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY`. See `e2e/README.md`.

## Testing discipline (the audit-round rules — they exist because F68/F69 shipped)

- **Fixture provenance:** tests that need ruleset content import it from `@heist-mind/shared`
  (`DEFAULT_RULESET`/`BUILTIN_RULESETS`, or discord's `characterOnDefaultRuleset()` helper) —
  never invent a content shape. An invented fixture proves a path real data can't take (F69).
- **Trigger-owned rows:** e2e never hand-seeds a row a production trigger/RPC owns (e.g.
  `profiles.discord_id`) — create the upstream event and ASSERT the row appears (F68). The
  discord e2e persona is born through the signup trigger; keep it that way.
- **New bot command checklist:** unit specs (real engine fns over mocked repos, via
  `packages/discord/src/test/helpers.ts`), a signed e2e in `e2e/specs/discord.spec.ts`, an
  autocomplete (type-4) e2e if the command suggests, the manifest entry (auto-registers on
  merge), and a `/heist help` line.
- **Coverage ratchets only move UP.** A ratchet hit on new code means add tests, never lower
  floors. Floors are set from measured reality minus ~1pt headroom.
- **Which gates when:** `pnpm validate` always; `pnpm build` + the targeted e2e spec for
  anything touching discord/e2e (rebuild dist first — stale discord dist is the known trap);
  check `gh pr view N --json mergeable` before debugging silent CI; never merge on a watcher's
  exit code alone — verify zero non-green check-runs.
- **UI walkthrough before user-facing PRs:** drive the changed flow in the running app (the
  verify/run skill) and update `CX-MAP.md` in the same PR (the live-update rule above).
- Full policy + history: `.claude/skills/cx-map/CODE-QUALITY.md` ("Testing discipline" section).

## Greenlight loop (deploy → verify → promote)

This repo uses Greenlight. Ship changes through the deploy-verify-promote skill:
branch → change → deploy preview → `greenlight verify` → beta → verify → `greenlight promote` → prod → verify.

Agentic kit:

- Skill: `.claude/skills/deploy-verify-promote/SKILL.md` (the loop).
- MCP servers: `.mcp.json` recommends the relevant providers — run `/mcp` to authenticate.
  Vercel is OAuth; Supabase needs `SUPABASE_ACCESS_TOKEN` (+ `SUPABASE_PROJECT_REF`) in your env.
- Best-practice skills (one-time, user scope):
  `claude plugin marketplace add cloudflare/skills && claude plugin install cloudflare@cloudflare`
