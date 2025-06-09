# HeistMind Database Package

Database abstraction layer for HeistMind, providing clean domain types and repository interfaces that enable easy database provider swapping.

## Architecture

This package uses a **database-agnostic approach** with clean separation between:

- **Domain Types** - Application-facing interfaces (`domain-types.ts`)
- **Repository Contracts** - Data access interfaces (`repositories.ts`)
- **Supabase Implementation** - Current database provider (internal)

This design allows swapping Supabase for PostgreSQL, MySQL, or other databases in the future without changing application code.

## Usage

### Import Clean Types

```typescript
import { Game, Character, CreateGameData, GameRepository } from '@heist-mind/database'

// Use clean domain types in your application
function createGame(data: CreateGameData): Promise<Game> {
  // Implementation uses repository interfaces
}
```

### Database Operations

```typescript
import { DatabaseRepositories } from '@heist-mind/database'

// Repository interfaces provide clean data access
async function getGameWithDetails(gameId: string, repositories: DatabaseRepositories) {
  const result = await repositories.games.findWithDetails(gameId)

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}
```

## Key Features

### Multi-Tenant Architecture
- **Row Level Security** enforced at database level
- **Context-aware permissions** based on game roles
- **Automatic tenant isolation** for Game Master content

### Dynamic Role System
- **Game-specific roles** (not global user roles)
- **Flexible permissions** per game context
- **Automatic GM assignment** when creating games

### Complex Data Support
- **JSONB storage** for flexible FitD ruleset content
- **Character portability** between compatible games
- **Game-specific rule overrides** and house rules

### Type Safety
- **End-to-end TypeScript** from database to UI
- **Generated types** from actual database schema
- **Domain-specific interfaces** for business logic

## Database Schema

### Core Tables

#### `profiles`
User profiles with preferences and metadata
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'
);
```

#### `rulesets`
GM-uploaded FitD game rules with complex content
```sql
CREATE TABLE rulesets (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  content JSONB NOT NULL, -- Complex FitD ruleset
  status TEXT DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false
);
```

#### `games`
Game instances with specific rulesets
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  ruleset_id UUID REFERENCES rulesets(id),
  name TEXT NOT NULL,
  state TEXT DEFAULT 'draft',
  max_players INTEGER DEFAULT 6
);
```

#### `game_players`
Many-to-many with context-specific roles
```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'player', -- game_master, player, co_gm, spectator
  status TEXT DEFAULT 'invited'
);
```

#### `characters`
Player characters within specific games
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  game_id UUID REFERENCES games(id),
  name TEXT NOT NULL,
  character_data JSONB NOT NULL, -- Flexible character content
  playbook_type TEXT NOT NULL
);
```

#### `invitations`
Game invitation management
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  invited_by UUID REFERENCES profiles(id),
  invited_player UUID REFERENCES profiles(id), -- OR
  invite_code TEXT UNIQUE, -- Public invitation codes
  status TEXT DEFAULT 'pending'
);
```

### Security Features

#### Row Level Security (RLS)
All tables have RLS policies that automatically enforce:
- **Tenant isolation** - GMs only see their content
- **Game access control** - Players only access their games
- **Character permissions** - Players manage own characters, GMs manage all

#### Helper Functions
```sql
-- Check if user is GM of specific game
SELECT is_game_master(user_id, game_id);

-- Get user's role in specific game
SELECT get_user_game_role(user_id, game_id);
```

## Development Scripts

### Database Operations
```bash
# Push migrations to remote Supabase
pnpm db:push

# Reset local database
pnpm db:reset

# Generate types from remote database
pnpm db:types

# Generate types from local database
pnpm db:types-local

# Check schema differences
pnpm db:diff
```

### Local Development
```bash
# Start local Supabase
supabase start

# Apply migrations locally
supabase db reset

# Generate types locally
pnpm db:types-local
```

## GitHub Actions CI/CD

The included workflow (`.github/workflows/supabase-ci.yml`) provides:

### Validation Stage
- **Migration syntax checking** using Supabase CLI
- **Schema validation** against local instance
- **Type generation verification** ensures types compile
- **Diff checking** catches unexpected schema changes

### Deployment Stage
- **Automatic deployment** on push to main/development
- **Type generation** from production schema
- **Auto-commit** updated types back to repository
- **Health verification** ensures successful deployment

### Required GitHub Secrets
```
SUPABASE_ACCESS_TOKEN  # Supabase API access token
SUPABASE_PROJECT_ID    # Your Supabase project ID
SUPABASE_DB_PASSWORD   # Database password (if needed)
```

## Future Database Providers

The repository interface design supports easy migration to other databases:

### Adding PostgreSQL Support
1. Implement `DatabaseProvider` interface for PostgreSQL
2. Create PostgreSQL-specific repository implementations
3. Update dependency injection to use new provider
4. Application code remains unchanged

### Adding MySQL Support
1. Implement repository interfaces using MySQL client
2. Map domain types to MySQL schema
3. Implement transaction support
4. Swap provider in configuration

## Complex Data Examples

### Ruleset Content Structure
```typescript
const rulesetContent: RulesetContent = {
  metadata: {
    name: "Blades in the Dark",
    version: "2.0",
    author: "John Harper",
    description: "Industrial fantasy heist RPG",
    system: "blades-in-the-dark"
  },
  playbooks: [
    {
      id: "cutter",
      name: "The Cutter",
      description: "A dangerous and intimidating fighter",
      startingAbilities: ["battleborn"],
      specialAbilities: ["ghost-fighter", "leader", "not-to-be-trifled-with"],
      attributes: { insight: 1, prowess: 3, resolve: 2 },
      skills: { skirmish: 2, command: 1 }
    }
  ],
  attributes: [
    {
      id: "prowess",
      name: "Prowess",
      description: "Physical and martial abilities",
      skills: ["finesse", "prowl", "skirmish", "study", "survey", "wreck"]
    }
  ]
  // ... more complex structure
}
```

### Character Data Structure
```typescript
const characterData: CharacterData = {
  playbook: "cutter",
  heritage: "akorosi",
  background: "military",
  vice: "gambling",
  attributes: { insight: 2, prowess: 3, resolve: 1 },
  skills: { skirmish: 2, command: 1, intimidate: 1 },
  specialAbilities: ["battleborn", "ghost-fighter"],
  stress: 3,
  trauma: ["reckless"],
  coins: 4,
  items: [
    {
      id: "fine-sword",
      name: "Fine Sword",
      description: "Masterwork blade",
      load: 2,
      quality: 2,
      equipped: true
    }
  ],
  contacts: [
    {
      name: "Marlane",
      description: "A pugilist who fought beside you",
      relationship: "friend"
    }
  ]
}
```

This database package provides a solid foundation for HeistMind's multi-tenant, role-based game management system while maintaining flexibility for future growth and database provider changes.
