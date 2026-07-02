// The characters data-access seam (non-hook side), for writers that run outside React — the
// creation wizard's Zustand `submit()` action. Writes invalidate through the shared QueryClient,
// so a just-created character shows up in every character query (My Characters, roster, dashboard).
import type { Character, CreateCharacterData } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { getQueryClient } from '@/lib/query/client';
import { unwrap } from '@/lib/query/result';
import { characterKeys } from './queries';

/** Validated character create (the wizard's submit) — the server re-runs the ruleset rules. */
export async function createCharacterWithValidation(
  userId: string,
  data: CreateCharacterData
): Promise<Character> {
  const character = await getRepositories()
    .characterManagement.createCharacterWithValidation(userId, data)
    .then(unwrap);
  void getQueryClient().invalidateQueries({ queryKey: characterKeys.all });
  return character;
}
