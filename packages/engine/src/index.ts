// @heist-mind/engine — HeistMind's application use-cases: the MULTI-STEP game operations, written
// once and driven by every client (the web app's mutations today, the Discord bot's commands next).
//
// Contract:
// - Every use-case is `(repos: DatabaseRepositories, input) => Promise<Result<…>>` — pure
//   orchestration over the repository interfaces, no I/O of its own beyond them.
// - Use-cases return DOMAIN DATA, never copy: log labels/notes arrive as inputs (each client
//   localizes), and outcomes come back as data for the client to phrase.
// - Dice are REALIZED by the caller (each client owns its randomness; the repository recomputes
//   outcomes from the faces) — the engine stays deterministic and unit-testable.
// - Single-call writes (create a clock, edit a faction's name, join by code…) deliberately have
//   no use-case — the repository contract IS the shared surface there — UNLESS the change belongs
//   in the shared campaign feed: any mechanical change the table should see (crew heat/tier,
//   faction status, a clock filling, XP marks/advances) is a use-case, because "persist + log"
//   is exactly the multi-step sequencing this layer exists to hold.
export { advanceCharacter, applyStress, markXp, retireCharacter } from './characters';
export type {
  AdvanceCharacterInput,
  ApplyStressInput,
  MarkXpInput,
  RetireCharacterInput,
} from './characters';
export { rollAction, rollResistance } from './rolls';
export type { ActionRollInput, ResistanceRollInput } from './rolls';
export { indulgeVice, viceDicePool } from './downtime';
export type { IndulgeViceInput, IndulgeViceOutcome } from './downtime';
export { startScore, endScore } from './scores';
export type { StartScoreInput, EndScoreInput } from './scores';
export { saveLoadout } from './loadout';
export type { SaveLoadoutInput } from './loadout';
export { advanceCrewTier, applyCrewHeat, incarcerateCrew } from './crews';
export type { ApplyCrewHeatInput } from './crews';
export { setFactionStatus } from './factions';
export type { SetFactionStatusInput } from './factions';
export { tickClock } from './clocks';
export type { TickClockInput, TickClockOutcome } from './clocks';
