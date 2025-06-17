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
└── .memory-bank/               # Project documentation
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

### For Game Masters
- Upload and manage custom FitD rulesets
- Create games with flexible rule configurations
- Invite players via email or public codes
- Monitor player activity and character progression

### For Players
- Join games and create rule-based characters
- Manage multiple characters across different games
- Track XP, advancement, and character relationships
- Intuitive wizard-based progression system

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

Comprehensive project documentation is available in the `.memory-bank/` directory:

- **Project Brief**: Core requirements and user stories
- **Architecture**: Technical decisions and patterns
- **Progress**: Current status and roadmap
- **Sprint Planning**: Development phases and milestones

## 🔒 Security

- **Row Level Security**: Multi-tenant data isolation
- **Type Safety**: End-to-end TypeScript coverage
- **Authentication**: Secure OAuth with Supabase Auth
- **Environment Separation**: Schema-based dev/prod isolation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
