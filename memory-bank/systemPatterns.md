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

## UI/UX Design Patterns

### Gaming-Focused Design Language

#### TTRPG Aesthetic Principles
```typescript
// Design system philosophy for tabletop gaming
const designPhilosophy = {
  // Dark theme optimized for long gaming sessions
  colorPalette: {
    primary: 'Deep dark backgrounds reduce eye strain',
    accent: 'TTRPG-themed colors (crimson for stress, gold for XP)',
    semantic: 'Game-specific colors for different mechanics'
  },

  // Typography reflecting tabletop tradition
  typography: {
    character: 'Bold, readable fonts for character names',
    mechanical: 'Monospace fonts for game mechanics',
    narrative: 'Clean sans-serif for descriptions'
  },

  // Spacing based on character sheet layouts
  spacing: {
    sheet: 'Character sheet section spacing',
    component: 'Individual component spacing',
    tight: 'Dense information display'
  }
}
```

#### Accessibility-First Component Design
```typescript
// Radix UI primitives with WCAG 2.1 compliance
interface AccessibleComponentProps {
  // Keyboard navigation support
  onKeyDown?: (event: KeyboardEvent) => void
  tabIndex?: number

  // Screen reader support
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean

  // Focus management
  autoFocus?: boolean
  focusRing?: boolean
}

// Example: Accessible character sheet tab system
const CharacterTabs = () => (
  <Tabs.Root defaultValue="attributes">
    <Tabs.List
      className="flex border-b border-border"
      aria-label="Character sheet sections"
    >
      <Tabs.Trigger
        value="attributes"
        className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-accent"
      >
        Attributes
      </Tabs.Trigger>
      <Tabs.Trigger value="skills">Skills</Tabs.Trigger>
      <Tabs.Trigger value="abilities">Special Abilities</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="attributes" className="mt-4">
      <AttributeGrid />
    </Tabs.Content>
  </Tabs.Root>
)
```

### Component Architecture Patterns

#### Compound Component Strategy
```typescript
// Flexible character sheet composition
interface CharacterSheetComponents {
  Container: React.ComponentType<ContainerProps>
  Header: React.ComponentType<HeaderProps>
  Section: React.ComponentType<SectionProps>
  Body: React.ComponentType<BodyProps>
}

// Usage pattern allows flexible layouts
const CustomCharacterSheet = () => (
  <CharacterSheet.Container>
    <CharacterSheet.Header>
      <CharacterName />
      <PlaybookBadge />
      <StressTracker />
    </CharacterSheet.Header>

    <CharacterSheet.Body>
      <CharacterSheet.Section title="Core">
        <AttributeGrid />
        <SkillList />
      </CharacterSheet.Section>

      <CharacterSheet.Section title="Advancement">
        <XPTracker />
        <AdvancementOptions />
      </CharacterSheet.Section>
    </CharacterSheet.Body>
  </CharacterSheet.Container>
)
```

#### Wizard Pattern for Complex Workflows
```typescript
// Multi-step character creation with validation
interface WizardState {
  currentStep: number
  completedSteps: number[]
  stepData: Record<string, any>
  isValid: boolean
}

class CharacterCreationWizard {
  private steps: WizardStep[]
  private state: WizardState

  constructor(ruleset: RulesetDefinition) {
    this.steps = this.generateStepsFromRuleset(ruleset)
    this.state = {
      currentStep: 0,
      completedSteps: [],
      stepData: {},
      isValid: false
    }
  }

  validateCurrentStep(): ValidationResult {
    const currentStep = this.steps[this.state.currentStep]
    return currentStep.validation(this.state.stepData)
  }

  canProceed(): boolean {
    return this.validateCurrentStep().isValid
  }

  nextStep(): void {
    if (this.canProceed()) {
      this.state.completedSteps.push(this.state.currentStep)
      this.state.currentStep++
    }
  }
}
```

### State Management Patterns

#### Domain-Driven State Organization
```typescript
// Separate stores for different domains
interface AppState {
  // Authentication state
  auth: {
    user: User | null
    session: Session | null
    isLoading: boolean
  }

  // Character management state
  characters: {
    byId: Record<string, Character>
    byGameId: Record<string, string[]>
    currentCharacter: string | null
    creationWizard: WizardState | null
  }

  // Game management state
  games: {
    byId: Record<string, Game>
    userGames: string[]
    currentGame: string | null
  }

  // UI state
  ui: {
    theme: 'dark' | 'light'
    sidebarOpen: boolean
    activeModal: string | null
    notifications: Notification[]
  }
}
```

#### Optimistic Updates with Rollback
```typescript
// Character update with optimistic UI
const useOptimisticCharacterUpdate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCharacter,

    // Optimistic update
    onMutate: async (variables) => {
      await queryClient.cancelQueries(['characters', variables.gameId])

      const previousCharacters = queryClient.getQueryData(['characters', variables.gameId])

      queryClient.setQueryData(['characters', variables.gameId], (old: Character[]) =>
        old.map(char =>
          char.id === variables.characterId
            ? { ...char, ...variables.updates }
            : char
        )
      )

      return { previousCharacters }
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousCharacters) {
        queryClient.setQueryData(['characters', variables.gameId], context.previousCharacters)
      }
    },

    // Always refetch after success or error
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['characters', variables.gameId])
    }
  })
}
```

### Form Validation Patterns

#### Rule-Driven Validation
```typescript
// Dynamic validation based on ruleset
interface ValidationRule {
  field: string
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any, context: any) => boolean
}

class RulesetValidator {
  constructor(private ruleset: RulesetDefinition) {}

  generateValidationRules(step: string): ValidationRule[] {
    switch (step) {
      case 'attributes':
        return this.ruleset.characterCreation.attributes.map(attr => ({
          field: attr.id,
          type: 'min',
          value: attr.minValue,
          message: `${attr.name} must be at least ${attr.minValue}`
        }))

      case 'skills':
        return [{
          field: 'skillPoints',
          type: 'custom',
          message: 'Must spend all skill points',
          validator: (value, context) => {
            const spent = Object.values(context.skills).reduce((sum, val) => sum + val, 0)
            return spent === this.ruleset.characterCreation.skillPoints
          }
        }]

      default:
        return []
    }
  }
}
```

#### Progressive Validation with User Feedback
```typescript
// Real-time validation with helpful guidance
const CharacterCreationStep = ({ stepData, ruleset, onUpdate }) => {
  const [validation, setValidation] = useState<ValidationResult>()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    const validator = new RulesetValidator(ruleset)
    const result = validator.validateStep(stepData)
    setValidation(result)

    if (!result.isValid) {
      const suggestions = validator.getSuggestions(stepData)
      setSuggestions(suggestions)
    }
  }, [stepData, ruleset])

  return (
    <div className="space-y-4">
      <StepContent data={stepData} onChange={onUpdate} />

      {validation && !validation.isValid && (
        <ValidationFeedback
          errors={validation.errors}
          suggestions={suggestions}
        />
      )}

      <ProgressIndicator
        completion={validation?.completionPercentage || 0}
      />
    </div>
  )
}
```

### Responsive Design Patterns

#### Adaptive Component Layouts
```typescript
// Components that adapt to screen size
const ResponsiveCharacterSheet = ({ character }) => {
  const { isDesktop, isMobile } = useResponsiveBreakpoints()

  if (isMobile) {
    return (
      <MobileCharacterSheet character={character}>
        <CollapsibleSection title="Attributes">
          <AttributeGrid layout="compact" />
        </CollapsibleSection>
        <CollapsibleSection title="Skills">
          <SkillList layout="list" />
        </CollapsibleSection>
      </MobileCharacterSheet>
    )
  }

  return (
    <DesktopCharacterSheet character={character}>
      <div className="grid grid-cols-3 gap-6">
        <AttributeGrid layout="grid" />
        <SkillList layout="columns" />
        <AbilityTracker layout="sidebar" />
      </div>
    </DesktopCharacterSheet>
  )
}
```

#### Progressive Enhancement Strategy
```typescript
// Core functionality works without JavaScript
const GameInvitation = ({ inviteCode }: { inviteCode: string }) => {
  const [isEnhanced, setIsEnhanced] = useState(false)

  useEffect(() => {
    // Enable enhanced features after hydration
    setIsEnhanced(true)
  }, [])

  return (
    <div className="invitation-card">
      {/* Core functionality: plain form submission */}
      <form action="/api/invitations/accept" method="POST">
        <input type="hidden" name="code" value={inviteCode} />
        <button type="submit" className="btn-primary">
          Accept Invitation
        </button>
      </form>

      {/* Enhanced functionality: JavaScript-powered UX */}
      {isEnhanced && (
        <EnhancedInvitationFlow inviteCode={inviteCode} />
      )}
    </div>
  )
}
```

### Real-Time Collaboration Patterns

#### Live Character Updates
```typescript
// Real-time character synchronization
const useRealtimeCharacter = (characterId: string) => {
  const [character, setCharacter] = useState<Character>()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const channel = supabase
      .channel(`character:${characterId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'characters',
        filter: `id=eq.${characterId}`
      }, (payload) => {
        setCharacter(payload.new as Character)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [characterId, supabase])

  return character
}
```

#### Conflict Resolution Strategy
```typescript
// Handle concurrent character edits
interface CharacterEdit {
  field: string
  value: any
  timestamp: number
  userId: string
}

class CharacterConflictResolver {
  resolveConflicts(localEdits: CharacterEdit[], remoteEdits: CharacterEdit[]): Character {
    const allEdits = [...localEdits, ...remoteEdits].sort((a, b) => a.timestamp - b.timestamp)

    return allEdits.reduce((character, edit) => {
      // Last-write-wins for most fields
      if (edit.field !== 'xp' && edit.field !== 'stress') {
        character[edit.field] = edit.value
      }

      // Additive for XP and stress
      if (edit.field === 'xp' || edit.field === 'stress') {
        character[edit.field] = Math.max(character[edit.field] || 0, edit.value)
      }

      return character
    }, {} as Character)
  }
}
```

### Performance Optimization Patterns

#### Lazy Loading with Suspense
```typescript
// Component-level code splitting
const LazyCharacterSheet = lazy(() =>
  import('./CharacterSheet').then(module => ({
    default: module.CharacterSheet
  }))
)

const LazyRulesetEditor = lazy(() => import('./RulesetEditor'))

// Suspense boundaries with game-themed loading
const GameSuspense = ({ children, fallback }: SuspenseProps) => (
  <Suspense fallback={fallback || <DiceLoadingSpinner />}>
    {children}
  </Suspense>
)
```

#### Virtualization for Large Lists
```typescript
// Virtual scrolling for character/game lists
const VirtualizedCharacterList = ({ characters }: { characters: Character[] }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: characters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Character card height
    overscan: 5
  })

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <CharacterCard character={characters[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

This comprehensive UI/UX pattern library ensures HeistMind provides an optimal gaming experience while maintaining accessibility, performance, and scalability standards.
