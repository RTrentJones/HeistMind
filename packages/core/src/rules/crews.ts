// Pure crew-sheet bounds (no I/O), so the UI and the DB layer enforce identical FitD limits.
// The repository clamps every write through these; the DB CHECK constraints are the backstop.

import type { CrewHold, RulesetContent } from '../domain';

/** Upper bounds for the capped crew stats (FitD). Lower bound is always 0. */
export const CREW_LIMITS = { tier: 4, heat: 9, wanted: 4 } as const;

export type CrewStat = keyof typeof CREW_LIMITS;

/** Clamp a capped stat (tier/heat/wanted) into `[0, limit]`. */
export function clampCrewStat(stat: CrewStat, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value), CREW_LIMITS[stat]));
}

/** Clamp an uncapped, non-negative crew value (rep / coin / vault). */
export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** Normalize a hold value (defaults to 'strong' when not a legal hold). */
export function normalizeHold(hold: string | null | undefined): CrewHold {
  return hold === 'weak' ? 'weak' : 'strong';
}

/**
 * Apply a heat change with the BitD Wanted cascade: when the heat track fills (9), the crew gains a
 * Wanted level and heat resets, carrying any remainder. Wanted clamps at its cap (4); once maxed,
 * extra heat just clamps at the cap. Returns the new `{ heat, wanted }`.
 * https://bladesinthedark.com (crew heat → wanted)
 */
export function applyHeat(
  current: { heat: number; wanted: number },
  delta: number
): { heat: number; wanted: number } {
  let heat = Math.max(0, Math.floor(current.heat + delta));
  let wanted = clampCrewStat('wanted', current.wanted);
  while (heat >= CREW_LIMITS.heat && wanted < CREW_LIMITS.wanted) {
    heat -= CREW_LIMITS.heat;
    wanted += 1;
  }
  return { heat: Math.min(heat, CREW_LIMITS.heat), wanted };
}

/** The length of the Rep track with no turf held (BitD: 12). */
export const REP_PER_TIER = 12;
/** The most turf that can reduce the rep cost (BitD: "You can hold a maximum of 6 turf"). */
export const MAX_TURF = 6;
/** Coin per new Tier to develop (BitD: "coin equal to your new Tier x 8"). */
export const TIER_COIN_PER_LEVEL = 8;

/** How many held claims are turf (a claim named "Turf", "Turf (Docks)", …), capped at {@link MAX_TURF}. */
export function turfHeld(claims: readonly string[] | null | undefined): number {
  return Math.min(MAX_TURF, (claims ?? []).filter(c => /\bturf\b/i.test(c)).length);
}

/**
 * Rep needed to fill the tracker — and the Rep MAXIMUM ([SRD, Faction game → Development / Turf](
 * https://bladesinthedark.com/faction-game)): 12, less one per turf held. "As long as your rep
 * tracker is full, you don't earn new rep" — rep never exceeds this and never carries over.
 */
export function repToDevelop(claims: readonly string[] | null | undefined): number {
  return REP_PER_TIER - turfHeld(claims);
}

/** Clamp a rep value into `[0, repToDevelop(claims)]`. */
export function clampRep(value: number, claims: readonly string[] | null | undefined): number {
  return Math.min(clampNonNegative(value), repToDevelop(claims));
}

/** Whether any of the crew's held abilities halves the Tier cost (BitD "Patron"), per the ruleset. */
export function crewHalvesTierCost(
  ruleset: Pick<RulesetContent, 'crew'> | null | undefined,
  crewAbilities: readonly string[]
): boolean {
  return (ruleset?.crew?.abilities ?? []).some(
    a => crewAbilities.includes(a.id) && a.effects?.halfTierCost === true
  );
}

/** Coin to raise the crew to `newTier` (Tier × 8; halved — rounded up — with a Patron). */
export function tierAdvanceCost(newTier: number, halfCost = false): number {
  const full = newTier * TIER_COIN_PER_LEVEL;
  return halfCost ? Math.ceil(full / 2) : full;
}

export interface CrewDevelopInput {
  tier: number;
  rep: number;
  hold: CrewHold;
  /** Coin on hand in the crew's treasury. */
  coin: number;
  /** Coin banked in the vault (spent after `coin`). */
  vault?: number;
  /** Held claims — turf among them lowers the rep needed. */
  claims?: readonly string[];
  /** The crew holds an ability that halves the Tier cost (BitD crew "Patron"). */
  halfCost?: boolean;
}

export type CrewDevelopResult =
  | {
      ok: true;
      /** `hold`: weak → strong (no coin). `tier`: paid to raise Tier (hold → weak). */
      kind: 'hold' | 'tier';
      tier: number;
      rep: number;
      hold: CrewHold;
      coin: number;
      vault: number;
      /** Coin spent (0 for a hold development). */
      cost: number;
    }
  | {
      ok: false;
      code: 'REP_NOT_FULL' | 'TIER_MAX' | 'INSUFFICIENT_COIN';
      /** Rep needed (REP_NOT_FULL) or coin needed (INSUFFICIENT_COIN). */
      needed: number;
    };

/**
 * Develop the crew when its rep tracker is full — RAW ([SRD, Faction game → Development](
 * https://bladesinthedark.com/faction-game)): "If your hold is weak, it becomes strong. Reset your rep
 * to zero. If your hold is strong, you can pay to increase your crew Tier by one. This costs coin
 * equal to your new Tier x 8… Once you pay and increase your Tier, reset your rep to zero and reduce
 * your hold to weak." Coin is drawn from the treasury first, then the vault. Pure: returns the next
 * state or a refusal the client phrases.
 */
export function advanceTier(current: CrewDevelopInput): CrewDevelopResult {
  const tier = clampCrewStat('tier', current.tier);
  const needed = repToDevelop(current.claims);
  const rep = clampNonNegative(current.rep);
  const coin = clampNonNegative(current.coin);
  const vault = clampNonNegative(current.vault ?? 0);
  if (rep < needed) return { ok: false, code: 'REP_NOT_FULL', needed };
  if (normalizeHold(current.hold) === 'weak') {
    return { ok: true, kind: 'hold', tier, rep: 0, hold: 'strong', coin, vault, cost: 0 };
  }
  if (tier >= CREW_LIMITS.tier) return { ok: false, code: 'TIER_MAX', needed: 0 };
  const cost = tierAdvanceCost(tier + 1, current.halfCost);
  if (coin + vault < cost) return { ok: false, code: 'INSUFFICIENT_COIN', needed: cost };
  const fromCoin = Math.min(coin, cost);
  return {
    ok: true,
    kind: 'tier',
    tier: tier + 1,
    rep: 0,
    hold: 'weak',
    coin: coin - fromCoin,
    vault: vault - (cost - fromCoin),
    cost,
  };
}

/**
 * Apply an incarceration — BitD's direct way to cool off: when a crew member, ally, contact, or a
 * framed enemy is convicted and jailed, the crew's Wanted level drops by 1 and its Heat clears.
 * Returns the new `{ heat, wanted }`. https://bladesinthedark.com/index.php/heat
 */
export function incarcerate(current: { heat: number; wanted: number }): {
  heat: number;
  wanted: number;
} {
  return { heat: 0, wanted: Math.max(0, clampCrewStat('wanted', current.wanted) - 1) };
}

// ----- crew advancement (XP) -------------------------------------------------------------------
// BitD: a crew earns XP from its triggers (a smart operation, contending with a greater foe,
// bolstering its rep, expressing its nature); fill the advancement track → take a crew special
// ability and reset. The XP rides a reserved key in the existing `resources` map so the feature
// needs no schema migration (it can graduate to a dedicated column later). 8 mirrors the playbook
// XP track. https://bladesinthedark.com/index.php/advancement

/** Crew advancement track length — fill it to take a crew advance, then reset. */
export const CREW_XP_TRACK = 8;
/** Reserved `resources` key the crew's advancement XP is stored under. */
export const CREW_XP_KEY = 'crew-xp';

/** The crew's current advancement XP, clamped to `[0, CREW_XP_TRACK]`. */
export function crewXp(resources: Record<string, number>): number {
  return Math.max(0, Math.min(CREW_XP_TRACK, Math.floor(resources[CREW_XP_KEY] ?? 0)));
}

/** Whether the advancement track is full (a crew advance is available). */
export function crewAdvanceReady(resources: Record<string, number>): boolean {
  return crewXp(resources) >= CREW_XP_TRACK;
}

/** A new `resources` map with the crew's advancement XP set to `value` (clamped to the track). */
export function withCrewXp(
  resources: Record<string, number>,
  value: number
): Record<string, number> {
  return { ...resources, [CREW_XP_KEY]: crewXp({ [CREW_XP_KEY]: value }) };
}
