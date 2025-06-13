# HeistMind

A comprehensive platform for managing Forged in the Dark (FitD) tabletop RPG games. HeistMind enables Game Masters to upload custom rulesets and create games, while players can join games and create rule-driven characters with guided progression.

## 🎯 Core Features

### For Game Masters
- **Upload & Manage Rulesets**: Upload JSON/YAML rulesets for any FitD system
- **Create Games**: Set up games using your uploaded rulesets
- **Invite Players**: Flexible invitation system with direct invites and public codes

### For Players
- **Join Games**: Accept invitations or join public games
- **Create Characters**: Rule-driven character creation with validation
- **Character Progression**: Guided advancement through wizard interface

## 🏗️ Architecture

### Multi-Tenant Database
- **Row Level Security**: Context-aware permissions based on game roles
- **Dynamic Roles**: Users can be GM in one game, player in another
- **Character Portability**: Move characters between compatible games

### Environment Separation
- **Schema-Based**: `development` and `production` schemas in single Supabase project
- **Branch Deployment**: Automatic environment targeting based on Git branch
- **Free Tier Optimized**: Single project architecture for cost efficiency

### Modern Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL) with generated TypeScript types
- **Architecture**: Monorepo with pnpm workspaces
- **CI/CD**: Automated deployment with GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Supabase account
- GitHub account (for CI/CD)

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/HeistMind.git
cd HeistMind
pnpm install
```

### 2. Supabase Setup

#### Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and fill project details
4. Wait for database to initialize

#### Get Project Credentials
1. In Supabase Dashboard → **Settings** → **API**
2. Copy these values:
   - **Project URL** (anon public)
   - **anon public key** (for client-side)
   - **service_role key** (for server/CI/CD)
3. In **Settings** → **General**:
   - Copy **Project ID** (reference ID)

### 3. Environment Configuration

#### Local Development
```bash
# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Database Setup

#### Link to Supabase
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your_project_id
```

#### Deploy Database Schema
```bash
# Push migrations to development schema (default)
supabase db push

# Or deploy to specific schema
export PGOPTIONS="-c heistmind.target_schema=development"
supabase db push
```

#### Generate TypeScript Types
```bash
# Generate types from database
pnpm --filter @heist-mind/database db:types

# Or generate from local database
pnpm --filter @heist-mind/database db:types-local
```

### 5. Start Development
```bash
# Start the web application
pnpm dev

# Or start specific app
pnpm --filter @heist-mind/web dev
```

Visit http://localhost:3000 to see the application.

## 🔄 Development Workflow

### Environment Management
- **Development**: Work on `development` branch → deploys to `development` schema
- **Production**: Push to `main` branch → deploys to `production` schema
- **Feature Branches**: Work locally, test against `development` schema

### Database Changes
```bash
# Create new migration
supabase migration new your_migration_name

# Test migration locally
supabase db reset

# Check schema differences
supabase db diff

# Deploy via Git (recommended)
git add supabase/migrations/
git commit -m "feat: add new migration"
git push origin development  # Auto-deploys to dev schema
```

### Type Generation
Types are automatically generated and committed by GitHub Actions after successful deployments.

```bash
# Manual type generation (if needed)
pnpm --filter @heist-mind/database db:types
```

## 📦 Project Structure

```
HeistMind/
├── apps/
│   ├── web/                 # Next.js web application
│   └── bot/                 # Discord bot (future)
├── packages/
│   ├── database/            # Database abstraction layer
│   │   ├── domain-types.ts  # Clean domain interfaces
│   │   ├── repositories.ts  # Data access contracts
│   │   ├── client.ts        # Schema-aware Supabase client
│   │   └── README.md        # Database documentation
│   └── shared/              # Shared utilities and types
├── supabase/
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase configuration
├── .github/
│   └── workflows/           # CI/CD automation
└── .memory-bank/             # Project documentation
```

## 🗄️ Database Schema

### Core Tables
- **`rulesets`** - GM-uploaded FitD rules with JSONB content
- **`games`** - Game instances with player management
- **`game_players`** - Many-to-many with context-specific roles
- **`characters`** - Player characters within games
- **`invitations`** - Flexible invitation system

### Security Features
- **Row Level Security** on all tables
- **Context-aware permissions** based on game roles
- **Helper functions** for role checking
- **Automatic triggers** for data consistency

### Environment Schemas
- **`development`** - Safe testing environment
- **`production`** - Live application data
- **`public`** - Shared resources (user profiles, auth)

## 🚀 Deployment

### Automated CI/CD
The project includes automated deployment via GitHub Actions:

#### Validation Pipeline
- Migration syntax checking
- Schema validation against local Supabase
- TypeScript type generation and compilation
- Schema diff verification

#### Deployment Pipeline
- `development` branch → `development` schema
- `main` branch → `production` schema
- Automatic type generation from deployed schema
- Health verification and deployment summaries

### Manual Deployment
```bash
# Deploy to development
export PGOPTIONS="-c heistmind.target_schema=development"
supabase db push

# Deploy to production
export PGOPTIONS="-c heistmind.target_schema=production"
supabase db push
```

## 🛠️ Available Scripts

### Root Level
```bash
pnpm dev          # Start all applications
pnpm build        # Build all packages and apps
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript checking
```

### Database Package
```bash
pnpm --filter @heist-mind/database db:push        # Deploy migrations
pnpm --filter @heist-mind/database db:reset       # Reset local DB
pnpm --filter @heist-mind/database db:types       # Generate types from remote
pnpm --filter @heist-mind/database db:types-local # Generate types from local
pnpm --filter @heist-mind/database db:diff        # Check schema differences
```

### Web Application
```bash
pnpm --filter @heist-mind/web dev    # Start development server
pnpm --filter @heist-mind/web build  # Build for production
pnpm --filter @heist-mind/web start  # Start production server
```

## 🧪 Testing

### Database Testing
```bash
# Start local Supabase for testing
supabase start

# Run migrations against local instance
supabase db reset

# Test schema changes
supabase db diff
```

### Application Testing
```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @heist-mind/web test
```

## 📚 Documentation

### Architecture Documents
- [`packages/database/README.md`](packages/database/README.md) - Database architecture and usage
- [`.memory-bank/`](memory-bank/) - Complete project documentation
- [`.github/workflows/`](.github/workflows/) - CI/CD pipeline documentation

### API Documentation
- Database types are auto-generated from schema
- Repository interfaces provide clean data access patterns
- Domain types enable database-agnostic application code

## 🐛 Troubleshooting

### Common Issues

#### Migration Failures
```bash
# Check local schema state
supabase status

# Reset and retry
supabase db reset
supabase db push
```

#### Type Generation Issues
```bash
# Regenerate types manually
pnpm --filter @heist-mind/database db:types

# Check type compilation
pnpm --filter @heist-mind/database tsc --noEmit
```

#### Environment Schema Issues
```bash
# Verify current schema
psql "your_supabase_connection_string" -c "SHOW search_path;"

# Set schema explicitly
export PGOPTIONS="-c heistmind.target_schema=development"
```

### Getting Help
- Check the [Memory Bank](.memory-bank/) for detailed documentation
- Review [Database README](packages/database/README.md) for data layer info
- Check GitHub Issues for known problems
- Review CI/CD logs for deployment issues

## 🤝 Contributing

### Development Setup
1. Follow the Quick Start guide above
2. Create feature branch from `development`
3. Make changes and test locally
4. Push to your branch (triggers validation)
5. Open Pull Request to `development`

### Database Changes
1. Create migration: `supabase migration new feature_name`
2. Test locally: `supabase db reset`
3. Commit migration file
4. Push to trigger automated deployment testing

### Code Standards
- TypeScript strict mode required
- ESLint configuration enforced
- Database abstraction layer must be provider-agnostic
- All database access through repository interfaces

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Project Status

### ✅ Completed
- **Database Foundation**: Complete multi-tenant schema with RLS
- **Environment Separation**: Schema-based dev/prod isolation
- **CI/CD Pipeline**: Automated validation and deployment
- **Database Abstraction**: Provider-agnostic architecture
- **Type Safety**: End-to-end TypeScript with generated types

### 🚧 In Development
- **Authentication UI**: User registration and login forms
- **GM Dashboard**: Ruleset and game management interface
- **Player Interface**: Game discovery and character management
- **Ruleset Engine**: JSON validation and form generation

### 🔮 Planned
- **Discord Bot**: Session support and character queries
- **Mobile App**: Native character management
- **Advanced Analytics**: Game insights and balance analysis
- **Community Features**: Ruleset sharing and discovery

---

**HeistMind** - Empowering the Forged in the Dark community with modern game management tools.
