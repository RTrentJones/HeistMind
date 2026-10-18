// One home for the translated labels of the domain enums that render in the UI (review item 8):
// roll outcomes, roll/event kinds, position/effect, game lifecycle state, and character status.
// Every map holds STATIC keys so they stay inside the typed TranslationKey union — never build a
// key with a template string.
import type { CharacterStatus, GameState, RollKind, RollOutcome } from '@heist-mind/core';
import type { TranslationFunction } from '@/lib/i18n/translations';

export const OUTCOME_VARIANT = {
  crit: 'gold',
  success: 'success',
  partial: 'warning',
  bad: 'stress-critical',
} as const;

export const OUTCOME_KEY = {
  crit: 'components.rollPanel.outcome.crit',
  success: 'components.rollPanel.outcome.success',
  partial: 'components.rollPanel.outcome.partial',
  bad: 'components.rollPanel.outcome.bad',
} as const satisfies Record<RollOutcome, string>;

const ROLL_KIND_KEY = {
  action: 'components.enumLabels.rollKind.action',
  resistance: 'components.enumLabels.rollKind.resistance',
  fortune: 'components.enumLabels.rollKind.fortune',
  downtime: 'components.enumLabels.rollKind.downtime',
  loadout: 'components.enumLabels.rollKind.loadout',
  score: 'components.enumLabels.rollKind.score',
  crew: 'components.enumLabels.rollKind.crew',
  faction: 'components.enumLabels.rollKind.faction',
  clock: 'components.enumLabels.rollKind.clock',
  xp: 'components.enumLabels.rollKind.xp',
  harm: 'components.enumLabels.rollKind.harm',
  note: 'components.enumLabels.rollKind.note',
} as const satisfies Record<RollKind, string>;

const POSITION_KEY = {
  controlled: 'components.rollPanel.position.controlled',
  risky: 'components.rollPanel.position.risky',
  desperate: 'components.rollPanel.position.desperate',
} as const;

const EFFECT_KEY = {
  limited: 'components.rollPanel.effect.limited',
  standard: 'components.rollPanel.effect.standard',
  great: 'components.rollPanel.effect.great',
} as const;

const GAME_STATE_KEY = {
  draft: 'components.enumLabels.gameState.draft',
  recruiting: 'components.enumLabels.gameState.recruiting',
  active: 'components.enumLabels.gameState.active',
  paused: 'components.enumLabels.gameState.paused',
  completed: 'components.enumLabels.gameState.completed',
} as const satisfies Record<GameState, string>;

const CHARACTER_STATUS_KEY = {
  active: 'components.enumLabels.characterStatus.active',
  inactive: 'components.enumLabels.characterStatus.inactive',
  retired: 'components.enumLabels.characterStatus.retired',
  dead: 'components.enumLabels.characterStatus.dead',
} as const satisfies Record<CharacterStatus, string>;

/** Translate a key from one of the maps above, falling back to the raw value for unknown data. */
function lookup<K extends string>(
  map: Record<K, Parameters<TranslationFunction>[0]>,
  value: string | null | undefined,
  t: TranslationFunction
): string {
  if (!value) return '';
  return value in map ? t(map[value as K]) : value;
}

export const outcomeLabel = (o: RollOutcome, t: TranslationFunction) => lookup(OUTCOME_KEY, o, t);
export const rollKindLabel = (k: RollKind, t: TranslationFunction) => lookup(ROLL_KIND_KEY, k, t);
export const positionLabel = (p: string | null | undefined, t: TranslationFunction) =>
  lookup(POSITION_KEY, p, t);
export const effectLabel = (e: string | null | undefined, t: TranslationFunction) =>
  lookup(EFFECT_KEY, e, t);
export const gameStateLabel = (s: GameState, t: TranslationFunction) =>
  lookup(GAME_STATE_KEY, s, t);
export const characterStatusLabel = (s: CharacterStatus, t: TranslationFunction) =>
  lookup(CHARACTER_STATUS_KEY, s, t);

/**
 * The "who" segment of a log / activity entry. Character events (harm, XP, stress → trauma,
 * flashbacks) are TITLED with the character's name, so repeating it in the meta line read
 * "Mara" / "Mara · …" (F96). Omit it when the title already is that name.
 */
export function entryWho(label: string | null | undefined, who: string): string {
  if (!label || !who) return who;
  return label.trim().toLowerCase() === who.trim().toLowerCase() ? '' : who;
}
