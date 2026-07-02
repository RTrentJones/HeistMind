// The RulesetContent tree — the data-driven FitD mechanics one engine runs many systems from:
// playbooks, attributes/actions, abilities, equipment, advancement, creation, crew + faction content.
import type { LoadLevel } from './character';
export interface RulesetContent {
  metadata: {
    name: string;
    version: string;
    author: string;
    description: string;
    system: string;
  };
  playbooks: PlaybookDefinition[];
  attributes: AttributeDefinition[];
  skills: SkillDefinition[];
  specialAbilities: AbilityDefinition[];
  equipment: EquipmentRules;
  advancement: AdvancementRules;
  characterCreation: CreationRules;
  /** Stress/trauma bounds. Optional; defaults to BitD `{ max: 9, traumaMax: 4 }` when absent. */
  stress?: StressRules;
  /**
   * The named trauma conditions a character may take (BitD's 8: Cold, Haunted, Obsessed, Paranoid,
   * Reckless, Soft, Unstable, Vicious — or a reskinned set). When present, `validateCharacter`
   * enforces that each marked trauma is one of these; when absent, trauma is count-only (lenient).
   */
  traumaConditions?: string[];
  /** Harm-track box counts per level. Optional; defaults to BitD `{ lesser:2, moderate:2, severe:1 }`. */
  harm?: HarmRules;
  /** Optional crew-sheet content (crew types, crew abilities, available claims). */
  crew?: CrewRules;
  /** Optional suggested factions the GM can seed into a campaign. */
  factions?: FactionDefinition[];
}

/** A ruleset-suggested faction (the GM can add it to a campaign with one click). */
export interface FactionDefinition {
  name: string;
  type?: string;
  tier?: number;
  description?: string;
}

/** Ruleset-level crew content: the types a crew can be, the crew abilities, and available claims. */
export interface CrewRules {
  types: CrewTypeDefinition[];
  abilities: CrewAbilityDefinition[];
  claims?: string[];
  /**
   * Optional named resource tracks on the crew sheet (e.g. Scum & Villainy "gambits", a Wicked Ones
   * dungeon hoard, squad supplies). Absent for BitD/Brackwater-style crews, which render unchanged.
   */
  resourcePools?: CrewResourcePool[];
}

/** A named crew-level resource track (gambits / hoard / supplies). All optional, additive content. */
export interface CrewResourcePool {
  id: string;
  name: string;
  description?: string;
  /** Track ceiling. */
  max: number;
  /** Starting value for a fresh crew (defaults to 0). */
  startsAt?: number;
}

export interface CrewTypeDefinition {
  id: string;
  name: string;
  description: string;
}

export interface CrewAbilityDefinition {
  id: string;
  name: string;
  description: string;
  /** Which crew type this ability belongs to (optional — shared abilities omit it). */
  crewType?: string;
  /**
   * Optional structured effects this crew ability grants to EVERY member (see {@link AbilityEffects}):
   * "Deadly" → `{ bonusActionDots: 1 }`, "Mastery" → `{ actionMax: 4 }`, a veteran-granting upgrade →
   * `{ veteran: 1 }`. Applied by `validateCharacter` when crew context is supplied.
   */
  effects?: AbilityEffects;
}

export interface StressRules {
  max: number;
  traumaMax: number;
}

export interface HarmRules {
  lesser: number;
  moderate: number;
  severe: number;
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  startingAbilities: string[];
  specialAbilities: string[];
  contacts: ContactDefinition[];
  equipment: string[];
  attributes: Record<string, number>;
  skills: Record<string, number>;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  description: string;
  skills: string[];
  defaultValue?: number;
  maxValue?: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  attribute: string;
  examples?: string[];
}

/**
 * Structured mechanical effects an ability grants, so the validator can apply them instead of the
 * effect living only in prose `rules`. Used by both character special abilities (e.g. BitD "Mule"
 * raising load) and crew abilities (e.g. "Deadly" granting a member dot, "Mastery" raising the action
 * cap). Effective bounds = base ⊕ a character's own ability effects ⊕ its crew's ability effects.
 */
export interface AbilityEffects {
  /** Override/raise the load capacity per level (e.g. Mule: `{ light: 4, normal: 6, heavy: 9 }`). */
  loadCapacity?: Partial<Record<LoadLevel, number>>;
  /** Raise the per-action rating cap (BitD crew "Mastery": 4). Highest wins. */
  actionMax?: number;
  /** Extra free action dots the member may place (BitD crew "Deadly": 1). Summed across abilities. */
  bonusActionDots?: number;
  /** Grant N cross-playbook ("veteran") ability picks, opening tier-2 abilities outside the roster. */
  veteran?: number;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  /** A short, evocative one-liner (shown on cards). */
  description: string;
  /** Full, resolvable rules text — the exact mechanical effect (shown in an expandable detail). */
  rules?: string;
  prerequisite?: string;
  tier?: number;
  category?: string;
  /** Optional structured effects applied by the validator (see {@link AbilityEffects}). */
  effects?: AbilityEffects;
}

export interface ContactDefinition {
  name: string;
  description: string;
  relationship?: string;
}

export interface EquipmentRules {
  loadCapacity: Record<string, number>;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  load: number;
  category: string;
  quality?: number;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  defaultItems?: string[];
}

export interface AdvancementRules {
  xpTriggers: XPTrigger[];
  advancementOptions: AdvancementOption[];
  playbookAdvancement?: PlaybookAdvancement[];
  /**
   * Opt-in: model advancement as BitD-style XP tracks rather than a flat XP pool. When present,
   * the character marks XP into per-attribute tracks + a playbook track; an advancement is gated
   * on its track being full (then the track is cleared) instead of on spending pooled XP.
   */
  xpTracks?: XpTrackRules;
}

export interface XpTrackRules {
  /** Boxes in the playbook XP track (BitD: 8) — fills to unlock an ability/playbook advance. */
  playbook: number;
  /** Boxes in each attribute XP track (BitD: 6) — fills to unlock an action-dot/attribute advance. */
  attribute: number;
}

export interface XPTrigger {
  id: string;
  name: string;
  description: string;
  value: number;
}

export interface AdvancementOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'attribute' | 'skill' | 'ability' | 'playbook';
  requirements?: string[];
}

export interface PlaybookAdvancement {
  playbookId: string;
  specialOptions: AdvancementOption[];
}

export interface CreationRules {
  steps: CreationStep[];
  pointBuy?: PointBuyRules;
  restrictions?: CreationRestriction[];
  /**
   * How many special abilities a character may choose at creation (counts the playbook's
   * seeded `startingAbilities`). Defaults to `playbook.startingAbilities.length`, else 1.
   */
  abilityChoices?: number;
  /**
   * Opt-in: rate the individual ACTIONS (the entries in each `AttributeDefinition.skills`)
   * 0..`max`, stored in `CharacterData.skills`; attributes become DERIVED (count of an
   * attribute's actions rated ≥ 1). When present the wizard/engine use action-rating mode;
   * when absent they fall back to attribute point-buy (`pointBuy`).
   */
  actionRatings?: ActionRatingRules;
}

export interface ActionRatingRules {
  /** Action dots to assign at creation, on top of the playbook's seeded starting dots. */
  points: number;
  /** Max rating any single action may have at creation (BitD: 2). */
  maxAtCreation: number;
  /** Absolute cap on an action rating (BitD: 3). Defaults to the attribute's maxValue or 3. */
  max?: number;
}

export interface CreationStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  options?: CreationOption[];
}

export interface CreationOption {
  id: string;
  name: string;
  description: string;
  value?: unknown;
  cost?: number;
}

export interface PointBuyRules {
  totalPoints: number;
  attributeCosts: Record<number, number>;
  skillCosts: Record<number, number>;
}

export interface CreationRestriction {
  field: string;
  condition: string;
  value: unknown;
  message: string;
}
