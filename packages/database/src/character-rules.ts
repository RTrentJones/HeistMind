// Character validity rules — the single source of truth for "is this character config legal
// under its ruleset?". Pure (no I/O), so both the web UI (creation wizard + editor) and the DB
// layer (characterManagement, server-side enforcement) run the exact same checks.
//
// Lives in @heist-mind/database (not @heist-mind/shared) on purpose: shared depends on database,
// so putting it here lets the DB layer validate without a dependency cycle. shared re-exports it.

import type {
  RulesetContent,
  CharacterData,
  CharacterXp,
  AbilityDefinition,
  PlaybookDefinition,
  CreationRestriction,
  StressRules,
  HarmRules,
  LoadLevel,
  ValidationError,
} from './domain-types';
import type { ValidationResult, ValidationWarning, CharacterAdvancement } from './repositories';

/** Blades-in-the-Dark defaults, used when a ruleset omits `stress`. */
export const DEFAULT_STRESS: StressRules = { max: 9, traumaMax: 4 };
/** Fallback when a ruleset defines no ability budget and the playbook seeds none. */
export const DEFAULT_ABILITY_CHOICES = 1;
/** Action ratings cap when an attribute omits `maxValue`. */
export const DEFAULT_ATTR_MAX = 4;

export type ValidationMode = 'creation' | 'live';
export interface ValidateOptions {
  /**
   * `creation` enforces the full creation ruleset (point-buy budget, ability-choice count,
   * required steps, restrictions, tier gating). `live` enforces only the permanent invariants
   * (attribute caps, prerequisites, stress/trauma bounds) — a played character legitimately
   * exceeds creation limits via advancement, so those creation-only rules must not fire.
   */
  mode?: ValidationMode;
}

// ----- step classification (shared with the wizard's creation-steps.ts) ---------------------

export type StepKind = 'playbook' | 'attributes' | 'abilities' | 'identity' | 'review' | 'choice';

/** Normalize a free-form creation-step id to a known kind (unknown ids → generic `choice`). */
export function stepKind(id: string): StepKind {
  const s = id.toLowerCase();
  if (s.includes('playbook') || s.includes('class') || s.includes('archetype')) return 'playbook';
  if (s.includes('attribute') || s.includes('action') || s.includes('rating')) return 'attributes';
  if (s.includes('abilit') || s.includes('special') || s.includes('move') || s.includes('power'))
    return 'abilities';
  if (
    s.includes('identity') ||
    s.includes('heritage') ||
    s.includes('background') ||
    s.includes('vice') ||
    s.includes('detail')
  )
    return 'identity';
  if (s.includes('review') || s.includes('confirm') || s.includes('summary')) return 'review';
  return 'choice';
}

// ----- helpers (also reused by the wizard store for live clamping) ---------------------------

/**
 * Point-buy cost of an attribute allocation. Cost is CUMULATIVE-to-rating: a rating `r` costs
 * `attributeCosts[r]` total (fallback: linear `= r`). The identity cost map `{1:1,2:2,3:3,4:4}`
 * therefore equals the sum of ratings — matching what AttributesStep has always displayed.
 */
export function pointBuySpent(ruleset: RulesetContent, attributes: Record<string, number>): number {
  const costs = ruleset.characterCreation?.pointBuy?.attributeCosts;
  let total = 0;
  for (const value of Object.values(attributes)) {
    if (value > 0) total += costs?.[value] ?? value;
  }
  return total;
}

function findPlaybook(ruleset: RulesetContent, playbookId: string): PlaybookDefinition | undefined {
  return ruleset.playbooks?.find(p => p.id === playbookId);
}

// ----- action ratings (the 12 FitD actions; attributes are derived) --------------------------

/** Whether the ruleset rates individual ACTIONS (vs point-buying the 3 attributes). */
export function usesActionRatings(ruleset: RulesetContent): boolean {
  return !!ruleset.characterCreation?.actionRatings;
}

/** The distinct action ids defined by the ruleset = the union of each attribute's `skills`. */
export function rulesetActions(ruleset: RulesetContent): string[] {
  const seen = new Set<string>();
  for (const attr of ruleset.attributes ?? []) for (const s of attr.skills ?? []) seen.add(s);
  return [...seen];
}

/** Total action dots a character has assigned across the ruleset's actions (negatives ignored). */
export function actionDotsSpent(ruleset: RulesetContent, data: CharacterData): number {
  let total = 0;
  for (const action of rulesetActions(ruleset)) total += Math.max(0, data.skills?.[action] ?? 0);
  return total;
}

/** Derived attribute ratings: how many of each attribute's actions are rated ≥ 1 (for resistance). */
export function deriveAttributes(
  ruleset: RulesetContent,
  data: CharacterData
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const attr of ruleset.attributes ?? []) {
    out[attr.id] = (attr.skills ?? []).reduce(
      (n, s) => n + ((data.skills?.[s] ?? 0) >= 1 ? 1 : 0),
      0
    );
  }
  return out;
}

/** Action dots the chosen playbook seeds (the floor; the player assigns `points` more on top). */
function seededActionDots(ruleset: RulesetContent, playbookId: string): number {
  const playbook = findPlaybook(ruleset, playbookId);
  if (!playbook) return 0;
  return Object.values(playbook.skills ?? {}).reduce((n, v) => n + Math.max(0, v), 0);
}

/** How many special abilities may be chosen at creation (counts seeded starting abilities). */
export function abilityChoiceLimit(ruleset: RulesetContent, playbookId: string): number {
  const explicit = ruleset.characterCreation?.abilityChoices;
  if (typeof explicit === 'number') return explicit;
  const playbook = findPlaybook(ruleset, playbookId);
  if (playbook && playbook.startingAbilities.length > 0) return playbook.startingAbilities.length;
  return DEFAULT_ABILITY_CHOICES;
}

function findAbility(ruleset: RulesetContent, abilityId: string): AbilityDefinition | undefined {
  return ruleset.specialAbilities?.find(a => a.id === abilityId);
}

/** Whether the prerequisite ability (if it names a known ability) is currently held. */
function prerequisiteSatisfied(
  ruleset: RulesetContent,
  data: CharacterData,
  ability: AbilityDefinition
): boolean {
  if (!ability.prerequisite) return true;
  const prereqIsKnownAbility = !!findAbility(ruleset, ability.prerequisite);
  if (!prereqIsKnownAbility) return true; // free-text note, not a gate
  return data.specialAbilities.includes(ability.prerequisite);
}

/**
 * Whether an ability is selectable AT CREATION (prerequisite + creation-tier gating).
 * Creation-tier is 1, so tier ≥ 2 requires either a satisfied prerequisite or membership in the
 * chosen playbook's own ability roster. (TODO: raise available tier once crew advancement exists.)
 */
export function isAbilityUnlocked(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string
): boolean {
  const ability = findAbility(ruleset, abilityId);
  if (!ability) return true;
  if (!prerequisiteSatisfied(ruleset, data, ability)) return false;
  if ((ability.tier ?? 1) >= 2) {
    const inPlaybookRoster = !!findPlaybook(ruleset, data.playbook)?.specialAbilities?.includes(
      abilityId
    );
    const prereqHeld =
      !!ability.prerequisite && data.specialAbilities.includes(ability.prerequisite);
    if (!inPlaybookRoster && !prereqHeld) return false;
  }
  return true;
}

/** Stress/trauma bounds, defaulting to BitD values when the ruleset omits `stress`. */
export function stressBounds(ruleset: RulesetContent): StressRules {
  return ruleset.stress ?? DEFAULT_STRESS;
}

/** BitD harm-track box counts, used when a ruleset omits `harm`. */
export const DEFAULT_HARM: HarmRules = { lesser: 2, moderate: 2, severe: 1 };

/** Harm-track box counts, defaulting to BitD values when the ruleset omits `harm`. */
export function harmBounds(ruleset: RulesetContent): HarmRules {
  return ruleset.harm ?? DEFAULT_HARM;
}

/** BitD default load capacities, used when a ruleset omits `equipment.loadCapacity`. */
const DEFAULT_LOAD: Record<LoadLevel, number> = { light: 3, normal: 5, heavy: 6 };

/** Carry limit for a load level (ruleset's `equipment.loadCapacity`, else BitD defaults). */
export function loadLimit(ruleset: RulesetContent, level: LoadLevel): number {
  return ruleset.equipment?.loadCapacity?.[level] ?? DEFAULT_LOAD[level];
}

/** Total load of a character's carried items (summed from the ruleset's item loads). */
export function loadUsed(ruleset: RulesetContent, data: CharacterData): number {
  const byId = new Map((ruleset.equipment?.items ?? []).map(i => [i.id, i.load ?? 0]));
  return (data.loadout?.items ?? []).reduce((n, id) => n + (byId.get(id) ?? 0), 0);
}

/**
 * The XP cost of an advancement, resolved from the ruleset (trusted over a client-supplied cost).
 * Matches an advancement option by id (`adv.target`) or, failing that, by category (`adv.type`).
 */
export function advancementCost(ruleset: RulesetContent, adv: CharacterAdvancement): number {
  const options = ruleset.advancement?.advancementOptions ?? [];
  const byId = options.find(o => o.id === adv.target);
  const byCategory = options.find(o => o.category === adv.type);
  return byId?.cost ?? byCategory?.cost ?? adv.cost;
}

// ----- XP tracks (BitD-style advancement; opt-in via `advancement.xpTracks`) -----------------

/** The playbook-track id used for ability/playbook advances (attribute tracks key by attribute id). */
export const PLAYBOOK_TRACK = 'playbook';
const EMPTY_XP: CharacterXp = { playbook: 0, attributes: {} };

/** Whether the ruleset advances via XP tracks (vs a flat XP pool). */
export function usesXpTracks(ruleset: RulesetContent): boolean {
  return !!ruleset.advancement?.xpTracks;
}

/** Box count of a track: `'playbook'` → the playbook track, else an attribute track. 0 if not opted in. */
export function xpTrackSize(ruleset: RulesetContent, track: string): number {
  const tracks = ruleset.advancement?.xpTracks;
  if (!tracks) return 0;
  return track === PLAYBOOK_TRACK ? tracks.playbook : tracks.attribute;
}

/** Current marks in a track. */
export function xpMarks(data: CharacterData, track: string): number {
  if (track === PLAYBOOK_TRACK) return data.xp?.playbook ?? 0;
  return data.xp?.attributes?.[track] ?? 0;
}

/** Whether a track has filled (and so unlocks an advance). */
export function xpTrackFull(ruleset: RulesetContent, data: CharacterData, track: string): boolean {
  const size = xpTrackSize(ruleset, track);
  return size > 0 && xpMarks(data, track) >= size;
}

/**
 * The XP track an advancement draws from: ability/playbook advances clear the playbook track;
 * attribute advances clear that attribute's track; an action-dot (`skill`) advance clears the
 * track of the attribute that owns the action.
 */
export function advanceTrack(ruleset: RulesetContent, adv: CharacterAdvancement): string {
  if (adv.type === 'attribute') return adv.target;
  if (adv.type === 'skill') {
    const owner = (ruleset.attributes ?? []).find(a => (a.skills ?? []).includes(adv.target));
    return owner?.id ?? PLAYBOOK_TRACK;
  }
  return PLAYBOOK_TRACK;
}

/** New XP state with `delta` marks applied to a track, clamped to `[0, trackSize]`. */
export function markXp(
  ruleset: RulesetContent,
  data: CharacterData,
  track: string,
  delta: number
): CharacterXp {
  const xp = data.xp ?? EMPTY_XP;
  const size = xpTrackSize(ruleset, track);
  const next = Math.max(0, Math.min(size, xpMarks(data, track) + delta));
  if (track === PLAYBOOK_TRACK) return { playbook: next, attributes: { ...xp.attributes } };
  return { playbook: xp.playbook, attributes: { ...xp.attributes, [track]: next } };
}

/** New XP state with a track reset to 0 (called when an advance spends a full track). */
export function clearXpTrack(data: CharacterData, track: string): CharacterXp {
  const xp = data.xp ?? EMPTY_XP;
  if (track === PLAYBOOK_TRACK) return { playbook: 0, attributes: { ...xp.attributes } };
  return { playbook: xp.playbook, attributes: { ...xp.attributes, [track]: 0 } };
}

// ----- restriction evaluation ----------------------------------------------------------------

/** Resolve a dot-path (e.g. `attributes.grit`, `custom.crew-ties`, `playbook`) against the build. */
function resolveField(data: CharacterData, path: string): unknown {
  const root: Record<string, unknown> = {
    attributes: data.attributes,
    skills: data.skills,
    specialAbilities: data.specialAbilities,
    playbook: data.playbook,
    heritage: data.heritage,
    background: data.background,
    vice: data.vice,
    custom: data.custom,
  };
  const [head, ...rest] = path.split('.');
  if (!head) return undefined;
  let cur: unknown = root[head];
  for (const key of rest) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[key];
    else return undefined;
  }
  return cur;
}

function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

// ----- the validator -------------------------------------------------------------------------

const err = (field: string, code: string, message: string): ValidationError => ({
  field,
  code,
  message,
});
const warn = (field: string, message: string, suggestion?: string): ValidationWarning => ({
  field,
  message,
  suggestion,
});

/**
 * Validate a character build against its ruleset. `errors` block (isValid=false); `warnings`
 * never block. See {@link ValidateOptions} for how `creation` vs `live` differ.
 */
export function validateCharacter(
  ruleset: RulesetContent,
  data: CharacterData,
  opts: ValidateOptions = {}
): ValidationResult {
  const mode: ValidationMode = opts.mode ?? 'live';
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const actionMode = usesActionRatings(ruleset);
  const ar = ruleset.characterCreation?.actionRatings;

  if (actionMode) {
    // Per-ACTION caps (both modes); attributes are derived, so they need no cap check.
    const max = ar?.max ?? DEFAULT_ATTR_MAX - 1; // BitD actions cap at 3
    const creationMax = ar?.maxAtCreation ?? 2;
    for (const action of rulesetActions(ruleset)) {
      const value = data.skills?.[action] ?? 0;
      if (value < 0)
        errors.push(err(`skills.${action}`, 'ACTION_NEGATIVE', `${action} cannot be negative.`));
      if (value > max)
        errors.push(err(`skills.${action}`, 'ACTION_OVER_CAP', `${action} cannot exceed ${max}.`));
      if (mode === 'creation' && value > creationMax)
        errors.push(
          err(
            `skills.${action}`,
            'ACTION_CREATION_CAP',
            `${action} cannot exceed ${creationMax} at character creation.`
          )
        );
    }
  } else {
    // Attribute caps + non-negative (both modes).
    for (const attr of ruleset.attributes ?? []) {
      const value = data.attributes[attr.id] ?? 0;
      const max = attr.maxValue ?? DEFAULT_ATTR_MAX;
      if (value < 0)
        errors.push(
          err(`attributes.${attr.id}`, 'ATTR_NEGATIVE', `${attr.name} cannot be negative.`)
        );
      if (value > max)
        errors.push(
          err(`attributes.${attr.id}`, 'ATTR_OVER_CAP', `${attr.name} cannot exceed ${max}.`)
        );
    }
  }

  // Prerequisites (both modes) + tier/lock (creation only).
  for (const abilityId of data.specialAbilities) {
    const ability = findAbility(ruleset, abilityId);
    if (!ability) continue;
    if (!prerequisiteSatisfied(ruleset, data, ability)) {
      errors.push(
        err(
          `specialAbilities.${abilityId}`,
          'ABILITY_LOCKED',
          `${ability.name} requires ${ability.prerequisite}.`
        )
      );
    } else if (mode === 'creation' && !isAbilityUnlocked(ruleset, data, abilityId)) {
      errors.push(
        err(
          `specialAbilities.${abilityId}`,
          'ABILITY_LOCKED',
          `${ability.name} is not available at character creation.`
        )
      );
    }
  }

  // Stress / trauma bounds (both modes).
  const bounds = stressBounds(ruleset);
  if (data.stress < 0 || data.stress > bounds.max)
    errors.push(err('stress', 'STRESS_BOUNDS', `Stress must be between 0 and ${bounds.max}.`));
  if (data.trauma.length > bounds.traumaMax)
    errors.push(
      err('trauma', 'TRAUMA_OVER', `A character can hold at most ${bounds.traumaMax} trauma.`)
    );

  // Harm-track bounds (both modes), if the character tracks harm.
  if (data.harm) {
    const harm = harmBounds(ruleset);
    for (const level of ['lesser', 'moderate', 'severe'] as const) {
      if ((data.harm[level]?.length ?? 0) > harm[level])
        errors.push(
          err(`harm.${level}`, 'HARM_OVER', `Too much ${level} harm (max ${harm[level]}).`)
        );
    }
  }

  // Load: carried items can't exceed the chosen load level's capacity (both modes).
  if (data.loadout) {
    const used = loadUsed(ruleset, data);
    const limit = loadLimit(ruleset, data.loadout.level);
    if (used > limit)
      errors.push(
        err(
          'loadout',
          'LOAD_OVER',
          `Carrying ${used} load exceeds the ${data.loadout.level} limit of ${limit}.`
        )
      );
  }

  if (mode === 'creation') {
    if (actionMode) {
      // Action-dot budget: the playbook's seeded dots + the ruleset's creation `points`.
      const budget = seededActionDots(ruleset, data.playbook) + (ar?.points ?? 0);
      const spent = actionDotsSpent(ruleset, data);
      if (spent > budget)
        errors.push(
          err('skills', 'ACTION_POINTS_OVER', `Assigned ${spent} of ${budget} action dots.`)
        );
      else if (spent < budget)
        warnings.push(warn('skills', `${budget - spent} action dot(s) unspent.`));
    } else {
      // Point-buy budget.
      const pointBuy = ruleset.characterCreation?.pointBuy;
      if (pointBuy) {
        const spent = pointBuySpent(ruleset, data.attributes);
        if (spent > pointBuy.totalPoints)
          errors.push(
            err('attributes', 'POINTBUY_OVER', `Spent ${spent} of ${pointBuy.totalPoints} points.`)
          );
        else if (spent < pointBuy.totalPoints)
          warnings.push(warn('attributes', `${pointBuy.totalPoints - spent} point(s) unspent.`));
      }
    }

    // Ability-choice count.
    const limit = abilityChoiceLimit(ruleset, data.playbook);
    if (data.specialAbilities.length > limit)
      errors.push(
        err('specialAbilities', 'ABILITY_LIMIT', `Choose at most ${limit} special abilities.`)
      );

    // Required creation steps satisfied.
    for (const step of ruleset.characterCreation?.steps ?? []) {
      if (!step.required) continue;
      const kind = stepKind(step.id);
      let satisfied = true;
      if (kind === 'playbook') satisfied = isNonEmpty(data.playbook);
      else if (kind === 'attributes')
        satisfied =
          Object.values(data.attributes).some(v => v > 0) ||
          Object.values(data.skills ?? {}).some(v => v > 0);
      else if (kind === 'choice') satisfied = isNonEmpty(data.custom?.[step.id]);
      // identity/abilities/review steps are not blocking here (name is enforced by the UI).
      if (!satisfied)
        errors.push(
          err(`steps.${step.id}`, 'STEP_INCOMPLETE', `"${step.name}" must be completed.`)
        );
    }

    // Restrictions.
    for (const r of ruleset.characterCreation?.restrictions ?? []) {
      const violation = evaluateRestriction(data, r);
      if (violation === 'violated') errors.push(err(r.field, 'RESTRICTION', r.message));
      else if (violation === 'unknown')
        warnings.push(warn(r.field, `Unknown restriction condition "${r.condition}" was ignored.`));
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function evaluateRestriction(
  data: CharacterData,
  r: CreationRestriction
): 'ok' | 'violated' | 'unknown' {
  const actual = resolveField(data, r.field);
  switch (r.condition) {
    case 'max':
      return typeof actual === 'number' && actual > Number(r.value) ? 'violated' : 'ok';
    case 'min':
      return typeof actual === 'number' && actual < Number(r.value) ? 'violated' : 'ok';
    case 'equals':
      return actual === r.value ? 'ok' : 'violated';
    case 'required':
      return isNonEmpty(actual) ? 'ok' : 'violated';
    case 'oneOf':
      return Array.isArray(r.value) && r.value.includes(actual as never) ? 'ok' : 'violated';
    default:
      return 'unknown';
  }
}
