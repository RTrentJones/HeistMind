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
