# Technical Context: HeistMind

## Technology Stack

### Frontend Technologies

#### Core Framework
- **Next.js 15.3.3**: React framework with App Router for server-side rendering and modern routing
- **React 19**: Latest React with concurrent features, improved performance, and enhanced developer experience
- **TypeScript 5**: Static typing for enhanced reliability and developer productivity

#### UI Framework & Design System
- **Tailwind CSS 4**: Utility-first CSS framework with improved performance and developer experience (already configured)
- **Radix UI**: Headless component library providing accessible, unstyled primitives for custom design systems
- **PostCSS**: CSS processing and optimization with modern plugin ecosystem
- **Custom Design System**: Gaming-focused TTRPG aesthetic with dark theme and specialized components

#### Component Architecture
- **Headless Components**: Radix UI primitives for accessibility without design constraints
- **Design Tokens**: Systematic color palette, typography, and spacing for TTRPG interfaces
- **Compound Components**: Complex UI patterns for character sheets and wizard flows
- **Responsive Design**: Mobile-first approach with component-based responsive patterns

#### State Management
- **Zustand 5**: Lightweight, scalable state management for client-side application state
- **TanStack Query 5**: Advanced server state management with intelligent caching, background updates, and optimistic mutations
- **React Context**: Built-in state management for component tree context sharing and theme management

#### Authentication & Security
- **Supabase Auth**: Comprehensive authentication system with JWT token management
- **Discord OAuth**: Primary authentication provider through Supabase OAuth integration
- **Supabase SSR**: Server-side authentication support with secure session handling
- **Automatic Profile Creation**: Database triggers for seamless user onboarding

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
- **Node.js 20.18.0+**: JavaScript runtime with modern ES module support (LTS)
- **pnpm 9.15.0+**: Package manager for efficient dependency management
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

## UI Framework Architecture

### Design System Strategy

#### Gaming-Focused Aesthetic
```typescript
// Design tokens for TTRPG interfaces
const designTokens = {
  colors: {
    // Dark theme optimized for long gaming sessions
    background: {
      primary: 'hsl(222.2 84% 4.9%)',      // Deep dark background
      secondary: 'hsl(217.2 32.6% 17.5%)', // Card backgrounds
      tertiary: 'hsl(215.4 16.3% 46.9%)',  // Subtle backgrounds
    },
    foreground: {
      primary: 'hsl(210 40% 98%)',         // High contrast text
      secondary: 'hsl(215.4 16.3% 56.9%)', // Secondary text
      muted: 'hsl(215.4 16.3% 46.9%)',     // Muted text
    },
    // TTRPG-themed accent colors
    accent: {
      crimson: 'hsl(0 84.2% 60.2%)',       // Stress/danger indicators
      gold: 'hsl(47.9 95.8% 53.1%)',       // XP/advancement
      silver: 'hsl(215.4 16.3% 46.9%)',    // Secondary actions
      emerald: 'hsl(142.1 76.2% 36.3%)',   // Success states
    },
    // Game-specific semantic colors
    game: {
      playbook: 'hsl(262.1 83.3% 57.8%)',  // Playbook selection
      attribute: 'hsl(142.1 70.6% 45.3%)', // Attribute scores
      skill: 'hsl(221.2 83.2% 53.3%)',     // Skill ratings
      stress: 'hsl(0 72.2% 50.6%)',        // Stress tracking
    }
  },
  typography: {
    // Gaming-appropriate font hierarchy
    character: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '2.5rem',
      lineHeight: '1.2',
      fontWeight: '700'
    },
    playbook: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.25rem',
      lineHeight: '1.4',
      fontWeight: '600'
    },
    attribute: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '1rem',
      lineHeight: '1.5',
      fontWeight: '500'
    }
  },
  spacing: {
    // Character sheet specific spacing
    sheet: '1.5rem',
    section: '2rem',
    component: '1rem',
    tight: '0.5rem'
  }
}
```

#### Accessibility-First Component Design
```typescript
// Radix UI integration with custom styling
import * as Dialog from '@radix-ui/react-dialog'
import * as Form from '@radix-ui/react-form'
import * as Tabs from '@radix-ui/react-tabs'

// Example: Character creation modal with accessibility
const CharacterCreationDialog = () => (
  <Dialog.Root>
    <Dialog.Trigger className="btn-primary">
      Create Character
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/50" />
      <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg p-6 max-w-2xl w-full">
        <Dialog.Title className="text-2xl font-bold mb-4">
          Create New Character
        </Dialog.Title>
        <CharacterWizard />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
```

### Component Architecture Patterns

#### Compound Component Strategy
```typescript
// Character sheet with compound components
interface CharacterSheetProps {
  character: Character
  ruleset: RulesetDefinition
  editable?: boolean
}

const CharacterSheet = ({ character, ruleset, editable }: CharacterSheetProps) => (
  <CharacterSheet.Container>
    <CharacterSheet.Header>
      <CharacterSheet.Name>{character.name}</CharacterSheet.Name>
      <CharacterSheet.Playbook>{character.playbook}</CharacterSheet.Playbook>
    </CharacterSheet.Header>

    <CharacterSheet.Body>
      <CharacterSheet.Section title="Attributes">
        <AttributeGrid attributes={character.attributes} ruleset={ruleset} />
      </CharacterSheet.Section>

      <CharacterSheet.Section title="Skills">
        <SkillList skills={character.skills} ruleset={ruleset} />
      </CharacterSheet.Section>

      <CharacterSheet.Section title="Special Abilities">
        <AbilityTracker abilities={character.abilities} />
      </CharacterSheet.Section>
    </CharacterSheet.Body>
  </CharacterSheet.Container>
)
```

#### Wizard Pattern for Complex Forms
```typescript
// Multi-step character creation wizard
interface WizardStep {
  id: string
  title: string
  component: React.ComponentType<StepProps>
  validation: (data: any) => ValidationResult
}

const characterCreationSteps: WizardStep[] = [
  {
    id: 'playbook',
    title: 'Choose Playbook',
    component: PlaybookSelection,
    validation: validatePlaybookSelection
  },
  {
    id: 'attributes',
    title: 'Assign Attributes',
    component: AttributeAssignment,
    validation: validateAttributeAssignment
  },
  {
    id: 'skills',
    title: 'Select Skills',
    component: SkillSelection,
    validation: validateSkillSelection
  },
  {
    id: 'abilities',
    title: 'Special Abilities',
    component: AbilitySelection,
    validation: validateAbilitySelection
  }
]

const CharacterCreationWizard = ({ gameId, ruleset }: WizardProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [characterData, setCharacterData] = useState<PartialCharacter>({})

  return (
    <Wizard steps={characterCreationSteps} currentStep={currentStep}>
      <Wizard.Navigation />
      <Wizard.Content />
      <Wizard.Actions />
    </Wizard>
  )
}
```

### Discord Authentication Integration

#### Supabase + Discord OAuth Flow
```typescript
// Discord authentication with profile creation
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClientComponentClient()

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email'
      }
    })

    if (error) {
      console.error('Discord authentication error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ signInWithDiscord }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### Profile Creation & Onboarding
```typescript
// Automatic profile creation after Discord OAuth
const AuthCallback = () => {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (session?.user) {
        // Check if profile exists, create if needed
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          // Profile will be created by database trigger
          // Redirect to onboarding for role selection
          router.push('/onboarding')
        } else {
          // Existing user, redirect to dashboard
          router.push('/dashboard')
        }
      }
    }

    handleAuthCallback()
  }, [router, supabase])

  return <LoadingSpinner />
}
```

### State Management Architecture

#### Zustand Store Structure
```typescript
// Character management store
interface CharacterStore {
  characters: Character[]
  currentCharacter: Character | null
  isCreating: boolean

  // Actions
  setCurrentCharacter: (character: Character) => void
  createCharacter: (gameId: string, characterData: CreateCharacterData) => Promise<void>
  updateCharacter: (characterId: string, updates: Partial<Character>) => Promise<void>
  deleteCharacter: (characterId: string) => Promise<void>
}

const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  currentCharacter: null,
  isCreating: false,

  setCurrentCharacter: (character) => set({ currentCharacter: character }),

  createCharacter: async (gameId, characterData) => {
    set({ isCreating: true })
    try {
      const newCharacter = await createCharacterMutation(gameId, characterData)
      set(state => ({
        characters: [...state.characters, newCharacter],
        currentCharacter: newCharacter,
        isCreating: false
      }))
    } catch (error) {
      set({ isCreating: false })
      throw error
    }
  }
}))
```

#### TanStack Query Integration
```typescript
// Server state management for characters
const useCharacters = (gameId: string) => {
  return useQuery({
    queryKey: ['characters', gameId],
    queryFn: () => getCharactersByGame(gameId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  })
}

const useCreateCharacter = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCharacter,
    onSuccess: (newCharacter) => {
      // Optimistic update
      queryClient.setQueryData(
        ['characters', newCharacter.gameId],
        (old: Character[] = []) => [...old, newCharacter]
      )
    },
    onError: (error) => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['characters'] })
    }
  })
}
```

### Responsive Design Strategy

#### Mobile-First Character Sheets
```typescript
// Responsive character sheet layout
const CharacterSheet = ({ character }: { character: Character }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Mobile: Full width sections */}
    <div className="lg:col-span-2">
      <CharacterHeader character={character} />
      <AttributeSection attributes={character.attributes} />
    </div>

    <div className="lg:col-span-1">
      <SkillSection skills={character.skills} />
      <StressTracker stress={character.stress} />
    </div>
  </div>
)
```

#### Progressive Enhancement
```typescript
// Enhanced features for larger screens
const useResponsiveFeatures = () => {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return {
    isDesktop,
    enableAdvancedFeatures: isDesktop,
    showSidebar: isDesktop,
    useCompactLayout: !isDesktop
  }
}
```

### Performance Optimization

#### Component Lazy Loading
```typescript
// Lazy load heavy character sheet components
const CharacterSheet = lazy(() => import('./CharacterSheet'))
const RulesetEditor = lazy(() => import('./RulesetEditor'))
const GameDashboard = lazy(() => import('./GameDashboard'))

// Loading boundary with game-themed spinner
const ComponentSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<GameLoadingSpinner />}>
    {children}
  </Suspense>
)
```

#### Bundle Optimization
```typescript
// Tree-shaking friendly imports
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'

// Avoid importing entire libraries
import { debounce } from 'lodash/debounce'  // ❌ Imports entire lodash
import debounce from 'lodash.debounce'     // ✅ Imports only debounce
```

This UI framework architecture provides a solid foundation for building the HeistMind interface with gaming-focused aesthetics, accessibility compliance, and optimal performance for TTRPG character management workflows.

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

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9.15.0'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --no-frozen-lockfile
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
