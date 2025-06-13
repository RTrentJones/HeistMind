# HeistMind Web App Architecture

This document outlines the FAANG-level, domain-separated architecture implemented for the HeistMind web application.

## Overview

The architecture follows Domain-Driven Design (DDD) principles with clear separation of concerns, using Zustand for state management and React for the UI layer. All UI components use the `@heist-mind/ui` library for consistency.

## Project Structure

```
apps/web/src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Auth route group
│   ├── dashboard/                 # Main dashboard
│   ├── games/                     # Game management
│   ├── characters/                # Character management
│   └── profile/                   # User profile
│
├── features/                      # Domain-driven feature modules
│   ├── auth/                      # Authentication domain
│   │   ├── components/            # Auth-specific UI components
│   │   ├── hooks/                 # Auth React hooks
│   │   ├── models/                # Auth domain models & validation
│   │   ├── services/              # Auth business logic
│   │   └── stores/                # Zustand auth stores
│   │
│   ├── games/                     # Game management domain
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── models/
│   │   ├── services/
│   │   └── stores/
│   │
│   ├── characters/                # Character management domain
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── models/
│   │   ├── services/
│   │   └── stores/
│   │
│   └── rulesets/                  # Ruleset management domain
│
├── shared/                        # Shared utilities across features
│   ├── components/                # Generic UI components
│   ├── hooks/                     # Generic React hooks
│   ├── stores/                    # Global Zustand stores
│   ├── services/                  # Cross-cutting services
│   ├── utils/                     # Pure utility functions
│   └── types/                     # Shared TypeScript types
│
└── lib/                          # External integrations & config
    ├── auth/                     # Auth provider setup
    └── i18n/                     # Internationalization
```

## Architecture Principles

### 1. Domain-Driven Design (DDD)
- Each feature represents a business domain (auth, games, characters, rulesets)
- Complete separation of concerns within each domain
- Clear boundaries between domains
- Domain-specific stores, services, and components

### 2. Layered Architecture per Feature
- **Models**: Domain entities, validation schemas, business rules
- **Services**: Business logic, API calls, data transformations
- **Stores**: Zustand state management with domain-specific slices
- **Components**: UI components specific to the domain
- **Hooks**: Custom React hooks for domain logic

### 3. State Management with Zustand
- Domain-specific stores with clear separation
- Persistent state for user preferences and selections
- Optimistic updates with proper error handling
- Computed selectors for derived state
- Actions grouped by functionality (CRUD, management, filters)

### 4. Service Layer Pattern
- Abstracted business logic away from UI components
- Proper error handling with localized messages
- Integration with the database package repositories
- Type-safe API communication

### 5. Component Organization
- Use `@heist-mind/ui` for all base components
- Feature-specific components in feature directories
- Composition over inheritance
- Props interfaces co-located with components

## Store Architecture

### Store Structure Example (Games Domain)
```typescript
interface GamesState extends LoadingState {
    // Collections
    games: Game[]
    userGames: Game[]
    gameDetails: Record<string, GameWithDetails>
    selectedGame: GameWithDetails | null

    // UI State
    pagination: PaginationState
    filters: FilterState

    // Actions - CRUD
    loadGames: (refresh?: boolean) => Promise<void>
    createGame: (data: CreateGameData) => Promise<Game>
    updateGame: (gameId: string, data: UpdateGameData) => Promise<Game>
    deleteGame: (gameId: string) => Promise<void>

    // Actions - Domain-specific
    joinGame: (gameId: string, inviteCode?: string) => Promise<void>
    leaveGame: (gameId: string) => Promise<void>

    // Actions - UI Management
    selectGame: (gameId: string) => void
    setFilters: (filters: Partial<FilterState>) => void
}
```

### Store Features
- **Persistence**: Critical state persisted across sessions
- **Optimistic Updates**: UI updates immediately, rollback on error
- **Error Handling**: Localized error messages via i18n
- **Loading States**: Granular loading indicators
- **Computed Selectors**: Derived state for common UI needs

## Service Integration

### Database Integration
- Uses the `@heist-mind/database` package repositories
- Type-safe domain operations
- Result pattern for error handling
- Transaction support for complex operations

### Error Handling
- Centralized error handler with i18n support
- Graceful degradation for network issues
- User-friendly error messages
- Automatic retry for transient failures

### Internationalization
- Full i18n support with typed translation keys
- Domain-specific translation namespaces
- Error messages localized
- RTL support ready

## Implementation Examples

### 1. Authentication Store
- Session management with persistence
- Profile integration with user data
- OAuth provider support (Google, Discord)
- Automatic session refresh

### 2. Games Store
- Game CRUD operations
- Player management (join/leave)
- Filtering and pagination
- Game state management (draft → recruiting → active)

### 3. Characters Store
- Character lifecycle management
- Experience and advancement tracking
- Character transfer between games
- Character cloning functionality

## Shared Infrastructure

### Global Stores
- **UI Store**: Theme, modals, navigation state
- **Notification Store**: Toast notifications with actions
- **App Store**: Global application state

### Utilities
- **API Client**: Type-safe HTTP client with error handling
- **Error Handler**: Centralized error processing with i18n
- **Form Utilities**: Validation and form state management
- **Date/String/Array Utilities**: Common data manipulation

### Services
- **Authentication Service**: Wrapper around database auth
- **WebSocket Service**: Real-time communication
- **File Upload Service**: Asset management

## Benefits of This Architecture

### Developer Experience
- **Type Safety**: Full TypeScript coverage with strict types
- **Developer Tools**: Zustand DevTools integration
- **Hot Reload**: Fast development feedback
- **Code Organization**: Clear file structure and naming conventions

### Maintainability
- **Separation of Concerns**: Clear boundaries between layers
- **Testability**: Pure functions and isolated components
- **Scalability**: Easy to add new domains and features
- **Documentation**: Self-documenting code with TypeScript

### Performance
- **Optimistic Updates**: Immediate UI feedback
- **Smart Caching**: Efficient data loading and caching
- **Code Splitting**: Domain-based code splitting
- **Tree Shaking**: Minimal bundle sizes

### User Experience
- **Consistent UI**: `@heist-mind/ui` component library
- **Accessibility**: ARIA compliant components
- **Internationalization**: Full i18n support
- **Responsive Design**: Mobile-first approach

## Next Steps

### Immediate
1. Complete remaining domain stores (rulesets, dashboard)
2. Implement React components using the stores
3. Add comprehensive error boundaries
4. Set up component testing with domain isolation

### Future
1. Add real-time WebSocket integration
2. Implement offline-first capabilities with sync
3. Add comprehensive analytics tracking
4. Performance monitoring and optimization

This architecture provides a solid foundation for a scalable, maintainable, and performant web application that can grow with the business needs while maintaining code quality and developer productivity.
