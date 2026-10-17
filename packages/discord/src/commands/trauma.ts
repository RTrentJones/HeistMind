// Stress overflow → trauma, the bot side (RAW: marking the last stress box = trauma, stress back to
// 0). The engine owes the condition and feed-logs it with this copy; the bot reply points the
// player at their web sheet, where they pick the condition from the ruleset's list.
import type { CharacterWithDetails } from '@heist-mind/core';
import type { TraumaLogCopy } from '@heist-mind/engine';
import { copy } from '../format/copy';
import type { BotContext } from '../types';

/** Feed copy for a stress overflow → trauma (shared by every bot stress cost). */
export const TRAUMA_LOG: TraumaLogCopy = {
  note: copy.traumaLogNote,
  retireNote: copy.traumaRetireLogNote,
};

/** The reply when a stress cost marked the last box: trauma owed, pick it on the web sheet. */
export function traumaReply(
  ctx: Pick<BotContext, 'siteUrl'>,
  character: Pick<CharacterWithDetails, 'id' | 'name'>,
  mustRetire: boolean
): string {
  const line = copy.traumaTaken(character.name, `${ctx.siteUrl}/characters/${character.id}`);
  return mustRetire ? `${line}\n${copy.traumaRetire}` : line;
}
