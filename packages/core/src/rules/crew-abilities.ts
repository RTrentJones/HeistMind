// Crew special abilities + upgrades, RAW — the crew-side mirror of the character ability rules
// (`isAbilityUnlocked` / `veteranGatewayFor` / `grandfatherHeldAbilities` in character-rules.ts).
// Pure (no I/O): the crew sheet, the Discord bot and the crew repository's write gate run the
// exact same checks.
//
// RAW (bladesinthedark.com):
// - [crew → Choose a special ability] "Take a look at the special abilities for your crew and
//   choose one… You can get more special abilities in the future by earning xp." One pick at crew
//   creation, from the crew TYPE's list.
// - [advancement → Crew Advancement] "When you fill your crew advancement tracker, clear the marks
//   and take a new special ability or mark two crew upgrade boxes."
// - [crew → Mastery] "You may advance your PCs' action ratings to 4… This costs four upgrade boxes
//   to unlock." Mastery is an UPGRADE, never a special ability.
// - [book, not SRD] every crew sheet carries "Veteran: choose a special ability from another crew"
//   (three boxes, like the playbook Veteran) — the only way to take another crew type's ability.

import type { CrewAbilityDefinition, RulesetContent } from '../domain';
import { crewAdvanceReady, crewXp, withCrewXp } from './crews';

/** The slice of a crew the ability rules read (a `Crew` row satisfies it). */
export interface CrewAbilityState {
  crewType: string | null;
  crewAbilities: readonly string[];
  resources: Record<string, number>;
}

/** Upgrade boxes one crew advance may mark (RAW: "mark two crew upgrade boxes"). */
export const CREW_UPGRADE_BOXES_PER_ADVANCE = 2;
/** `resources` key prefix the marked boxes of a modelled upgrade are stored under (no migration). */
export const CREW_UPGRADE_KEY_PREFIX = 'crew-upgrade:';
/**
 * `resources` flag (1) recording that the crew has TAKEN its free creation pick (round 4 P2-N9).
 * Without it "starting pick available" was inferred from holding no special ability, so a GM
 * could remove every ability and re-pick any one for free — churning the free pick forever.
 * One-way: once set it stays (`withCrewStartingPickSpent`), no migration (JSONB resources).
 */
export const CREW_STARTING_PICK_KEY = 'crew-starting-pick';

type CrewRulesetSlice = Pick<RulesetContent, 'crew'> | null | undefined;

/** The crew ability/upgrade definition with this id, if the ruleset has one. */
export function findCrewAbility(
  ruleset: CrewRulesetSlice,
  id: string
): CrewAbilityDefinition | undefined {
  return ruleset?.crew?.abilities?.find(a => a.id === id);
}

/** A crew ability's display name (falls back to the id for an unknown one). */
export function crewAbilityName(ruleset: CrewRulesetSlice, id: string): string {
  return findCrewAbility(ruleset, id)?.name ?? id;
}

/** Whether a definition is an upgrade bought in boxes (BitD Mastery), not a special ability. */
export function isCrewUpgrade(def: CrewAbilityDefinition | undefined): boolean {
  return (def?.upgradeBoxes ?? 0) > 0;
}

/** The crew types that list this ability (`crewType` ∪ `crewTypes`); empty = every crew type. */
export function crewAbilityTypes(def: CrewAbilityDefinition): string[] {
  const out = [...(def.crewTypes ?? [])];
  if (def.crewType && !out.includes(def.crewType)) out.push(def.crewType);
  return out;
}

/**
 * Whether the ability sits on THIS crew's own list. Shared abilities (no type) are on every list.
 * A crew with no type (or a type the ruleset doesn't define) has nothing to be "outside of", so
 * every ability counts as its own — custom rulesets that don't partition abilities stay lenient,
 * exactly like a rosterless playbook.
 */
export function isOwnCrewTypeAbility(
  ruleset: CrewRulesetSlice,
  crewType: string | null,
  def: CrewAbilityDefinition
): boolean {
  const types = crewAbilityTypes(def);
  if (types.length === 0) return true;
  if (!crewType) return true;
  if (!(ruleset?.crew?.types ?? []).some(t => t.id === crewType)) return true;
  return types.includes(crewType);
}

/** The ids of the special abilities the crew holds (upgrades excluded). */
function heldSpecialAbilities(ruleset: CrewRulesetSlice, crew: CrewAbilityState): string[] {
  return crew.crewAbilities.filter(id => !isCrewUpgrade(findCrewAbility(ruleset, id)));
}

/**
 * Whether the ability would consume a crew VETERAN slot: a special ability from another crew
 * type's list whose prerequisite (if any) isn't what opens it.
 */
export function consumesCrewVeteranSlot(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState,
  id: string
): boolean {
  const def = findCrewAbility(ruleset, id);
  if (!def || isCrewUpgrade(def)) return false;
  return !isOwnCrewTypeAbility(ruleset, crew.crewType, def);
}

/** Crew veteran slots granted by the abilities the crew holds (`effects.crewVeteran`, summed). */
export function crewVeteranGrants(ruleset: CrewRulesetSlice, crew: CrewAbilityState): number {
  return crew.crewAbilities.reduce(
    (n, id) => n + (findCrewAbility(ruleset, id)?.effects?.crewVeteran ?? 0),
    0
  );
}

/** Crew veteran slots the HELD abilities consume, optionally excluding one (the candidate). */
export function crewVeteranPicksUsed(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState,
  excludeId?: string
): number {
  return crew.crewAbilities.filter(
    id => id !== excludeId && consumesCrewVeteranSlot(ruleset, crew, id)
  ).length;
}

/**
 * Whether the crew may take (or legally hold) this SPECIAL ABILITY: it is a known, non-upgrade
 * definition; not retired (unless already held); its prerequisite is held; and when it comes from
 * another crew type's list a crew Veteran slot is free. Upgrades are never taken this way — they
 * are bought in boxes ({@link planCrewAdvance}).
 */
export function isCrewAbilityUnlocked(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState,
  id: string
): boolean {
  const def = findCrewAbility(ruleset, id);
  if (!def || isCrewUpgrade(def)) return false;
  const held = crew.crewAbilities.includes(id);
  if (def.retired && !held) return false;
  if (def.prerequisite && !crew.crewAbilities.includes(def.prerequisite)) return false;
  if (consumesCrewVeteranSlot(ruleset, crew, id)) {
    if (crewVeteranPicksUsed(ruleset, crew, id) >= crewVeteranGrants(ruleset, crew)) return false;
  }
  return true;
}

/**
 * RAW: taking Veteran IS taking another crew's ability — one advance, not two. When an
 * other-type ability is locked only for want of a slot, returns the id of an unheld, takeable
 * Veteran-granting ability that would open it (so the advance adds both). Null otherwise.
 */
export function crewVeteranGatewayFor(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState,
  id: string
): string | null {
  const def = findCrewAbility(ruleset, id);
  if (!def || isCrewUpgrade(def) || def.retired) return null;
  if (def.prerequisite && !crew.crewAbilities.includes(def.prerequisite)) return null;
  if (isCrewAbilityUnlocked(ruleset, crew, id)) return null;
  for (const gate of ruleset?.crew?.abilities ?? []) {
    if (crew.crewAbilities.includes(gate.id)) continue;
    if ((gate.effects?.crewVeteran ?? 0) <= 0) continue;
    if (!isCrewAbilityUnlocked(ruleset, crew, gate.id)) continue;
    if (consumesCrewVeteranSlot(ruleset, crew, gate.id)) continue;
    const withGate = { ...crew, crewAbilities: [...crew.crewAbilities, gate.id] };
    if (isCrewAbilityUnlocked(ruleset, withGate, id)) return gate.id;
  }
  return null;
}

/**
 * RAW crew creation: a crew with no special ability yet takes ONE from its list for free ("Choose
 * a special ability"). Every later ability costs a full advancement track.
 */
export function crewStartingPickAvailable(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState
): boolean {
  return !crewStartingPickSpent(ruleset, crew);
}

/**
 * Whether the crew has used its free creation pick: the flag is set, or it holds a special
 * ability (a crew that predates the flag — holding one means the pick was taken).
 */
export function crewStartingPickSpent(ruleset: CrewRulesetSlice, crew: CrewAbilityState): boolean {
  return (
    (crew.resources[CREW_STARTING_PICK_KEY] ?? 0) > 0 ||
    heldSpecialAbilities(ruleset, crew).length > 0
  );
}

/**
 * `next` resources with the starting-pick flag carried over from `prior` (the repository applies
 * it to every crew write): once the free pick is spent, no write — removing every ability, or a
 * resources edit that drops the key — can make it available again.
 */
export function withCrewStartingPickSpent(
  ruleset: CrewRulesetSlice,
  prior: CrewAbilityState,
  nextResources: Record<string, number>
): Record<string, number> {
  if (!crewStartingPickSpent(ruleset, prior) || (nextResources[CREW_STARTING_PICK_KEY] ?? 0) > 0)
    return nextResources;
  return { ...nextResources, [CREW_STARTING_PICK_KEY]: 1 };
}

/** Upgrade boxes marked toward a modelled upgrade (a held upgrade reads as full). */
export function crewUpgradeBoxes(
  ruleset: CrewRulesetSlice,
  crew: Pick<CrewAbilityState, 'crewAbilities' | 'resources'>,
  upgradeId: string
): number {
  const def = findCrewAbility(ruleset, upgradeId);
  const size = def?.upgradeBoxes ?? 0;
  if (crew.crewAbilities.includes(upgradeId)) return size;
  const raw = Math.floor(crew.resources[`${CREW_UPGRADE_KEY_PREFIX}${upgradeId}`] ?? 0);
  return Math.max(0, Math.min(size, raw));
}

/** What a crew advance (or the free starting pick) spends on. */
export type CrewAdvanceChoice =
  | { kind: 'ability'; abilityId: string }
  /**
   * Mark two upgrade boxes. `upgradeId` names a modelled upgrade (BitD Mastery) to mark them on;
   * omit it for upgrades the app doesn't model (the table tracks those on paper).
   */
  | { kind: 'upgrades'; upgradeId?: string };

export type CrewAdvanceRefusal =
  | 'TRACK_NOT_FULL'
  | 'UNKNOWN_ABILITY'
  | 'ABILITY_HELD'
  | 'ABILITY_LOCKED'
  | 'NOT_AN_UPGRADE'
  | 'UPGRADE_COMPLETE';

export type CrewAdvancePlan =
  | {
      ok: true;
      /** The crew's next `crewAbilities` / `resources`. */
      crewAbilities: string[];
      resources: Record<string, number>;
      /** The free crew-creation pick (no track spent) rather than an advance. */
      startingPick: boolean;
      /** Ability ids this added (a Veteran gateway + its pick, a completed upgrade, or one id). */
      added: string[];
      /** For an upgrades advance: the upgrade marked and its boxes after the advance. */
      upgrade?: { id: string; boxes: number; size: number; completed: boolean };
    }
  | { ok: false; code: CrewAdvanceRefusal };

/**
 * Plan one crew advance RAW — the single rule the crew sheet, the bot and the repository gate
 * share. An ability pick is free while the crew has no special ability yet (the creation pick);
 * otherwise it, like marking upgrade boxes, needs a FULL advancement track, which it clears.
 */
export function planCrewAdvance(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState,
  choice: CrewAdvanceChoice
): CrewAdvancePlan {
  const ready = crewAdvanceReady(crew.resources);
  if (choice.kind === 'ability') {
    const def = findCrewAbility(ruleset, choice.abilityId);
    if (!def) return { ok: false, code: 'UNKNOWN_ABILITY' };
    if (isCrewUpgrade(def)) return { ok: false, code: 'ABILITY_LOCKED' };
    if (crew.crewAbilities.includes(def.id)) return { ok: false, code: 'ABILITY_HELD' };
    const startingPick = crewStartingPickAvailable(ruleset, crew);
    if (!startingPick && !ready) return { ok: false, code: 'TRACK_NOT_FULL' };
    let added: string[];
    if (isCrewAbilityUnlocked(ruleset, crew, def.id)) added = [def.id];
    else {
      const gate = crewVeteranGatewayFor(ruleset, crew, def.id);
      if (!gate) return { ok: false, code: 'ABILITY_LOCKED' };
      added = [gate, def.id];
    }
    return {
      ok: true,
      crewAbilities: [...crew.crewAbilities, ...added],
      // The free pick records itself, so removing the ability later can't re-open it.
      resources: startingPick
        ? { ...crew.resources, [CREW_STARTING_PICK_KEY]: 1 }
        : withCrewXp(crew.resources, 0),
      startingPick,
      added,
    };
  }
  if (!ready) return { ok: false, code: 'TRACK_NOT_FULL' };
  const cleared = withCrewXp(crew.resources, 0);
  if (!choice.upgradeId) {
    return {
      ok: true,
      crewAbilities: [...crew.crewAbilities],
      resources: cleared,
      startingPick: false,
      added: [],
    };
  }
  const def = findCrewAbility(ruleset, choice.upgradeId);
  if (!def) return { ok: false, code: 'UNKNOWN_ABILITY' };
  if (!isCrewUpgrade(def)) return { ok: false, code: 'NOT_AN_UPGRADE' };
  if (def.retired && !crew.crewAbilities.includes(def.id))
    return { ok: false, code: 'ABILITY_LOCKED' };
  const size = def.upgradeBoxes ?? 0;
  const before = crewUpgradeBoxes(ruleset, crew, def.id);
  if (before >= size) return { ok: false, code: 'UPGRADE_COMPLETE' };
  const boxes = Math.min(size, before + CREW_UPGRADE_BOXES_PER_ADVANCE);
  const completed = boxes >= size;
  const key = `${CREW_UPGRADE_KEY_PREFIX}${def.id}`;
  const resources = { ...cleared };
  if (completed) delete resources[key];
  else resources[key] = boxes;
  return {
    ok: true,
    crewAbilities: completed ? [...crew.crewAbilities, def.id] : [...crew.crewAbilities],
    resources,
    startingPick: false,
    added: completed ? [def.id] : [],
    upgrade: { id: def.id, boxes, size, completed },
  };
}

/**
 * The special abilities a crew may take right now (own list, plus Veteran-reachable picks).
 *
 * RAW, taking Veteran IS taking another crew's ability (one advance), so a Veteran-granting
 * ability that opens some other pick here is offered only AS that route ("Deadly via Veteran"),
 * never also as a bare pick: alone it would spend an advance on an empty slot, and the picker
 * showed the same choice twice — a "Veteran" row on the crew's own list AND the "Through
 * Veteran" group (round 6 P2-7). The repository gate ({@link planCrewAdvance}) still accepts an
 * explicit bare Veteran — this is the OFFERED set the sheet and the bot's suggestions share.
 */
export function takeableCrewAbilities(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState
): CrewAbilityDefinition[] {
  const gateways = new Set<string>();
  const candidates = (ruleset?.crew?.abilities ?? []).filter(a => {
    if (crew.crewAbilities.includes(a.id) || isCrewUpgrade(a)) return false;
    if (isCrewAbilityUnlocked(ruleset, crew, a.id)) return true;
    const gate = crewVeteranGatewayFor(ruleset, crew, a.id);
    if (gate === null) return false;
    gateways.add(gate);
    return true;
  });
  return candidates.filter(a => !gateways.has(a.id));
}

/** The modelled upgrades still short of their boxes (an upgrades advance may mark them). */
export function openCrewUpgrades(
  ruleset: CrewRulesetSlice,
  crew: CrewAbilityState
): CrewAbilityDefinition[] {
  return (ruleset?.crew?.abilities ?? []).filter(
    a =>
      isCrewUpgrade(a) &&
      !a.retired &&
      crewUpgradeBoxes(ruleset, crew, a.id) < (a.upgradeBoxes ?? 0)
  );
}

function upgradeKeys(resources: Record<string, number>): string[] {
  return Object.keys(resources).filter(k => k.startsWith(CREW_UPGRADE_KEY_PREFIX));
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(x => b.includes(x));
}

export type CrewProgressionCheck =
  | { ok: true }
  | { ok: false; code: CrewAdvanceRefusal | 'ILLEGAL_PROGRESSION'; message: string };

/**
 * The repository write gate (server-side for the bot; in the browser for web writes — F100): is
 * `next` a legal successor of `prior`? A write that ADDS no ability
 * and marks no upgrade box is always fine (removals are GM corrections; held abilities — even ones
 * a legacy sheet took before these rules — are grandfathered, mirroring the character-side
 * `grandfatherHeldAbilities`). Anything that does add must be exactly one {@link planCrewAdvance}
 * outcome from `prior` (the free starting pick, or a full track spent on an ability / two boxes).
 */
export function checkCrewProgression(
  ruleset: CrewRulesetSlice,
  prior: CrewAbilityState,
  next: Pick<CrewAbilityState, 'crewAbilities' | 'resources'>
): CrewProgressionCheck {
  const added = next.crewAbilities.filter(id => !prior.crewAbilities.includes(id));
  const boxesUp = [...new Set([...upgradeKeys(next.resources), ...upgradeKeys(prior.resources)])]
    .map(k => k.slice(CREW_UPGRADE_KEY_PREFIX.length))
    .filter(id => crewUpgradeBoxes(ruleset, next, id) > crewUpgradeBoxes(ruleset, prior, id));
  if (added.length === 0 && boxesUp.length === 0) return { ok: true };

  const candidates: CrewAdvanceChoice[] = [
    ...added.map(abilityId => ({ kind: 'ability' as const, abilityId })),
    ...[...added, ...boxesUp].map(upgradeId => ({ kind: 'upgrades' as const, upgradeId })),
  ];
  let firstRefusal: CrewAdvanceRefusal | null = null;
  for (const choice of candidates) {
    const plan = planCrewAdvance(ruleset, prior, choice);
    if (!plan.ok) {
      firstRefusal ??= plan.code;
      continue;
    }
    const keys = new Set([...upgradeKeys(plan.resources), ...upgradeKeys(next.resources)]);
    const boxesMatch = [...keys].every(
      k => Math.floor(plan.resources[k] ?? 0) === Math.floor(next.resources[k] ?? 0)
    );
    if (
      sameMembers(plan.crewAbilities, next.crewAbilities) &&
      crewXp(plan.resources) === crewXp(next.resources) &&
      boxesMatch
    )
      return { ok: true };
  }
  const code = firstRefusal ?? 'ILLEGAL_PROGRESSION';
  const names = added.map(id => crewAbilityName(ruleset, id)).join(', ');
  const message =
    code === 'TRACK_NOT_FULL'
      ? `A new crew ability needs a full crew advancement track${names ? ` (${names})` : ''}.`
      : code === 'ABILITY_LOCKED'
        ? `${names || 'That ability'} isn't on this crew's list — it needs a free crew Veteran slot.`
        : `That crew ability change isn't a legal advance${names ? ` (${names})` : ''}.`;
  return { ok: false, code, message };
}
