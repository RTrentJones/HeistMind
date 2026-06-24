// Character validity rules, surfaced to the web app via @heist-mind/shared.
//
// The implementation lives in @heist-mind/database (`character-rules.ts`) so the DB layer can
// validate server-side without a dependency cycle (shared → database). This module just
// re-exports it, keeping `@heist-mind/shared` the single import surface the web UI reaches for
// (alongside ruleset-validation).
export {
  validateCharacter,
  pointBuySpent,
  abilityChoiceLimit,
  isAbilityUnlocked,
  stressBounds,
  harmBounds,
  loadLimit,
  loadUsed,
  advancementCost,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  advanceTrack,
  markXp,
  clearXpTrack,
  PLAYBOOK_TRACK,
  stepKind,
  usesActionRatings,
  rulesetActions,
  actionDotsSpent,
  deriveAttributes,
  DEFAULT_STRESS,
  DEFAULT_ABILITY_CHOICES,
  DEFAULT_ATTR_MAX,
  type ValidationMode,
  type ValidateOptions,
  type StepKind,
} from '@heist-mind/database';
