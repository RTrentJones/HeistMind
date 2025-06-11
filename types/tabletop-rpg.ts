/**
 * Generic Tabletop RPG System Types - v1.0
 *
 * Centralized string system with key-based references for maximum flexibility
 * Optimized for Forged in the Dark variants (Blades, Scum & Villainy, Band of Blades)
 */

// Base internationalization types
export interface I18nString {
    en: string;
    default: string;
    [locale: string]: string;
}

// String reference types for centralized terminology
export type TerminologyKey = string; // References i18n.terminology
export type LocalizedKey = string;   // References i18n.strings

// Core metadata types
export interface GameMetadata {
    id: string;
    nameKey: LocalizedKey;
    version: string;
    schemaVersion: string;
    compatibilityVersion: string;
    gameDataVersion: string;
    author: string;
    descriptionKey: LocalizedKey;
    gameFamily: string;
    system: string;
    tags: string[];
    minimumAge: number;
    playerCount: {
        min: number;
        max: number;
        optimal: number;
    };
    sessionLength: {
        min: number;
        max: number;
        typical: number;
    };
    assets: {
        logo: string;
        background: string;
        icon: string;
    };
    // FitD-specific metadata
    fitdVariant?: {
        coreSystem: string;           // "blades-in-the-dark", "scum-and-villainy", "band-of-blades"
        settingTheme: string;         // "criminal", "space-opera", "military", "horror"
        groupFocus: string;           // "heist", "exploration", "survival", "politics"
        characterProgression: string; // "standard", "military-ranks", "supernatural"
    };
}

// Centralized internationalization system
export interface I18nConfig {
    supportedLanguages: string[];
    defaultLanguage: string;

    // Core game terminology (short, frequently referenced)
    terminology: Record<TerminologyKey, I18nString>;

    // Longer content (descriptions, help text, etc.)
    strings: Record<LocalizedKey, I18nString>;
}

// Character system types
export interface Contact {
    name: string;
    descriptionKey: LocalizedKey;
}

export interface CharacterTemplate {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    startingAbilities: string[];
    specialAbilities: string[];
    contacts: Contact[];
    equipment: string[];
    attributes: Record<string, number>;
    skills: Record<string, number>;
    templateMetadata?: {
        category?: TerminologyKey;        // "specialist" | "rookie" | "veteran"
        themes?: TerminologyKey[];        // ["combat", "social", "stealth", "technical"]
        recommendedFor?: TerminologyKey[]; // ["new-players", "experienced", "gm-npcs"]
        culturalNotesKey?: LocalizedKey;   // Setting-specific background info
    };
}

export interface Attribute {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    skills: string[];
    defaultValue: number;
    maxValue: number;
}

export interface Skill {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    attribute: string;
    exampleKeys: LocalizedKey[];
}

export interface SpecialAbility {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    characterTemplates: string[];
    abilityMetadata?: {
        prerequisiteKeys?: LocalizedKey[];
        upgradePathKey?: LocalizedKey;
        mechanicsNoteKey?: LocalizedKey;
    };
}

// Character creation types
export interface CharacterCreationStep {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    order: number;
    required: boolean;
}

export interface CharacterCreation {
    steps: CharacterCreationStep[];
}

export interface CharacterOption {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    optionMetadata?: {
        providerKey?: LocalizedKey;       // Where this option is available
        mechanicsKey?: LocalizedKey;      // Special rules or mechanics
        culturalKey?: LocalizedKey;       // Cultural significance or background
        [key: string]: any;               // Additional metadata
    };
}

// Equipment system types
export interface EquipmentItem {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    load: number;
    category: string;
    quality?: number;
    equipmentMetadata?: {
        availabilityKey?: LocalizedKey;   // Where/how to obtain
        culturalKey?: LocalizedKey;       // Cultural significance
        variantsKey?: LocalizedKey;       // Different versions
    };
}

export interface EquipmentCategory {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
}

export interface Equipment {
    loadCapacity: Record<string, number>;
    items: EquipmentItem[];
    categories: EquipmentCategory[];
    systemVariant?: {
        loadSystemKey?: TerminologyKey;   // "standard" | "military" | "vehicle" | "none"
        currencyTypes?: Array<{
            id: string;
            nameKey: TerminologyKey;
            descriptionKey: LocalizedKey;
        }>;
        specialSystemKeys?: TerminologyKey[]; // ["vehicles", "cybernetics", "magic-items"]
    };
}

// Advancement system types
export interface XpTrigger {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    value: number;
}

export interface AdvancementOption {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    cost: number;
    category: TerminologyKey;
}

export interface Advancement {
    xpTriggers: XpTrigger[];
    advancementOptions: AdvancementOption[];
}

// Group/Crew system types
export interface GroupType {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    huntingGroundsKey: LocalizedKey;
    startingUpgrades: string[];
    groupXpKey: LocalizedKey;
    specialAbilities: string[];
    groupMetadata?: {
        tier?: TerminologyKey;                // "standard" | "elite" | "legendary"
        operationalScope?: TerminologyKey;    // "local" | "sector" | "galactic"
        organizationType?: TerminologyKey;    // "criminal" | "military" | "corporate"
        leadershipStyle?: TerminologyKey;     // "democratic" | "hierarchical" | "anarchic"
    };
}

// World building types
export interface Location {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    traits: TerminologyKey[];
    securityLevel?: number;
    notableLocationKeys?: LocalizedKey[];
}

export interface Faction {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    tier?: number;
    type: TerminologyKey;
    status: TerminologyKey;
    assetKeys: LocalizedKey[];
    goalKeys: LocalizedKey[];
}

export interface WorldData {
    locations: Location[];
    factions: Faction[];
}

// Game mechanics types
export interface ActionOutcome {
    result: string;
    diceResult: string;
    descriptionKey: LocalizedKey;
}

export interface MechanicOption {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
}

export interface ActionResolution {
    diceSystem: string;
    outcomes: ActionOutcome[];
    position: MechanicOption[];
    effect: MechanicOption[];
    fitdCustomizations?: {
        positionEffectVariants?: {
            positionNames?: Record<string, TerminologyKey>;  // Custom position names
            effectNames?: Record<string, TerminologyKey>;    // Custom effect names
            additionalFactors?: TerminologyKey[];            // Game-specific factors
        };
    };
}

export interface ResourceSystem {
    maxValue: number;
    sourceKeys: LocalizedKey[];
    conditionKeys: TerminologyKey[];
    fitdCustomizations?: {
        resistanceRulesKey?: LocalizedKey;
        traumaEquivalentKey?: TerminologyKey;
        customConditions?: TerminologyKey[];
    };
}

export interface DamageLevel {
    level: number;
    nameKey: TerminologyKey;
    exampleKeys: LocalizedKey[];
}

export interface DamageSystem {
    levels: DamageLevel[];
}

export interface Mechanics {
    actionResolution: ActionResolution;
    stress?: ResourceSystem;
    harm?: DamageSystem;
    fitdMechanics?: {
        groupMechanics?: {
            cohortSystem?: boolean;           // Does this game use cohorts?
            vehicleRules?: boolean;           // Ships, mechs, etc.
            territorySystem?: boolean;        // Claims, sectors, etc.
            factionTurnRules?: boolean;       // Faction advancement between scores
        };
    };
    [key: string]: any; // Allow for custom mechanics
}

// GM Tools types
export interface ScenarioType {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    complicationKeys: LocalizedKey[];
}

export interface RandomEvent {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    trigger: string;
}

export interface Challenge {
    id: string;
    nameKey: TerminologyKey;
    descriptionKey: LocalizedKey;
    suggestedActions: string[];
}

export interface GmTools {
    scenarioTypes: ScenarioType[];
    randomEvents: RandomEvent[];
    challenges: Challenge[];
}

// Main game data interface
export interface TabletopRpgGameData {
    metadata: GameMetadata;
    i18n: I18nConfig;
    characterTemplates: CharacterTemplate[];
    attributes: Attribute[];
    skills: Skill[];
    specialAbilities: SpecialAbility[];
    characterCreation: CharacterCreation;
    characterOptions: Record<string, CharacterOption[]>; // heritage, background, vice, etc.
    equipment: Equipment;
    advancement: Advancement;
    groupTypes: GroupType[];
    worldData: WorldData;
    mechanics: Mechanics;
    gmTools: GmTools;
}

// Runtime character state types
export interface CharacterSheet {
    id: string;
    name: string;
    templateId: string;

    // Dynamic character options (heritage, background, etc.)
    selectedOptions: Record<string, string>;

    // Attributes and skills - dynamic based on game system
    attributes: Record<string, number>;
    skills: Record<string, number>;

    // Advancement
    specialAbilities: string[];
    experience: Record<string, number>;

    // Resources (stress, health, etc.) - dynamic based on game system
    resources: Record<string, number>;
    conditions: Record<string, string[]>;

    // Social connections
    contacts: {
        allies: string[];
        rivals: string[];
    };

    // Equipment
    equipment: string[];
    loadLevel?: string;

    // Custom fields for different game systems
    customFields: Record<string, any>;

    // Metadata
    description?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GroupSheet {
    id: string;
    name: string;
    typeId: string;

    // Dynamic group stats based on system
    stats: Record<string, number>;

    // Advancement
    experience: number;
    specialAbilities: string[];
    upgrades: string[];

    // Assets and territory
    assets: string[];
    territory: string[];

    // Relationships
    relationships: Record<string, string[]>;

    // Members
    memberIds: string[];

    // Custom fields for different game systems
    customFields: Record<string, any>;

    // Metadata
    description?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Game session types
export interface GameSession {
    id: string;
    name: string;
    gameSystemId: string;

    // Participants
    gmId: string;
    playerIds: string[];

    // Characters and groups
    characters: CharacterSheet[];
    group?: GroupSheet;

    // Session state - flexible for different systems
    currentScenario?: {
        type: string;
        details: Record<string, any>;
    };

    // Progress tracking
    sessionNumber: number;
    lastPlayed: Date;

    // Game state
    gameState: Record<string, any>;

    // Notes
    notes?: string;
    gmNotes?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

// Dice rolling types
export interface DiceRoll {
    id: string;
    dice: number;
    results: number[];
    total?: number;
    outcome: string;

    // Context based on game system
    context: {
        position?: string;
        effect?: string;
        skill?: string;
        characterId?: string;
        description?: string;
    };

    // Modifiers - flexible for different systems
    modifiers: Record<string, boolean | number | string>;

    // Metadata
    timestamp: Date;
    sessionId: string;
}

// Progress tracking types
export interface ProgressTracker {
    id: string;
    name: string;
    type: string;
    maxSegments: number;
    filledSegments: number;

    // Context
    description?: string;
    linkedEntityId?: string;
    linkedEntityType?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    sessionId: string;
}

// UI Component prop types
export interface CharacterSheetProps {
    character: CharacterSheet;
    gameData: TabletopRpgGameData;
    editable?: boolean;
    onUpdate?: (character: CharacterSheet) => void;
}

export interface DiceRollerProps {
    gameData: TabletopRpgGameData;
    characterId?: string;
    onRoll?: (roll: DiceRoll) => void;
}

export interface ProgressTrackerProps {
    tracker: ProgressTracker;
    editable?: boolean;
    onUpdate?: (tracker: ProgressTracker) => void;
}

// Utility types
export type GameDataValidator = (data: unknown) => data is TabletopRpgGameData;
export type CharacterValidator = (data: unknown) => data is CharacterSheet;
export type GroupValidator = (data: unknown) => data is GroupSheet;

// Helper types for extracting data from game configuration
export type ExtractIds<T extends { id: string }[]> = T[number]['id'];
export type ExtractTemplateIds<T extends TabletopRpgGameData> = ExtractIds<T['characterTemplates']>;
export type ExtractAttributeIds<T extends TabletopRpgGameData> = ExtractIds<T['attributes']>;
export type ExtractSkillIds<T extends TabletopRpgGameData> = ExtractIds<T['skills']>;

// Form validation types
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface CharacterCreationFormData {
    name: string;
    templateId: string;
    selectedOptions: Record<string, string>;
    attributes: Record<string, number>;
    skills: Record<string, number>;
    specialAbilities: string[];
    equipment: string[];
    description?: string;
}

// API response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    errors?: ValidationError[];
}

export interface GameSystemListResponse {
    systems: GameMetadata[];
    total: number;
    page: number;
    pageSize: number;
}

// Event types for real-time updates
export interface GameEvent {
    id: string;
    type: string;
    sessionId: string;
    userId: string;
    data: Record<string, any>;
    timestamp: Date;
}

export type GameEventHandler = (event: GameEvent) => void;
