# Technical Context: HeistMind

## Technology Stack

### Frontend Technologies

#### Core Framework
- **Next.js 15.3.3**: React framework with App Router for server-side rendering and modern routing
- **React 19**: Latest React with concurrent features, improved performance, and enhanced developer experience
- **TypeScript 5**: Static typing for enhanced reliability and developer productivity

#### Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework with improved performance and developer experience
- **PostCSS**: CSS processing and optimization with modern plugin ecosystem
- **Responsive Design**: Mobile-first approach with component-based responsive patterns

#### State Management
- **Zustand 5**: Lightweight, scalable state management for client-side application state
- **TanStack Query 5**: Advanced server state management with intelligent caching, background updates, and optimistic mutations
- **React Context**: Built-in state management for component tree context sharing

#### Authentication & Security
- **Supabase Auth**: Comprehensive authentication with email/password, magic links, and OAuth providers
- **Supabase Auth UI React**: Pre-built, customizable authentication components
- **Supabase SSR**: Server-side authentication support with secure session handling

### Backend Technologies

#### Database & API
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, authentication, real-time subscriptions, and edge functions
- **PostgreSQL 15+**: Primary database with advanced features, JSON support, and full-text search
- **Row Level Security (RLS)**: Database-level multi-tenant security for automatic data isolation
- **Supabase Client**: TypeScript SDK with automatic type generation and real-time capabilities

#### Server-Side
- **Next.js API Routes**: Server-side API endpoints with middleware support
- **Supabase SSR Package**: Server-side rendering with authenticated database access
- **Edge Runtime**: Serverless functions optimized for performance and global distribution

### Development Tools

#### Package Management
- **pnpm 8+**: Fast, efficient package manager with workspace support and reduced disk usage
- **pnpm Workspaces**: Monorepo management with shared dependencies and optimized builds
- **Package Scripts**: Standardized development workflow automation

#### Code Quality
- **ESLint 9**: Modern JavaScript/TypeScript linting with flat config system
- **Next.js ESLint Config**: Framework-specific linting rules and best practices
- **TypeScript Strict Mode**: Enhanced type checking with strict configuration for maximum safety

#### Development Environment
- **Hot Module Replacement**: Instant development feedback with preserved state
- **Next.js Dev Server**: Optimized development server with automatic optimization
- **Source Maps**: Full debugging support in development environment

## Development Environment Setup

### Prerequisites
- **Node.js 18+**: JavaScript runtime with modern ES module support
- **pnpm 8+**: Package manager for efficient dependency management
- **Git**: Version control with modern workflow support

### Environment Configuration
```bash
# Required Supabase environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional development configuration
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Development Commands
```bash
# Start development environment
pnpm dev              # All applications in parallel
pnpm --filter web dev # Specific application

# Build and validation
pnpm build           # Build all applications
pnpm lint            # ESLint across all packages
pnpm type-check      # TypeScript validation

# Database operations
pnpm db:push         # Push schema changes
pnpm db:types        # Generate TypeScript types
```

## Database Architecture

### Supabase Configuration

#### Project Setup
- **Region Selection**: Configurable based on user geographic distribution
- **Database Version**: PostgreSQL 15+ with extensions for UUID, full-text search, and JSON operations
- **Connection Management**: Built-in connection pooling with pgBouncer
- **Backup Strategy**: Automated daily backups with point-in-time recovery

#### Multi-Tenant Schema Design
```sql
-- Core user profiles with tenant identification
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Master rulesets (tenant-scoped content)
CREATE TABLE rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games with ruleset association
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ruleset_id UUID REFERENCES rulesets(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'draft',
  max_players INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant Row Level Security
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY "gm_rulesets" ON rulesets
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "game_access" ON games
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id AND player_id = auth.uid()
    )
  );
```

#### Advanced Database Features
- **JSONB Indexing**: Optimized queries on dynamic ruleset content
- **Full-Text Search**: Enhanced search capabilities for rulesets and games
- **Triggers**: Automated timestamp updates and data consistency enforcement
- **Functions**: PL/pgSQL functions for complex business logic and validation

## Security Implementation

### Authentication Architecture

#### Multi-Provider Support
```typescript
// Supabase Auth configuration
const supabaseAuthConfig = {
  providers: ['email', 'google', 'github', 'discord'],
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  appearance: {
    theme: 'default',
    variables: {
      default: {
        colors: {
          brand: 'hsl(153 60.0% 53.0%)',
          brandAccent: 'hsl(154 54.8% 45.1%)'
        }
      }
    }
  }
}
```

#### Session Management
- **JWT Tokens**: Stateless authentication with automatic refresh
- **Server-Side Validation**: Secure session verification in API routes
- **Cookie Security**: HttpOnly, Secure, and SameSite cookie configuration
- **Session Persistence**: Configurable session duration and refresh policies

### Data Protection

#### Multi-Tenant Isolation
```sql
-- Automatic tenant scoping in all queries
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy enforcement examples
CREATE POLICY "tenant_isolation" ON user_content
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

#### Input Validation and Sanitization
- **Runtime Validation**: Zod schemas for all user inputs and API endpoints
- **SQL Injection Prevention**: Parameterized queries through Supabase SDK
- **XSS Protection**: Automatic escaping in React components and CSP headers
- **File Upload Security**: Type validation, size limits, and virus scanning

## Performance Optimization

### Client-Side Performance

#### Next.js Optimizations
```typescript
// next.config.js optimizations
const nextConfig = {
  experimental: {
    ppr: true,              // Partial Prerendering
    reactCompiler: true,    // React Compiler optimization
  },
  images: {
    domains: ['your-project.supabase.co'],
    formats: ['image/webp', 'image/avif']
  },
  bundleAnalyzer: {
    enabled: process.env.ANALYZE === 'true'
  }
}
```

#### Caching Strategy
- **React Query**: Intelligent client-side caching with background updates
- **Next.js Caching**: Static generation, ISR, and route caching
- **Browser Caching**: Optimized cache headers for static assets
- **CDN Integration**: Vercel Edge Network for global content delivery

### Database Performance

#### Query Optimization
```sql
-- Optimized indexes for common query patterns
CREATE INDEX idx_rulesets_created_by ON rulesets(created_by);
CREATE INDEX idx_games_ruleset_state ON games(ruleset_id, state);
CREATE INDEX idx_characters_game_player ON characters(game_id, player_id);

-- JSONB indexes for dynamic content
CREATE INDEX idx_rulesets_content_gin ON rulesets USING gin(content);
CREATE INDEX idx_characters_data_gin ON characters USING gin(character_data);
```

#### Connection Management
- **Supabase Pooling**: Automatic connection pooling with pgBouncer
- **Query Batching**: Efficient batch operations for related data
- **Real-time Subscriptions**: Optimized WebSocket connections for live updates

## Deployment Architecture

### Production Environment

#### Vercel Platform Integration
```typescript
// vercel.json configuration
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1", "fra1", "sin1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### Environment Management
- **Environment Variables**: Secure configuration through Vercel dashboard
- **Branch Deployments**: Automatic preview deployments for pull requests
- **Edge Functions**: Global serverless function deployment
- **Analytics Integration**: Built-in performance monitoring and user analytics

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm build

      - name: Database Migration Check
        run: pnpm db:diff

      - name: Deploy to Preview
        if: github.event_name == 'pull_request'
        run: vercel deploy --prebuilt
```

### Monitoring & Observability

#### Application Monitoring
- **Vercel Analytics**: Real-time performance and user behavior metrics
- **Supabase Dashboard**: Database performance, query analysis, and error tracking
- **Error Boundaries**: React error boundaries with automatic error reporting
- **Performance Monitoring**: Core Web Vitals tracking and optimization alerts

## Development Constraints

### Technical Limitations

#### Platform Constraints
- **Vercel Limits**: Function execution time and memory constraints
- **Supabase Quotas**: Database connections, storage, and bandwidth limits
- **Bundle Size**: Next.js bundle optimization requirements for performance
- **Real-time Connections**: WebSocket connection limits for concurrent users

#### Architecture Decisions
- **Supabase Dependency**: Strong coupling to Supabase ecosystem and APIs
- **Client-Side Validation**: Balancing UX with security for ruleset validation
- **Multi-Tenant Complexity**: Additional complexity in queries and data modeling
- **File Upload Limits**: Size and type restrictions for user-generated content

### Development Best Practices

#### Code Organization
```typescript
// Project structure conventions
apps/web/src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                # Shared utilities and configurations
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── styles/             # Global styles and Tailwind config
```

#### Type Safety
```typescript
// Database type generation
type Database = {
  public: {
    Tables: {
      rulesets: {
        Row: RulesetRow
        Insert: RulesetInsert
        Update: RulesetUpdate
      }
      // ... other tables
    }
  }
}

// Automatic type inference
const { data, error } = await supabase
  .from('rulesets')
  .select('*')
  .eq('created_by', userId)
```

## Integration Points

### External Service Integration

#### Supabase Services
- **Authentication**: Multi-provider auth with session management
- **Database**: PostgreSQL with real-time subscriptions
- **Storage**: File upload and management for user content
- **Edge Functions**: Serverless compute for complex operations

#### Development Services
- **Vercel**: Deployment platform with edge computing
- **GitHub**: Version control with automated workflows
- **npm Registry**: Package distribution and dependency management

### API Design

#### RESTful Endpoints
```typescript
// API route structure
app/api/
├── auth/               # Authentication endpoints
├── rulesets/          # Ruleset CRUD operations
├── games/             # Game management
├── characters/        # Character operations
└── uploads/           # File upload handling
```

#### Real-time Integration
```typescript
// Supabase real-time subscriptions
const gameChannel = supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'characters',
    filter: `game_id=eq.${gameId}`
  }, handleCharacterUpdate)
  .subscribe()
```

This technical foundation provides a robust, scalable platform for HeistMind's multi-tenant FitD game management requirements while maintaining modern development practices and security standards.
