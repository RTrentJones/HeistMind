# HeistMind

A **rules-driven character + crew manager** for Forged in the Dark (FitD) tabletop RPGs. It works two
ways: as your **character sheet anywhere** (build a rules-valid scoundrel and crew — every action the
app offers is legal for your ruleset — and bring it to any table), and as the **live mechanical layer
for async, play-by-post games on Discord** (rolls, clocks, stress, per-score gear, crew/faction state,
and a score-grouped campaign log the table builds as the story posts over days). The narrative stays in
Discord prose; the mechanics live here — *think "Avrae for Forged in the Dark."* Play can happen in
person, on Discord, or in-app — take what you want and leave the rest.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Build specific package
pnpm build:ui
pnpm build:web
```

## 📦 Project Structure

```
heist-mind/
├── apps/
│   ├── web/                    # Next.js web application
│   └── discord-bot/            # Discord bot (future)
├── packages/
│   ├── database/               # Supabase client and types
│   ├── shared/                 # Shared utilities and types
│   └── ui/                     # Component library
├── supabase/                   # Database schema and migrations
└── .claude/skills/cx-map/      # Living product docs (status, CX map, findings)
```

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand with domain separation
- **Database**: Supabase with PostgreSQL
- **Monorepo**: pnpm workspaces + Turborepo
- **Deployment**: Vercel

## 🏗 Architecture

HeistMind follows a **Domain-Driven Design** approach with:

- **Multi-tenant database** with Row Level Security
- **Domain-separated frontend** (auth, games, characters)
- **Enterprise-grade state management** with Zustand
- **Type-safe API integration** throughout the stack

## 📚 Development Scripts

### Root Commands (Turborepo)

```bash
pnpm dev              # Start all development servers
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm type-check       # Type check all packages
pnpm clean            # Clean all build outputs
```

### Package-Specific Commands

```bash
pnpm build:ui         # Build UI package only
pnpm build:web        # Build web app only
pnpm dev:ui           # Start UI package in watch mode
pnpm dev:web          # Start web app only
```

### Database Commands

```bash
pnpm db:push          # Push schema changes to Supabase
pnpm db:types         # Generate TypeScript types from schema
```

## 🔧 Turborepo Benefits

- **Smart Caching**: Only rebuilds changed packages
- **Dependency-Aware**: Builds packages in correct order
- **Parallel Execution**: Faster builds and development
- **Selective Builds**: Build only what you need

## 🌟 Key Features

Two ways to use HeistMind — **a rules-valid character sheet you bring anywhere**, and **the shared
mechanical layer for async play-by-post on Discord**. Campaign state is DB-backed and loaded on view
(no realtime required); the narrative lives in your Discord channels, the mechanics live here.

### For Game Masters

- Upload and manage custom FitD rulesets (JSON), or load the bundled **Brackwater** starter
- Run campaigns with a **crew sheet**, **progress clocks**, **factions**, a **roster** (player→character,
  status, retire), and a **score-grouped campaign log**
- Start/end a **score**, make fortune/GM rolls, and advance clocks as it unfolds

### For Players

- Build rule-driven characters with a guided wizard (playbook, action ratings, abilities, identity);
  level up from the same editor
- Work from a live character sheet: **stress**, **harm**, **XP tracks**, **per-score loadout**, and
  action/resistance rolls — every option the app offers is legal for the ruleset
- Log results from wherever you play (in-app, or recording what happened at the table / on Discord);
  it all lands in one shared, score-grouped campaign log

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/heist-mind.git
   cd heist-mind
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials.
   # SUPABASE_PROJECT_ID is needed for `pnpm db:types` (remote type regen).
   ```

4. **Boot the database and apply migrations**

   ```bash
   supabase start     # local Postgres + Auth (Docker); configured by supabase/config.toml
   pnpm db:push       # apply supabase/migrations/*
   ```

5. **Start development**

   ```bash
   pnpm dev
   ```

### Schema changes → regenerate types (important)

Domain types are generated from the live schema into `packages/database/src/supabase-types.ts`.
**After a migration adds/changes a column or table, regenerate types or the repository adapter (and
CI `type-check`) will fail** — the new column doesn't exist on the generated types until you regen:

```bash
pnpm db:types                          # remote schema — needs SUPABASE_PROJECT_ID
pnpm --filter database db:types-local  # …or a running local stack
```

Character mechanics ride a JSONB column, so most character-shape changes need no migration at all.

## 📖 Documentation

Living product docs are maintained in the **`cx-map` skill** (`.claude/skills/cx-map/`):

- **`STATUS.md`** — what HeistMind is, what's built, architecture/constraints, and current plans
- **`BRD.md`** — the scope-of-record: product requirements, core-value / à-la-carte principles, phased plan
- **`CX-MAP.md`** — every page and user flow (routes, character wizard, campaign panels, roles)
- **`COMPETITIVE.md`** — value prop + competitive frame (vs D&D Beyond and Avrae) + ranked P0 gaps
- **`FINDINGS.md`** — known CX flaws + FitD-rule gaps (the backlog)

Repo conventions, commands, and the deploy loop live in `CLAUDE.md`.

## 🔒 Security

- **Row Level Security**: Multi-tenant data isolation
- **Type Safety**: End-to-end TypeScript coverage
- **Authentication**: Discord OAuth via Supabase Auth
- **Environment Separation**: Schema-based dev/prod isolation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
