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
  EquipmentItem,
  HarmLevel,
  PlaybookDefinition,
  CreationRestriction,
  StressRules,
  HarmRules,
  LoadLevel,
  ValidationError,
} from '../domain';
import { HARM_LEVELS } from '../domain';

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

/**
 * Whether the ability would consume a VETERAN slot: it sits outside the character's playbook roster
 * and isn't unlocked by a held prerequisite. RAW (BitD): at creation and on every playbook advance
 * you choose from YOUR playbook's abilities; a cross-playbook pick needs a Veteran slot whatever the
 * ability's tier (tier is display-only — the SRD has no ability tiers). A playbook with no roster
 * (or an unknown playbook) has nothing to be "outside of", so nothing consumes a slot there —
 * custom rulesets that don't partition abilities by playbook stay lenient.
 */
export function consumesVeteranSlot(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string
): boolean {
  const ability = findAbility(ruleset, abilityId);
  if (!ability) return false;
  const roster = findPlaybook(ruleset, data.playbook)?.specialAbilities ?? [];
  if (roster.length === 0) return false;
  const prereqHeld = !!ability.prerequisite && data.specialAbilities.includes(ability.prerequisite);
  return !roster.includes(abilityId) && !prereqHeld;
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
 * Veteran slots granted by the character's OWN abilities (BitD: the playbook "Veteran" ability —
 * each take opens one ability from another playbook). Crew-granted slots are added on top by
 * {@link collectAbilityEffects} when crew context is supplied.
 */
export function ownVeteranGrants(ruleset: RulesetContent, data: CharacterData): number {
  return collectAbilityEffects(ruleset, data, null).veteran;
}

/**
 * The creation ability budget for THIS build: the ruleset's choice limit, plus one per veteran slot
 * the character's own abilities grant (RAW: taking Veteran at creation lets you write in the
 * cross-playbook ability it grants). Only cross-playbook picks may fill those extra slots —
 * {@link validateCharacter} enforces that roster picks still fit the base limit.
 */
export function creationAbilityLimit(ruleset: RulesetContent, data: CharacterData): number {
  return abilityChoiceLimit(ruleset, data.playbook) + ownVeteranGrants(ruleset, data);
}

/** Whether any crew ability in the ruleset can grant veteran slots (else crew context can't matter). */
function crewCanGrantVeteran(ruleset: RulesetContent): boolean {
  return (ruleset.crew?.abilities ?? []).some(a => (a.effects?.veteran ?? 0) > 0);
}

/**
 * Whether an ability may be TAKEN (or legally held) by this build — at creation, on an advance, or
 * when re-validating a played sheet: its prerequisite is satisfied, and when it comes from outside
 * the playbook's roster a veteran slot is free. Slots come from the character's own Veteran ability
 * and from the crew (pass the campaign's crew for that case). Grants are a budget, not a boolean:
 * each slot opens exactly ONE cross-playbook pick (F62).
 */
export function isAbilityUnlocked(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string,
  crew?: CrewContext | null
): boolean {
  const ability = findAbility(ruleset, abilityId);
  if (!ability) return true;
  // A retired definition stays legal for a sheet that already holds it, never as a new pick.
  if (ability.retired && !data.specialAbilities.includes(abilityId)) return false;
  if (!prerequisiteSatisfied(ruleset, data, ability)) return false;
  if (consumesVeteranSlot(ruleset, data, abilityId)) {
    const granted = collectAbilityEffects(ruleset, data, crew).veteran;
    // Slots consumed by the OTHER held picks must leave one for this ability (works both for a
    // held ability being re-validated and for a candidate the wizard is offering).
    if (veteranPicksUsed(ruleset, data, abilityId) >= granted) return false;
  }
  return true;
}

/**
 * RAW: taking Veteran IS taking an ability from another playbook — one advance, not two. When a
 * cross-playbook `abilityId` is locked only for want of a slot, returns the id of an unheld,
 * takeable Veteran-granting ability from the character's OWN roster that would open it, so the
 * advance can add both together. Null when the ability is already unlocked, is locked for another
 * reason (prerequisite), or no such Veteran ability exists.
 */
export function veteranGatewayFor(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string,
  crew?: CrewContext | null
): string | null {
  const ability = findAbility(ruleset, abilityId);
  if (!ability || !prerequisiteSatisfied(ruleset, data, ability)) return null;
  if (isAbilityUnlocked(ruleset, data, abilityId, crew)) return null;
  const roster = findPlaybook(ruleset, data.playbook)?.specialAbilities ?? [];
  for (const id of roster) {
    if (data.specialAbilities.includes(id)) continue;
    if ((findAbility(ruleset, id)?.effects?.veteran ?? 0) <= 0) continue;
    if (!isAbilityUnlocked(ruleset, data, id, crew)) continue;
    const withVeteran = { ...data, specialAbilities: [...data.specialAbilities, id] };
    if (isAbilityUnlocked(ruleset, withVeteran, abilityId, crew)) return id;
  }
  return null;
}

/**
 * Whether an advance may take this ability: it is unlocked now, or it is a cross-playbook pick the
 * advance can reach by taking the playbook's Veteran with it ({@link veteranGatewayFor}). The one
 * predicate the editor, the bot's suggestions and the repository's advance gate share.
 */
export function isAbilityAdvanceable(
  ruleset: RulesetContent,
  data: CharacterData,
  abilityId: string,
  crew?: CrewContext | null
): boolean {
  return (
    isAbilityUnlocked(ruleset, data, abilityId, crew) ||
    veteranGatewayFor(ruleset, data, abilityId, crew) !== null
  );
}

/**
 * Clamp a stress value into the track (0..max). With the character (and its campaign crew) the max
 * is the EFFECTIVE track — ability and crew stress boxes included — so a clear on a lengthened track
 * never drops more than asked; without them it is the ruleset's base track.
 */
export function clampStress(
  content: RulesetContent,
  value: number,
  data?: CharacterData,
  crew?: CrewContext | null
): number {
  const max = data ? effectiveStressMax(content, data, crew) : stressBounds(content).max;
  return Math.max(0, Math.min(value, max));
}

/** Stress/trauma bounds, defaulting to BitD values when the ruleset omits `stress`. */
export function stressBounds(ruleset: RulesetContent): StressRules {
  return ruleset.stress ?? DEFAULT_STRESS;
}

/** A character's stress-track size: the ruleset max plus any ability stress boxes (BitD Survivor). */
export function effectiveStressMax(
  ruleset: RulesetContent,
  data: CharacterData,
  crew?: CrewContext | null
): number {
  return stressBounds(ruleset).max + collectAbilityEffects(ruleset, data, crew).stressBoxes;
}

/** Trauma conditions still to be chosen after a stress overflow (0 when none are owed). */
export function pendingTrauma(data: Pick<CharacterData, 'traumaPending'>): number {
  const n = data.traumaPending ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Marking trauma conditions pays down an owed trauma (a stress overflow): every condition `next`
 * holds beyond `prev` resolves one pending trauma. Returns `next` with `traumaPending` reconciled —
 * however the condition was picked (the sheet prompt, the editor's trauma controls), the same
 * overflow is never counted twice toward retirement.
 */
export function reconcileTraumaPending<T extends Pick<CharacterData, 'trauma' | 'traumaPending'>>(
  prev: Pick<CharacterData, 'trauma'>,
  next: T
): T {
  const owed = next.traumaPending ?? 0;
  const added = (next.trauma ?? []).length - (prev.trauma ?? []).length;
  if (owed === 0 || added <= 0) return next;
  return { ...next, traumaPending: Math.max(0, owed - added) };
}

/**
 * Whether the character has reached the trauma limit (marked, plus any still owed) — RAW: "When you
 * mark your fourth trauma condition… you must retire them." Surfaces the retirement prompt; it never
 * changes status on its own (the player chooses retire vs. taking the fall).
 */
export function mustRetireFromTrauma(ruleset: RulesetContent, data: CharacterData): boolean {
  return (data.trauma ?? []).length + pendingTrauma(data) >= stressBounds(ruleset).traumaMax;
}

export interface StressChange {
  /** The new stress value. */
  stress: number;
  /** The new owed-trauma count (`characterData.traumaPending`). */
  traumaPending: number;
  /** True when this change marked the last stress box (→ trauma, stress reset to 0). */
  trauma: boolean;
  /** True when the change leaves the character at the trauma limit (retirement territory). */
  mustRetire: boolean;
}

/**
 * Apply a stress delta the RAW way ([SRD, Stress & Trauma](https://bladesinthedark.com/stress-trauma)):
 * "When a PC marks their last stress box, they suffer a level of trauma… When you return, you have
 * zero stress." A cost that fills (or would overfill) the track therefore resets stress to 0 and
 * owes one trauma condition (`traumaPending`, the PLAYER picks which). A clear never goes below 0.
 * Owed trauma never exceeds the trauma limit — at the limit the character must retire.
 */
export function applyStressChange(
  ruleset: RulesetContent,
  data: CharacterData,
  delta: number,
  crew?: CrewContext | null
): StressChange {
  const max = effectiveStressMax(ruleset, data, crew);
  const current = data.stress ?? 0;
  const owed = pendingTrauma(data);
  const traumaMax = stressBounds(ruleset).traumaMax;
  if (delta > 0 && current + delta >= max) {
    const marked = (data.trauma ?? []).length;
    const traumaPending = Math.min(owed + 1, Math.max(0, traumaMax - marked));
    const next = { ...data, traumaPending };
    return {
      stress: 0,
      traumaPending,
      trauma: true,
      mustRetire: mustRetireFromTrauma(ruleset, next),
    };
  }
  const stress = Math.max(0, Math.min(current + delta, max));
  return {
    stress,
    traumaPending: owed,
    trauma: false,
    mustRetire: mustRetireFromTrauma(ruleset, data),
  };
}

/**
 * Resolve one OWED trauma by marking the chosen condition: returns the next build, or `null` when
 * nothing is owed, the condition isn't one of the ruleset's named conditions (when it defines
 * them), or it's already marked.
 */
export function chooseTraumaCondition(
  ruleset: RulesetContent,
  data: CharacterData,
  condition: string
): CharacterData | null {
  const owed = pendingTrauma(data);
  if (owed === 0) return null;
  const named = ruleset.traumaConditions ?? [];
  if (named.length > 0 && !named.includes(condition)) return null;
  if (!condition.trim() || data.trauma.includes(condition)) return null;
  return { ...data, trauma: [...data.trauma, condition], traumaPending: owed - 1 };
}

/** BitD harm-track box counts, used when a ruleset omits `harm`. */
export const DEFAULT_HARM: HarmRules = { lesser: 2, moderate: 2, severe: 1 };

/** Harm-track box counts, defaulting to BitD values when the ruleset omits `harm`. */
export function harmBounds(ruleset: RulesetContent): HarmRules {
  return ruleset.harm ?? DEFAULT_HARM;
}

/**
 * The most serious harm level with a recorded entry ('severe' > 'moderate' > 'lesser'), or null
 * when unharmed. Drives the RAW penalties a roll surface must show
 * ([SRD, Harm](https://bladesinthedark.com/consequences-harm)): lesser → reduced effect, moderate →
 * −1d, severe → incapacitated (needs help or push).
 */
export function worstHarmLevel(data: Pick<CharacterData, 'harm'>): HarmLevel | null {
  for (const level of [...HARM_LEVELS].reverse()) {
    if ((data.harm?.[level] ?? []).length > 0) return level;
  }
  return null;
}

/**
 * Dice penalty harm applies to an action roll (BitD RAW: any level-2/moderate harm = −1d; lesser
 * reduces effect and severe incapacitates, neither changes the pool). Each recorded moderate harm
 * says "−1d", but penalties of the same kind don't stack — the pool loses one die, not one per wound.
 */
export function harmDicePenalty(data: Pick<CharacterData, 'harm'>): number {
  return (data.harm?.moderate ?? []).length > 0 ? 1 : 0;
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
 * Whether an equipment item counts as armor for the SPEND-ARMOR move (F44). Rulesets don't carry
 * a structured armor flag, so this follows the SRD-family naming convention (id or name says
 * "armor"/"armour") — the same convention every builtin uses.
 */
export function isArmorItem(item: EquipmentItem): boolean {
  return /armou?r/i.test(item.id) || /armou?r/i.test(item.name);
}

/**
 * Armor carried in the CURRENT loadout and not yet expended this score (`loadout.armorSpent`).
 * Armor is per-score: a fresh loadout (new score) writes a fresh `armorSpent`, refreshing it.
 */
export function availableArmor(ruleset: RulesetContent, data: CharacterData): EquipmentItem[] {
  const carried = new Set(data.loadout?.items ?? []);
  const spent = new Set(data.loadout?.armorSpent ?? []);
  return (ruleset.equipment?.items ?? []).filter(
    i => isArmorItem(i) && carried.has(i.id) && !spent.has(i.id)
  );
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
): Required<Pick<AbilityEffects, 'actionMax' | 'bonusActionDots' | 'veteran' | 'stressBoxes'>> & {
  loadCapacity: Partial<Record<LoadLevel, number>>;
  /** Union of the actions bonus dots are restricted to (empty = any action). */
  bonusActionDotsIn: string[];
  /** Whether a bonus dot may lift an action past the creation cap (BitD Deadly). */
  bonusDotsExceedCreationCap: boolean;
} {
  const out = {
    loadCapacity: {} as Partial<Record<LoadLevel, number>>,
    actionMax: 0,
    bonusActionDots: 0,
    bonusActionDotsIn: [] as string[],
    bonusDotsExceedCreationCap: false,
    veteran: 0,
    stressBoxes: 0,
  };
  let unrestrictedBonus = false;
  const apply = (e?: AbilityEffects) => {
    if (!e) return;
    for (const [lvl, v] of Object.entries(e.loadCapacity ?? {})) {
      const level = lvl as LoadLevel;
      out.loadCapacity[level] = Math.max(out.loadCapacity[level] ?? 0, v ?? 0);
    }
    if (e.actionMax) out.actionMax = Math.max(out.actionMax, e.actionMax);
    if (e.bonusActionDots) {
      out.bonusActionDots += e.bonusActionDots;
      if (!e.bonusActionDotsIn?.length) unrestrictedBonus = true;
      for (const a of e.bonusActionDotsIn ?? [])
        if (!out.bonusActionDotsIn.includes(a)) out.bonusActionDotsIn.push(a);
      if (e.bonusDotsExceedCreationCap) out.bonusDotsExceedCreationCap = true;
    }
    if (e.veteran) out.veteran += e.veteran;
    if (e.stressBoxes) out.stressBoxes += e.stressBoxes;
  };
  for (const id of data.specialAbilities ?? []) apply(findAbility(ruleset, id)?.effects);
  for (const id of crew?.crewAbilities ?? [])
    apply(ruleset.crew?.abilities?.find(a => a.id === id)?.effects);
  // Any unrestricted bonus dot may go anywhere, so the restriction list no longer narrows it.
  if (unrestrictedBonus) out.bonusActionDotsIn = [];
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
 * The XP cost of an advancement, resolved from the RULESET ONLY — a client-supplied `adv.cost` is
 * never trusted (a negative cost would otherwise ADD XP). Matches an advancement option by id
 * (`adv.target`) or, failing that, by category (`adv.type`). Returns `null` when the ruleset offers
 * no matching option, or its cost is not a finite, non-negative number (an invalid uploaded
 * ruleset) — the caller refuses the advance (`NO_ADVANCEMENT_OPTION`).
 */
export function advancementCost(ruleset: RulesetContent, adv: CharacterAdvancement): number | null {
  const options = ruleset.advancement?.advancementOptions ?? [];
  const option =
    options.find(o => o.id === adv.target) ?? options.find(o => o.category === adv.type);
  const cost = option?.cost;
  if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) return null;
  return Math.floor(cost);
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
export function markXpTrack(
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

type CollectedEffects = ReturnType<typeof collectAbilityEffects>;

/** Whether a bonus action dot may be placed in `action` (no restriction = any action). */
function bonusDotAllowedIn(effects: CollectedEffects, action: string): boolean {
  return effects.bonusActionDotsIn.length === 0 || effects.bonusActionDotsIn.includes(action);
}

/** Whether a bonus dot may lift `action` past the creation cap (BitD Deadly at creation). */
function bonusDotMayExceedCap(effects: CollectedEffects, action: string): boolean {
  return (
    effects.bonusActionDots > 0 &&
    effects.bonusDotsExceedCreationCap &&
    bonusDotAllowedIn(effects, action)
  );
}

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
 * Grandfathering for the live veteran budget: a sheet saved before that budget existed may hold
 * cross-playbook abilities without a slot. Don't brick its everyday writes (gear, harm, stress) —
 * an `ABILITY_LOCKED` error only stands when the write ADDS an ability the prior sheet didn't hold.
 * Shared by the repository's server-side gate and the editor's client-side save gate so they agree.
 */
export function grandfatherHeldAbilities(
  result: ValidationResult,
  priorAbilities: readonly string[],
  nextAbilities: readonly string[]
): ValidationResult {
  const prior = new Set(priorAbilities);
  if (nextAbilities.some(id => !prior.has(id))) return result;
  const errors = result.errors.filter(
    e => !(e.code === 'ABILITY_LOCKED' && e.field.startsWith('specialAbilities.'))
  );
  return { ...result, errors, isValid: errors.length === 0 };
}

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
    const seeds = findPlaybook(ruleset, data.playbook)?.skills ?? {};
    for (const action of rulesetActions(ruleset)) {
      const value = data.skills?.[action] ?? 0;
      if (value < 0)
        errors.push(err(`skills.${action}`, 'ACTION_NEGATIVE', `${action} cannot be negative.`));
      if (value > max)
        errors.push(err(`skills.${action}`, 'ACTION_OVER_CAP', `${action} cannot exceed ${max}.`));
      if (mode !== 'creation') continue;
      // RAW: "Your playbook begins with three action dots already placed. You get to add four
      // more." The pre-placed dots are a floor, not part of the movable budget.
      const seed = Math.max(0, seeds[action] ?? 0);
      if (value < seed)
        errors.push(
          err(
            `skills.${action}`,
            'ACTION_BELOW_PLAYBOOK',
            `${action} starts at ${seed} for this playbook — its pre-placed dots can't be removed.`
          )
        );
      // A bonus dot that "supersedes the normal starting limit" (BitD Deadly) may lift one of its
      // allowed actions one past the creation cap; the budget check below bounds how many.
      if (value > creationMax && !bonusDotMayExceedCap(effects, action))
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

  // Prerequisites + the veteran budget (both modes — a played character reaches beyond its playbook
  // only through Veteran slots, exactly like a new one).
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
    } else if (!isAbilityUnlocked(ruleset, data, abilityId, opts.crew)) {
      // A cross-playbook ability needs a free veteran slot (the character's own Veteran ability, or
      // a crew grant). With crew context — or when no crew ability in the ruleset could grant one —
      // that's decidable, so it's an error. Without crew context in a ruleset whose crew CAN grant
      // slots (template / standalone load) we can't verify the grant, so we only warn.
      if (opts.crew || !crewCanGrantVeteran(ruleset))
        errors.push(
          err(
            `specialAbilities.${abilityId}`,
            'ABILITY_LOCKED',
            `${ability.name} comes from another playbook — it needs a free Veteran slot.`
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

  // Stress / trauma bounds (both modes). The stress track may be lengthened by abilities (Survivor).
  const bounds = stressBounds(ruleset);
  const stressMax = effectiveStressMax(ruleset, data, opts.crew);
  if (data.stress < 0 || data.stress > stressMax)
    errors.push(err('stress', 'STRESS_BOUNDS', `Stress must be between 0 and ${stressMax}.`));
  if (data.trauma.length > bounds.traumaMax)
    errors.push(
      err('trauma', 'TRAUMA_OVER', `A character can hold at most ${bounds.traumaMax} trauma.`)
    );
  // Owed trauma (a stress overflow the player hasn't resolved yet) must be a sane count that still
  // fits the trauma track alongside the conditions already marked.
  if (data.traumaPending !== undefined) {
    const owed = data.traumaPending;
    if (!Number.isInteger(owed) || owed < 0)
      errors.push(err('traumaPending', 'TRAUMA_PENDING_INVALID', 'Owed trauma must be 0 or more.'));
    else if (data.trauma.length + owed > bounds.traumaMax)
      errors.push(
        err(
          'traumaPending',
          'TRAUMA_OVER',
          `A character can hold at most ${bounds.traumaMax} trauma (including trauma still to choose).`
        )
      );
  }
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
      const base = seededActionDots(ruleset, data.playbook) + (ar?.points ?? 0);
      const bonus = effects.bonusActionDots;
      const budget = base + bonus;
      const spent = actionDotsSpent(ruleset, data);
      if (spent > budget)
        errors.push(
          err('skills', 'ACTION_POINTS_OVER', `Assigned ${spent} of ${budget} action dots.`)
        );
      else {
        // Where the bonus dots may go (BitD Deadly: Hunt, Prowl, or Skirmish). Dots past the base
        // budget, and dots past the creation cap, can only be bonus dots — so they must be
        // removable from an allowed action without dipping below its playbook seed.
        const creationMax = ar?.maxAtCreation ?? 2;
        const seeds = findPlaybook(ruleset, data.playbook)?.skills ?? {};
        let overCap = 0;
        let removable = 0;
        for (const action of rulesetActions(ruleset)) {
          const value = Math.max(0, data.skills?.[action] ?? 0);
          if (bonusDotMayExceedCap(effects, action)) overCap += Math.max(0, value - creationMax);
          if (bonusDotAllowedIn(effects, action))
            removable += Math.max(0, value - Math.max(0, seeds[action] ?? 0));
        }
        const fromBonus = Math.max(overCap, spent - base);
        if (overCap > bonus || fromBonus > removable)
          errors.push(
            err(
              'skills',
              'ACTION_BONUS_RESTRICTED',
              `Bonus action dots can only go in ${effects.bonusActionDotsIn.join(', ')}.`
            )
          );
        else if (spent < budget)
          warnings.push(warn('skills', `${budget - spent} action dot(s) unspent.`));
      }
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
    // Veteran taken at creation adds a slot, but only a cross-playbook pick may fill it: roster
    // picks (Veteran itself included) still fit the base limit.
    const rosterPicks = data.specialAbilities.filter(
      id => !consumesVeteranSlot(ruleset, data, id)
    ).length;
    const totalLimit = creationAbilityLimit(ruleset, data);
    if (rosterPicks > limit || data.specialAbilities.length > totalLimit)
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
