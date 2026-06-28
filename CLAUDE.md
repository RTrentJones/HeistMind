# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HeistMind is a **rules-driven character + crew manager** for Blades in the Dark and other Forged in the Dark (FitD) tabletop RPG systems. It works two ways: **(1)** as your **character sheet anywhere** — build a rules-valid scoundrel and crew (every action the app offers is legal for your ruleset, so you don't re-read the book) and bring it to any table; and **(2)** as the **live mechanical layer for async, play-by-post games on Discord** — rolls, clocks, stress, per-score gear, crew/faction state, and a score-grouped campaign log that the table builds up as the story posts over days. The narrative stays in Discord prose; the mechanics and shared truth live in HeistMind — *think "Avrae for Forged in the Dark."* Play itself can happen in person, on Discord, or in-app — nothing is forced (à la carte). Game Masters upload custom FitD rulesets and run campaigns; players build characters and share DB-backed campaign state loaded on view. Auth is Discord OAuth; multi-tenant isolation is enforced via per-environment Postgres schemas + Supabase Row Level Security.

The **scope-of-record is `.claude/skills/cx-map/BRD.md`** (product requirements + the core-value / à-la-carte principles); `STATUS.md` and `COMPETITIVE.md` (vs D&D Beyond and Avrae) sit alongside it. Avoid the bare "play-by-post play engine" framing — HeistMind is the mechanical *tracker/layer*, not a VTT or forum where the story happens. (A first-class player invite/join flow is not yet built — see `cx-map` `FINDINGS.md`.)

## Monorepo Structure

pnpm workspaces + Turborepo monorepo (workspaces: `apps/*`, `packages/*`):

- **apps/web** — Next.js 15 (App Router) with React 19, the main web application
- **apps/discord-bot** — empty placeholder for a future Discord bot (not yet implemented)
- **packages/database** — Supabase client with repository pattern abstraction over domain types
- **packages/ui** — Shared component library built on Radix UI primitives + Tailwind CSS 4
- **packages/shared** — Common utilities and types (depends on `database`)

Build order matters: `database` ← `shared` ← `ui` ← `web`. Turbo's `^build` dependency
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

- **Runtime**: Node 20.18.0+, pnpm 9.15.0+
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
- **shared/** — Cross-feature services (API client, error handling, resilience), stores (UI, notifications), types, and components
- **lib/** — Core infrastructure (auth setup, i18n config)

### State Management

Zustand stores use a consistent pattern: `create<State>()(devtools(persist(...)))`. Domain stores live in `features/{domain}/stores/`, cross-cutting stores in `shared/stores/`. Always use `useShallow` for selectors to prevent infinite re-render loops. Only persist essential state via `partialize`.

### API Resilience Layer (shared/services)

All API calls go through `apiClient` which wraps fetch with retry (exponential backoff + jitter), circuit breaker, and configurable timeouts. Error handling uses typed error classes (`AppError`, `ApiError`, `ValidationAppError`) and routes to the notification store.

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

## Greenlight loop (deploy → verify → promote)

This repo uses Greenlight. Ship changes through the deploy-verify-promote skill:
branch → change → deploy preview → `greenlight verify` → beta → verify → `greenlight promote` → prod → verify.

Agentic kit:

- Skill: `.claude/skills/deploy-verify-promote/SKILL.md` (the loop).
- MCP servers: `.mcp.json` recommends the relevant providers — run `/mcp` to authenticate.
  Vercel is OAuth; Supabase needs `SUPABASE_ACCESS_TOKEN` (+ `SUPABASE_PROJECT_REF`) in your env.
- Best-practice skills (one-time, user scope):
  `claude plugin marketplace add cloudflare/skills && claude plugin install cloudflare@cloudflare`
