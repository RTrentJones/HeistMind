# HeistMind

A comprehensive character management platform for Forged in the Dark tabletop RPGs.

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

HeistMind targets **async, Discord-style play-by-post** FitD games — shared campaign state is
DB-backed and loaded on view (no realtime required).

### For Game Masters

- Upload and manage custom FitD rulesets (JSON), or load the bundled **Brackwater** starter
- Run campaigns with a **crew sheet**, **progress clocks**, **factions**, and a shared **roll log**
- Make fortune/GM rolls and advance clocks as a score unfolds

### For Players

- Build rule-driven characters with a guided wizard (playbook, action ratings, abilities, identity)
- Play from a live character sheet: **stress**, **harm**, **XP tracks**, loadout, and action rolls
- Everyone loads the latest shared campaign state on view (play-by-post)

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
   # Edit .env.local with your Supabase credentials
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## 📖 Documentation

Living product docs are maintained in the **`cx-map` skill** (`.claude/skills/cx-map/`):

- **`STATUS.md`** — what HeistMind is, what's built, architecture/constraints, and current plans
- **`CX-MAP.md`** — every page and user flow (routes, character wizard, campaign panels, roles)
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
