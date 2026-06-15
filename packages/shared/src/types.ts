import { GameMechanics } from './constants';

export interface DiceRoll {
  dice: number;
  position: string; // Now configurable from game system
  effect: string; // Now configurable from game system
  result: number;
  rolls: number[];
  isSuccess: boolean;
  isCrit: boolean;
}

export interface Character {
  id: string;
  name: string;
  playbook: string;
  stress: number;
  harm: any[];
  stats: Record<string, any>;
}

// Generic game system configuration interface
export interface GameSystemConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  mechanics: GameMechanics;
  playbooks: PlaybookDefinition[];
  attributes: AttributeDefinition[];
  actions: ActionDefinition[];
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  specialAbilities: string[];
  startingActions: Record<string, number>;
  startingItems: string[];
}

export interface AttributeDefinition {
  id: string;
  name: string;
  description: string;
  actions: string[];
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  attribute: string;
}

// Campaign and session management
export interface Campaign {
  id: string;
  name: string;
  gameSystemId: string;
  dmId: string;
  playerIds: string[];
  characters: Character[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameSession {
  id: string;
  campaignId: string;
  name: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  notes: string;
  characterUpdates: Record<string, Partial<Character>>;
}

/* === FitD/HeistMind Types (ported from types/tabletop-rpg.ts) === */

export interface CharacterSheet {
  id: string;
  name: string;
  templateId: string;
  selectedOptions: Record<string, string>;
  attributes: Record<string, number>;
  skills: Record<string, number>;
  specialAbilities: string[];
  experience: Record<string, number>;
  resources: Record<string, number>;
  conditions: Record<string, string[]>;
  contacts: {
    allies: string[];
    rivals: string[];
  };
  equipment: string[];
  loadLevel?: string;
  customFields: Record<string, any>;
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TabletopRpgGameData {
  // Only including fields needed for UI/character rendering
  characterTemplates: CharacterTemplate[];
  attributes: Attribute[];
  skills: Skill[];
  specialAbilities: SpecialAbility[];
  characterOptions: Record<string, CharacterOption[]>;
  equipment: Equipment;
  advancement: Advancement;
  groupTypes: GroupType[];
  worldData: WorldData;
  mechanics: Mechanics;
}

export interface CharacterTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  startingAbilities: string[];
  specialAbilities: string[];
  contacts: Contact[];
  equipment: string[];
  attributes: Record<string, number>;
  skills: Record<string, number>;
}

export interface Contact {
  name: string;
  descriptionKey: string;
}

export interface Attribute {
  id: string;
  nameKey: string;
  descriptionKey: string;
  skills: string[];
  defaultValue: number;
  maxValue: number;
}

export interface Skill {
  id: string;
  nameKey: string;
  descriptionKey: string;
  attribute: string;
  exampleKeys: string[];
}

export interface SpecialAbility {
  id: string;
  nameKey: string;
  descriptionKey: string;
  characterTemplates: string[];
}

export interface CharacterOption {
  id: string;
  nameKey: string;
  descriptionKey: string;
}

export interface Equipment {
  loadCapacity: Record<string, number>;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

export interface EquipmentItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  load: number;
  category: string;
  quality?: number;
}

export interface EquipmentCategory {
  id: string;
  nameKey: string;
  descriptionKey: string;
}

export interface Advancement {
  xpTriggers: XpTrigger[];
  advancementOptions: AdvancementOption[];
}

export interface XpTrigger {
  id: string;
  nameKey: string;
  descriptionKey: string;
  value: number;
}

export interface AdvancementOption {
  id: string;
  nameKey: string;
  descriptionKey: string;
  cost: number;
  category: string;
}

export interface GroupType {
  id: string;
  nameKey: string;
  descriptionKey: string;
  huntingGroundsKey: string;
  startingUpgrades: string[];
  groupXpKey: string;
  specialAbilities: string[];
}

export interface WorldData {
  locations: Location[];
  factions: Faction[];
}

export interface Location {
  id: string;
  nameKey: string;
  descriptionKey: string;
  traits: string[];
  securityLevel?: number;
}

export interface Faction {
  id: string;
  nameKey: string;
  descriptionKey: string;
  tier?: number;
  type: string;
  status: string;
  assetKeys: string[];
  goalKeys: string[];
}

export interface Mechanics {
  // Only including fields needed for UI
  actionResolution: ActionResolution;
  stress?: ResourceSystem;
  harm?: DamageSystem;
}

export interface ActionResolution {
  diceSystem: string;
  outcomes: ActionOutcome[];
  position: MechanicOption[];
  effect: MechanicOption[];
}

export interface ActionOutcome {
  result: string;
  diceResult: string;
  descriptionKey: string;
}

export interface MechanicOption {
  id: string;
  nameKey: string;
  descriptionKey: string;
}

export interface ResourceSystem {
  maxValue: number;
  sourceKeys: string[];
  conditionKeys: string[];
}

export interface DamageSystem {
  levels: DamageLevel[];
}

export interface DamageLevel {
  level: number;
  nameKey: string;
  exampleKeys: string[];
}
