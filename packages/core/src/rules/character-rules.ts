// Character validity rules — the single source of truth for "is this character config legal
// under its ruleset?". Pure (no I/O), so both the web UI (creation wizard + editor) and the DB
// layer (characterManagement, server-side enforcement) run the exact same checks.
//
// Lives in @heist-mind/core with the rest of the rules engine: zero dependencies, so every
// client (web, the future Discord bot) and the DB layer import the exact same checks.

import type {
  RulesetContent,
  CharacterData,
  CharacterXp,
  AbilityDefinition,
  AbilityEffects,
  PlaybookDefinition,
  CreationRestriction,
  StressRules,
  HarmRules,
  LoadLevel,
  ValidationError,
} from '../domain';

/** A minimal crew shape for crew-aware validation — just the abilities the crew currently holds. */
export interface CrewContext {
  crewAbilities?: string[];
}
import type { ValidationResult, ValidationWarning, CharacterAdvancement } from '../domain';

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
  /**
   * The campaign's crew, when validating in context. Crew abilities raise the effective bounds
   * (Mastery → action cap 4, Deadly → bonus action dots, a veteran upgrade → cross-playbook picks).
   * Absent when validating a character standalone/as a template — crew-granted extras are then
   * tolerated as warnings rather than errors (see `validateCharacter`).
   */
  crew?: CrewContext | null;
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

/** Whether the ability would consume a veteran slot: tier ≥ 2, outside the playbook's own roster,
 * and not unlocked by a held prerequisite. */
function consumesVeteranSlot(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string
): boolean {
  const ability = findAbility(ruleset, abilityId);
  if (!ability || (ability.tier ?? 1) < 2) return false;
  const inPlaybookRoster = !!findPlaybook(ruleset, data.playbook)?.specialAbilities?.includes(
    abilityId
  );
  const prereqHeld = !!ability.prerequisite && data.specialAbilities.includes(ability.prerequisite);
  return !inPlaybookRoster && !prereqHeld;
}

/** How many veteran slots the HELD abilities consume, optionally excluding one (the candidate
 * under evaluation, so a held ability doesn't count against its own slot). */
export function veteranPicksUsed(
  ruleset: RulesetContent,
  data: CharacterData,
  excludeAbilityId?: string
): number {
  return data.specialAbilities.filter(
    id => id !== excludeAbilityId && consumesVeteranSlot(ruleset, data, id)
  ).length;
}

/**
 * Whether an ability is selectable AT CREATION (prerequisite + creation-tier gating).
 * Creation-tier is 1, so tier ≥ 2 requires a satisfied prerequisite, membership in the chosen
 * playbook's own ability roster, OR a free "veteran" slot granted by the crew (BitD: EACH veteran
 * advance lets a member take ONE ability from another playbook — grants are a budget, not a
 * boolean, so a single grant can't unlock unlimited cross-playbook picks). Pass the campaign's
 * crew for that last case.
 */
export function isAbilityUnlocked(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string,
  crew?: CrewContext | null
): boolean {
  const ability = findAbility(ruleset, abilityId);
  if (!ability) return true;
  if (!prerequisiteSatisfied(ruleset, data, ability)) return false;
  if (consumesVeteranSlot(ruleset, data, abilityId)) {
    const granted = collectAbilityEffects(ruleset, data, crew).veteran;
    // Slots consumed by the OTHER held picks must leave one for this ability (works both for a
    // held ability being re-validated and for a candidate the wizard is offering).
    if (veteranPicksUsed(ruleset, data, abilityId) >= granted) return false;
  }
  return true;
}

/** Clamp a stress value into the ruleset's track (0..max). */
export function clampStress(content: RulesetContent, value: number): number {
  return Math.max(0, Math.min(value, stressBounds(content).max));
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
 * Aggregate the structured {@link AbilityEffects} a character has from its own special abilities and
 * (optionally) from its crew's abilities: `loadCapacity`/`actionMax` take the HIGHEST value, bonus
 * dots / veteran picks SUM. The single place crew + ability bonuses are combined (load, action cap,
 * Deadly dots, veteran access).
 */
export function collectAbilityEffects(
  ruleset: RulesetContent,
  data: CharacterData,
  crew?: CrewContext | null
): Required<Pick<AbilityEffects, 'actionMax' | 'bonusActionDots' | 'veteran'>> & {
  loadCapacity: Partial<Record<LoadLevel, number>>;
} {
  const out = {
    loadCapacity: {} as Partial<Record<LoadLevel, number>>,
    actionMax: 0,
    bonusActionDots: 0,
    veteran: 0,
  };
  const apply = (e?: AbilityEffects) => {
    if (!e) return;
    for (const [lvl, v] of Object.entries(e.loadCapacity ?? {})) {
      const level = lvl as LoadLevel;
      out.loadCapacity[level] = Math.max(out.loadCapacity[level] ?? 0, v ?? 0);
    }
    if (e.actionMax) out.actionMax = Math.max(out.actionMax, e.actionMax);
    if (e.bonusActionDots) out.bonusActionDots += e.bonusActionDots;
    if (e.veteran) out.veteran += e.veteran;
  };
  for (const id of data.specialAbilities) apply(findAbility(ruleset, id)?.effects);
  for (const id of crew?.crewAbilities ?? [])
    apply(ruleset.crew?.abilities?.find(a => a.id === id)?.effects);
  return out;
}

/** Carry limit for a level, raised by any load-boosting abilities the character (or crew) holds. */
export function effectiveLoadLimit(
  ruleset: RulesetContent,
  data: CharacterData,
  level: LoadLevel,
  crew?: CrewContext | null
): number {
  const bonus = collectAbilityEffects(ruleset, data, crew).loadCapacity[level] ?? 0;
  return Math.max(loadLimit(ruleset, level), bonus);
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
  // Crew + ability effects (load, action cap, Deadly dots, veteran) — applied to the bounds below.
  const effects = collectAbilityEffects(ruleset, data, opts.crew);

  if (actionMode) {
    // Per-ACTION caps (both modes); attributes are derived, so they need no cap check.
    // BitD actions cap at 3, raised to 4 when the crew holds the "Mastery" upgrade.
    const max = Math.max(ar?.max ?? DEFAULT_ATTR_MAX - 1, effects.actionMax);
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
    } else if (mode === 'creation' && !isAbilityUnlocked(ruleset, data, abilityId, opts.crew)) {
      // A tier-2 cross-playbook ability needs a crew veteran grant. With crew context we can say it's
      // illegal (error); without it (template / standalone load) we can't verify the grant, so we
      // only warn — the character may be perfectly legal inside its campaign.
      if (opts.crew)
        errors.push(
          err(
            `specialAbilities.${abilityId}`,
            'ABILITY_LOCKED',
            `${ability.name} is not available at character creation.`
          )
        );
      else
        warnings.push(
          warn(
            `specialAbilities.${abilityId}`,
            `${ability.name} needs a crew veteran grant — validate within the campaign.`
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
  // Trauma must be drawn from the ruleset's named conditions when it defines them (BitD's fixed set),
  // and be distinct. Lenient (count-only) when a ruleset omits `traumaConditions`.
  if (ruleset.traumaConditions && ruleset.traumaConditions.length > 0) {
    const allowed = new Set(ruleset.traumaConditions);
    for (const condition of data.trauma) {
      if (!allowed.has(condition))
        errors.push(
          err('trauma', 'TRAUMA_UNKNOWN', `"${condition}" is not a valid trauma condition.`)
        );
    }
    if (new Set(data.trauma).size !== data.trauma.length)
      errors.push(
        err('trauma', 'TRAUMA_DUPLICATE', 'Each trauma condition can be taken only once.')
      );
  }

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

  // Load: carried items can't exceed the chosen load level's capacity (raised by load-boosting
  // abilities like Mule), both modes.
  if (data.loadout) {
    const used = loadUsed(ruleset, data);
    const limit = effectiveLoadLimit(ruleset, data, data.loadout.level, opts.crew);
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
      // Action-dot budget: the playbook's seeded dots + the ruleset's creation `points` + any crew
      // bonus dots (BitD "Deadly" grants each member an extra dot).
      const budget =
        seededActionDots(ruleset, data.playbook) + (ar?.points ?? 0) + effects.bonusActionDots;
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

    // Ability-choice count: at least one (BitD: every character picks 1 ability at creation; the
    // seeded starting ability mustn't be removable to zero — closes F11) and at most the limit.
    const limit = abilityChoiceLimit(ruleset, data.playbook);
    const rosterHasAbilities =
      (findPlaybook(ruleset, data.playbook)?.specialAbilities?.length ?? 0) > 0;
    if (rosterHasAbilities && data.specialAbilities.length < 1)
      errors.push(
        err('specialAbilities', 'ABILITY_REQUIRED', 'Choose a special ability to start with.')
      );
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
