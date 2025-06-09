# System Patterns: HeistMind

## Architecture Overview

### Multi-Tenant Monorepo Structure
The project follows a multi-tenant monorepo pattern with clear domain boundaries:

```
heist-mind/
├── apps/                    # Application implementations
│   └── web/                # Next.js web application
├── packages/               # Shared packages
│   ├── database/          # Database client and types
│   └── shared/            # Common utilities and types
├── supabase/              # Database schema and migrations
└── memory-bank/           # Project documentation
```

### Core Domain Architecture

The system is built around three primary domains with clear boundaries:

#### Content Domain
- **Rulesets**: User-uploaded FitD game rules and variations
- **Templates**: Reusable game creation templates
- **Validation**: Rule consistency and completeness checking

#### Game Domain
- **Game Sessions**: Individual game instances with specific rulesets
- **Invitations**: Player invitation and access management
- **Permissions**: Role-based access control within games

#### Character Domain
- **Characters**: Player characters within specific game contexts
- **Progression**: XP tracking and advancement within rule constraints
- **Validation**: Character legality within game-specific rulesets

## Multi-Tenant Design Patterns

### Tenant Isolation Strategy

#### Database-Level Isolation
```sql
-- Row Level Security for tenant isolation
CREATE POLICY "gm_content_isolation" ON rulesets
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "game_access_control" ON games
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id AND player_id = auth.uid()
    )
  );
```

#### Application-Level Patterns
- **Tenant Context**: Request-scoped tenant identification
- **Data Scoping**: Automatic filtering of queries by tenant
- **Permission Boundaries**: Clear separation of GM and Player capabilities

### Resource Ownership Model
```typescript
interface TenantResource {
  id: string
  tenantId: string // Game Master's user ID
  createdAt: Date
  updatedAt: Date
}

interface GameResource extends TenantResource {
  gameId: string // Additional scope for game-specific resources
}
```

## Dynamic Ruleset Architecture

### Rule Definition Pattern

#### Flexible Schema Design
```typescript
interface RulesetDefinition {
  metadata: RulesetMetadata
  characterCreation: CharacterCreationRules
  progression: ProgressionRules
  validation: ValidationRules
}

interface CharacterCreationRules {
  playbooks: PlaybookDefinition[]
  attributes: AttributeDefinition[]
  skills: SkillDefinition[]
  specialAbilities: AbilityDefinition[]
  equipment: EquipmentRules
}
```

#### Rule Validation Engine
```typescript
class RulesetValidator {
  validateRuleset(ruleset: RulesetDefinition): ValidationResult
  validateCharacter(character: Character, ruleset: RulesetDefinition): ValidationResult
  suggestFixes(errors: ValidationError[]): FixSuggestion[]
}
```

### Content Management Patterns

#### Upload and Processing Pipeline
1. **File Upload**: Drag-and-drop interface with file type validation
2. **Schema Validation**: JSON schema validation against FitD structure
3. **Content Analysis**: Semantic validation of rule relationships
4. **Preview Generation**: Visual representation of ruleset impact
5. **Storage and Indexing**: Optimized storage with search capabilities

#### Version Control Strategy
```typescript
interface RulesetVersion {
  id: string
  rulesetId: string
  version: string
  changes: ChangeLog[]
  isActive: boolean
  compatibilityFlags: CompatibilityFlag[]
}
```

## Game Management Patterns

### Game Lifecycle Management

#### Game States and Transitions
```typescript
enum GameState {
  DRAFT = 'draft',           // Being configured by GM
  RECRUITING = 'recruiting', // Open for player invitations
  ACTIVE = 'active',        // Game in progress
  PAUSED = 'paused',        // Temporarily inactive
  COMPLETED = 'completed'   // Game finished
}

class GameStateMachine {
  transition(from: GameState, to: GameState, context: GameContext): boolean
  validateTransition(transition: StateTransition): ValidationResult
}
```

#### Invitation Management
```typescript
interface GameInvitation {
  id: string
  gameId: string
  invitedBy: string
  invitedPlayer?: string  // Specific player (optional)
  inviteCode: string      // Public invitation code
  expiresAt: Date
  maxUses?: number
  usedCount: number
  status: InvitationStatus
}
```

### Permission System

#### Role-Based Access Control
```typescript
enum GameRole {
  GAME_MASTER = 'gm',
  PLAYER = 'player',
  OBSERVER = 'observer'
}

interface GamePermissions {
  canViewGame: boolean
  canEditGame: boolean
  canInvitePlayers: boolean
  canCreateCharacters: boolean
  canEditOwnCharacters: boolean
  canViewOtherCharacters: boolean
}
```

#### Context-Aware Permissions
```typescript
class PermissionService {
  getUserPermissions(userId: string, gameId: string): GamePermissions
  checkPermission(userId: string, gameId: string, action: string): boolean
  enforcePermission(permission: Permission): PermissionDecorator
}
```

## Character System Patterns

### Dynamic Character Creation

#### Rule-Driven Form Generation
```typescript
interface CharacterFormConfig {
  steps: FormStep[]
  validations: ValidationRule[]
  dependencies: FieldDependency[]
  conditionalFields: ConditionalField[]
}

class CharacterFormBuilder {
  buildForm(ruleset: RulesetDefinition): CharacterFormConfig
  validateStep(stepData: StepData, rules: ValidationRule[]): ValidationResult
  getNextStep(currentStep: FormStep, character: PartialCharacter): FormStep
}
```

#### Progressive Validation
```typescript
class CharacterValidator {
  validateStep(step: FormStep, data: StepData, ruleset: RulesetDefinition): ValidationResult
  validateComplete(character: Character, ruleset: RulesetDefinition): ValidationResult
  getSuggestions(character: PartialCharacter, ruleset: RulesetDefinition): Suggestion[]
}
```

### Character-Game Relationship

#### Flexible Association Model
```typescript
interface CharacterGameAssociation {
  characterId: string
  gameId: string
  status: AssociationStatus  // active, inactive, pending
  joinedAt: Date
  leftAt?: Date
  gameSpecificData: Record<string, any>  // Game-specific character modifications
}
```

#### Character Portability Rules
```typescript
class PortabilityService {
  checkCompatibility(character: Character, targetGame: Game): CompatibilityResult
  adaptCharacter(character: Character, targetRuleset: RulesetDefinition): Character
  suggestAdaptations(character: Character, targetRuleset: RulesetDefinition): Adaptation[]
}
```

## Data Flow Patterns

### Command Query Responsibility Segregation (CQRS)

#### Command Side (Mutations)
```typescript
interface Command {
  type: string
  payload: any
  metadata: CommandMetadata
}

class CommandHandler<T extends Command> {
  handle(command: T): Promise<CommandResult>
  validate(command: T): ValidationResult
}
```

#### Query Side (Reads)
```typescript
interface Query {
  type: string
  parameters: any
}

class QueryHandler<T extends Query> {
  handle(query: T): Promise<QueryResult>
  buildQuery(parameters: any): DatabaseQuery
}
```

### Event-Driven Architecture

#### Domain Events
```typescript
interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  payload: any
  metadata: EventMetadata
  occurredAt: Date
}

// Character Events
class CharacterCreatedEvent implements DomainEvent
class CharacterAdvancedEvent implements DomainEvent
class CharacterJoinedGameEvent implements DomainEvent

// Game Events
class GameCreatedEvent implements DomainEvent
class PlayerInvitedEvent implements DomainEvent
class RulesetUpdatedEvent implements DomainEvent
```

#### Event Handlers
```typescript
interface EventHandler<T extends DomainEvent> {
  canHandle(event: DomainEvent): boolean
  handle(event: T): Promise<void>
}

class NotificationHandler implements EventHandler<PlayerInvitedEvent>
class CharacterValidationHandler implements EventHandler<RulesetUpdatedEvent>
```

## Security Patterns

### Authentication & Authorization

#### Multi-Level Security
```typescript
interface SecurityContext {
  user: User
  tenant: Tenant
  game?: Game
  permissions: Permission[]
}

class SecurityService {
  authenticate(credentials: Credentials): Promise<AuthResult>
  authorize(context: SecurityContext, resource: Resource, action: Action): boolean
  validateAccess(request: Request): Promise<SecurityContext>
}
```

#### Data Protection
```typescript
class DataProtectionService {
  encryptSensitiveData(data: any): EncryptedData
  auditDataAccess(context: SecurityContext, resource: Resource): void
  anonymizeUserData(userId: string): Promise<void>
}
```

### Content Security

#### User-Generated Content Validation
```typescript
class ContentSecurityService {
  validateUpload(file: File, rules: SecurityRules): SecurityResult
  scanForMaliciousContent(content: string): ScanResult
  sanitizeUserInput(input: string): string
}
```

## Performance Patterns

### Caching Strategy

#### Multi-Level Caching
```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  invalidate(pattern: string): Promise<void>
}

// Cache hierarchies
class RulesetCache extends CacheService    // Long-lived, tenant-scoped
class GameCache extends CacheService       // Medium-lived, game-scoped
class SessionCache extends CacheService    // Short-lived, user-scoped
```

#### Query Optimization
```typescript
class QueryOptimizer {
  optimizeRulesetQuery(rulesetId: string): OptimizedQuery
  prefetchGameData(gameId: string): Promise<void>
  batchCharacterQueries(characterIds: string[]): Promise<Character[]>
}
```

### Resource Management

#### Connection Pooling
```typescript
class DatabaseConnectionManager {
  getConnection(tenant: string): Promise<DatabaseConnection>
  releaseConnection(connection: DatabaseConnection): void
  monitorConnectionHealth(): HealthMetrics
}
```

## Error Handling Patterns

### Hierarchical Error Management

#### Error Types and Recovery
```typescript
abstract class ApplicationError extends Error {
  abstract readonly type: string
  abstract readonly severity: ErrorSeverity
  abstract getRecoveryOptions(): RecoveryOption[]
}

class RulesetValidationError extends ApplicationError
class GamePermissionError extends ApplicationError
class CharacterConstraintError extends ApplicationError
```

#### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>
  isOpen(): boolean
  getFailureRate(): number
}
```

## Testing Patterns

### Multi-Tenant Testing

#### Test Data Isolation
```typescript
class TestTenantManager {
  createTestTenant(): Promise<TestTenant>
  seedTenantData(tenant: TestTenant, data: SeedData): Promise<void>
  cleanupTestTenant(tenant: TestTenant): Promise<void>
}
```

#### Integration Testing
```typescript
class GameFlowTestSuite {
  testCompleteGameCreationFlow(): Promise<TestResult>
  testCharacterCreationWithCustomRules(): Promise<TestResult>
  testMultiPlayerGameInteraction(): Promise<TestResult>
}
```

This system pattern foundation ensures HeistMind can scale securely while maintaining the flexibility needed for diverse FitD rulesets and community requirements.
