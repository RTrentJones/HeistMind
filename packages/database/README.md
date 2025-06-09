# HeistMind Database Package

This package provides a clean abstraction layer for database operations with proper separation between domain types and database-specific types.

## Architecture Overview

The database package follows a layered architecture with clear separation of concerns:

```
packages/database/
├── domain-types.ts          # Clean, database-agnostic domain types
├── supabase-types.ts        # Auto-generated Supabase schema types
├── repositories.ts          # Repository interface definitions
├── client.ts               # Database client configuration
├── adapters/               # Type transformation layer
│   └── profile-adapter.ts  # Transforms between Supabase and domain types
└── implementations/        # Repository implementations
    └── supabase-profile-repository.ts
```

## Type Separation

### Domain Types (`domain-types.ts`)
- **Purpose**: Clean, database-agnostic types for application use
- **Exports**: Business entities like `Profile`, `Game`, `Character`, etc.
- **Maintenance**: Hand-crafted and version-controlled
- **Usage**: Used throughout the application for business logic

### Supabase Types (`supabase-types.ts`)
- **Purpose**: Auto-generated types from Supabase database schema
- **Exports**: `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, etc.
- **Maintenance**: Auto-generated via CI/CD when schema changes
- **Usage**: Only used within adapters and implementations

### Key Principles
1. **Domain types are never overwritten** by type generation
2. **Supabase types are kept internal** to this package
3. **Adapters bridge the gap** between the two type systems
4. **External packages only see domain types**

## Type Generation

### Automatic Generation
Types are automatically generated when database migrations change:

```bash
# Triggers GitHub Action that:
# 1. Generates new Supabase types
# 2. Commits them to supabase-types.ts
# 3. Validates type separation
```

### Manual Generation
For local development:

```bash
# Generate from remote Supabase project
pnpm run db:types

# Generate from local Supabase instance
pnpm run db:types-local
```

## Repository Pattern

### Interface Definition
All repository interfaces are defined in `repositories.ts` using domain types:

```typescript
export interface ProfileRepository {
    create(data: CreateProfileData): Promise<Result<Profile>>
    findById(id: string): Promise<Result<Profile | null>>
    // ... other methods
}
```

### Implementation
Implementations use adapters to transform between type systems:

```typescript
export class SupabaseProfileRepository implements ProfileRepository {
    async create(data: CreateProfileData): Promise<Result<Profile>> {
        const insertData = toSupabaseProfileInsert(data, userId)
        const { data: row } = await this.supabase.from('profiles').insert(insertData)
        return { success: true, data: fromSupabaseProfile(row) }
    }
}
```

### Adapters
Adapters handle type transformation:

```typescript
// From Supabase row to domain entity
export function fromSupabaseProfile(row: Tables<'profiles'>): Profile {
    return {
        id: row.id,
        username: row.username,
        // ... transform fields
    }
}

// From domain data to Supabase insert
export function toSupabaseProfileInsert(data: CreateProfileData): TablesInsert<'profiles'> {
    return {
        username: data.username,
        // ... transform fields
    }
}
```

## Usage

### In Application Code
```typescript
import { ProfileRepository, Profile } from '@heist-mind/database'

// Only domain types are visible
const profile: Profile = await profileRepo.findById('123')
```

### In Database Package
```typescript
// Implementations can use both type systems
import type { Database } from './supabase-types'
import type { Profile } from './domain-types'
```

## CI/CD Integration

### Database Types Workflow
- **Trigger**: Changes to `supabase/migrations/**`
- **Action**: Generates fresh Supabase types
- **Result**: Auto-commits `supabase-types.ts`

### Validation Workflow
- **Trigger**: All PRs and pushes
- **Checks**:
  - Type separation is maintained
  - Domain types are not corrupted
  - All types compile correctly

## Best Practices

### Adding New Entities
1. **Define domain types** in `domain-types.ts`
2. **Create repository interface** in `repositories.ts`
3. **Build adapter** in `adapters/` directory
4. **Implement repository** in `implementations/`
5. **Update exports** in `index.ts` (domain types only)

### Type Safety
- Always use adapters to transform between type systems
- Never expose Supabase types outside this package
- Use `Result<T>` type for error handling
- Validate data at adapter boundaries

### Database Schema Changes
1. **Create migration** in `supabase/migrations/`
2. **Push to repository** - triggers type generation
3. **Update adapters** if field mappings change
4. **Update domain types** if business logic changes

## Error Handling

All repository methods return `Result<T>` for consistent error handling:

```typescript
const result = await profileRepo.findById('123')

if (result.success) {
    const profile = result.data // Type: Profile
} else {
    const error = result.error // Type: DatabaseError
}
```

## Development

### Local Setup
```bash
# Install dependencies
pnpm install

# Generate types from local Supabase
pnpm run db:types-local

# Type check
pnpm run type-check
```

### Testing Type Separation
```bash
# Run CI validation locally
pnpm run type-check
pnpm run lint

# Validate type separation
npm test # (when tests are added)
```

This architecture ensures clean separation of concerns while maintaining type safety and enabling future database migrations without breaking application code.
