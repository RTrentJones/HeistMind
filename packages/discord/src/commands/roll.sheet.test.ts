// The sheet-aware /roll (Phase 1): active-character rating resolution, push/extra pool math,
// public-defer with delete+ephemeral failures, and the action autocomplete with ratings.
// The active character is the shared DEFAULT_RULESET fixture (F69 fixture-provenance rule):
// RATED_ACTION carries 2 dots, UNRATED_ACTION none — both real canonical actions.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, type vi } from 'vitest';
import { clearActorCache } from '../authz';
import { ctx, ok, RATED_ACTION, repos, run, UNRATED_ACTION } from '../test/helpers';
import { handleRoll, rollAutocomplete } from './roll';

afterEach(() => clearActorCache());

type Option = { name: string; type: number; value?: unknown };
const cmd = (options: Option[]): APIApplicationCommandInteraction =>
  ({
    type: 2,
    user: { id: 'discord-1' },
    data: { name: 'roll', type: 1, options },
  }) as unknown as APIApplicationCommandInteraction;

describe('/roll action (sheet form)', () => {
  it('defers PUBLICLY and rolls rating + extra + push with the reminder note', async () => {
    const result = await handleRoll(
      ctx(repos(), [6, 5, 4, 3]),
      cmd([
        { name: 'action', type: 3, value: RATED_ACTION.toLowerCase() }, // case-insensitive match
        { name: 'extra', type: 4, value: 1 },
        { name: 'push', type: 5, value: true },
      ])
    );
    expect(result.response.type).toBe(5);
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBeUndefined();
    const calls = await run(result);
    const embed = (calls[0]?.payload as { embeds: { title: string; description: string }[] })
      .embeds[0];
    // rating 2 + extra 1 + push 1 = 4d
    expect(embed?.title).toBe(`Silks — ${RATED_ACTION} 2d +2d`);
    expect(embed?.description).toContain('[6, 5, 4, 3]');
    expect(embed?.description).toContain('mark 2 stress');
  });

  it('no active character → delete + ephemeral sign-in/use copy', async () => {
    const r = repos();
    (r.discordPlayers.getActiveCharacterId as ReturnType<typeof vi.fn>).mockResolvedValue(ok(null));
    const calls = await run(
      await handleRoll(ctx(r, []), cmd([{ name: 'action', type: 3, value: RATED_ACTION }]))
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
  });

  it('an action missing from the ruleset fails with the autocomplete hint', async () => {
    const calls = await run(
      await handleRoll(ctx(repos(), []), cmd([{ name: 'action', type: 3, value: 'Fly' }]))
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).toContain('Fly');
  });

  it('neither dice nor action → ephemeral usage hint (inline)', async () => {
    const result = await handleRoll(ctx(null, []), cmd([]));
    expect(result.work).toBeUndefined();
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64);
  });

  it('an UNRATED action rolls the zero-dice rule', async () => {
    const result = await handleRoll(
      ctx(repos(), [6, 6]),
      cmd([{ name: 'action', type: 3, value: UNRATED_ACTION }])
    );
    const calls = await run(result);
    const embed = (
      calls[0]?.payload as { embeds: { title: string; fields?: { value: string }[] }[] }
    ).embeds[0];
    expect(embed?.title).toBe(`Silks — ${UNRATED_ACTION} 0d`);
    // two sixes on 0d take-lowest is a plain success, never a crit.
    expect(embed?.fields?.[0]?.value).toBe('Full success');
  });
});

describe('rollAutocomplete', () => {
  const auto = (typed: string) =>
    ({
      type: 4,
      user: { id: 'discord-1' },
      data: {
        name: 'roll',
        type: 1,
        options: [{ name: 'action', type: 3, value: typed, focused: true }],
      },
    }) as unknown as APIApplicationCommandAutocompleteInteraction;

  it('suggests the active character’s actions labeled with their ratings', async () => {
    const choices = await rollAutocomplete(
      ctx(repos(), []),
      auto(RATED_ACTION.slice(0, 3).toLowerCase())
    );
    expect(choices).toEqual([{ name: `${RATED_ACTION} (2d)`, value: RATED_ACTION }]);
  });

  it('degrades to [] with no repos or no active character', async () => {
    expect(await rollAutocomplete(ctx(null, []), auto(''))).toEqual([]);
  });
});
