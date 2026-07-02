// Score / operation lifecycle use-cases: start/end a score AND write its campaign-log event in one
// operation (the end event fires after the score is no longer active, so it is tagged explicitly).
import type { Result, Score } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

export interface StartScoreInput {
  gameId: string;
  userId: string;
  name?: string;
  /** Log-event copy — the client's localized strings. */
  logLabel: string;
  logNote: string;
}

/** Start a score (at most one active at a time, repo-enforced) and log the start to the feed. */
export async function startScore(
  repos: DatabaseRepositories,
  input: StartScoreInput
): Promise<Result<Score>> {
  const created = await repos.scores.start(input.userId, {
    gameId: input.gameId,
    ...(input.name !== undefined ? { name: input.name } : {}),
  });
  if (!created.success) return created;
  const logged = await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    kind: 'score',
    label: input.logLabel,
    dice: 0,
    results: [],
    note: input.logNote,
    scoreId: created.data.id,
  });
  if (!logged.success) return logged as Result<never>;
  return created;
}

export interface EndScoreInput {
  gameId: string;
  userId: string;
  scoreId: string;
  logLabel: string;
  logNote: string;
}

/** End the active score and log the wrap-up to the feed, tagged with the just-ended score. */
export async function endScore(
  repos: DatabaseRepositories,
  input: EndScoreInput
): Promise<Result<Score>> {
  const ended = await repos.scores.end(input.scoreId);
  if (!ended.success) return ended;
  const logged = await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    kind: 'score',
    label: input.logLabel,
    dice: 0,
    results: [],
    note: input.logNote,
    scoreId: input.scoreId,
  });
  if (!logged.success) return logged as Result<never>;
  return ended;
}
