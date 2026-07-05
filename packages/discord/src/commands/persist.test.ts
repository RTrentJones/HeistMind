// PR 2.3 behavior spec: /roll and /resist PERSIST through the real engine use-cases when the
// surface is linked + the actor is a member + their active character is in that campaign — and
// stay display-only (footer says why) in every lesser context. Repos are mocked; the engine
// functions are the real ones, so these tests pin the whole bot→engine→repo call shape. The
// active character rides the REAL shipped DEFAULT_RULESET (F69 fixture-provenance rule) with
// RATED_ACTION at 2 and ATTRIBUTE as the resistance label.
import type { APIApplicationCommandInteraction, APIEmbed } from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearActorCache } from '../authz';
import {
  ATTRIBUTE,
  characterOnDefaultRuleset,
  ctx,
  fail,
  ok,
  RATED_ACTION,
  repos,
  run,
} from '../test/helpers';
import { handleResist } from './resist';
import { handleRoll } from './roll';

afterEach(() => clearActorCache());

type Option = { name: string; type: number; value?: unknown };
const guildCmd = (name: string, options: Option[]): APIApplicationCommandInteraction =>
  ({
    type: 2,
    guild_id: 'guild-1',
    channel: { id: 'chan-1', parent_id: 'cat-1' },
    member: { user: { id: 'discord-1' } },
    data: { name, type: 1, options },
  }) as unknown as APIApplicationCommandInteraction;

const firstEmbed = (calls: { payload?: unknown }[]): APIEmbed =>
  (calls[0]?.payload as { embeds: APIEmbed[] }).embeds[0]!;

describe('/roll action — persisted (Phase 2)', () => {
  it('linked + member + in-campaign → engine rollAction, push charges 2 stress, Logged footer', async () => {
    const r = repos();
    const calls = await run(
      await handleRoll(
        ctx(r, [6, 5, 4]),
        guildCmd('roll', [
          { name: 'action', type: 3, value: RATED_ACTION },
          { name: 'push', type: 5, value: true },
          { name: 'note', type: 3, value: 'over the wall' },
        ])
      )
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        gameId: 'g1',
        characterId: 'c1',
        kind: 'action',
        label: RATED_ACTION,
        dice: 3, // rating 2 + push 1
        results: [6, 5, 4],
        zeroDice: false,
        note: 'over the wall',
      })
    );
    // The push cost is REAL now — the engine wrote stress 2 onto the sheet.
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ characterData: expect.objectContaining({ stress: 2 }) })
    );
    const embed = firstEmbed(calls);
    expect(embed.footer?.text).toBe('Logged to The Docks Job');
    expect(embed.description).toContain('2 stress marked on your sheet');
    expect(embed.description).toContain('over the wall');
  });

  it('not a member of the linked campaign → display-only with the notMember footer', async () => {
    const r = repos({ gamePlayers: { findByGame: vi.fn().mockResolvedValue(ok([])) } });
    const calls = await run(
      await handleRoll(
        ctx(r, [5, 3]),
        guildCmd('roll', [{ name: 'action', type: 3, value: RATED_ACTION }])
      )
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    expect(firstEmbed(calls).footer?.text).toContain('not a member');
  });

  it('active character crews a DIFFERENT campaign → wrongCampaign footer, nothing persisted', async () => {
    const r = repos({
      characters: {
        findWithDetails: vi.fn().mockResolvedValue(ok(characterOnDefaultRuleset({ gameId: 'g2' }))),
      },
    });
    const calls = await run(
      await handleRoll(
        ctx(r, [5, 3]),
        guildCmd('roll', [{ name: 'action', type: 3, value: RATED_ACTION }])
      )
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    expect(firstEmbed(calls).footer?.text).toContain('isn’t in the linked campaign');
  });

  it('unlinked channel → notLinked footer and the push note stays a REMINDER', async () => {
    const r = repos({ games: { findByDiscordChannel: vi.fn().mockResolvedValue(ok(null)) } });
    const calls = await run(
      await handleRoll(
        ctx(r, [5, 3, 1]),
        guildCmd('roll', [
          { name: 'action', type: 3, value: RATED_ACTION },
          { name: 'push', type: 5, value: true },
        ])
      )
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    const embed = firstEmbed(calls);
    expect(embed.footer?.text).toContain('isn’t linked');
    expect(embed.description).toContain('mark 2 stress on your sheet');
  });

  it('an engine failure deletes the public defer and apologizes ephemerally', async () => {
    const r = repos({ rolls: { create: vi.fn().mockResolvedValue(fail('boom')) } });
    const calls = await run(
      await handleRoll(
        ctx(r, [5, 3]),
        guildCmd('roll', [{ name: 'action', type: 3, value: RATED_ACTION }])
      )
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
  });
});

describe('/resist — persisted (Phase 2)', () => {
  it('linked + member + in-campaign → engine rollResistance marks the stress on the sheet', async () => {
    const r = repos();
    const calls = await run(
      await handleResist(
        ctx(r, [4, 2]),
        guildCmd('resist', [
          { name: 'dice', type: 4, value: 2 },
          { name: 'attribute', type: 3, value: ATTRIBUTE },
        ])
      )
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        gameId: 'g1',
        characterId: 'c1',
        kind: 'resistance',
        label: ATTRIBUTE,
        results: [4, 2],
      })
    );
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ characterData: expect.objectContaining({ stress: 2 }) })
    );
    const embed = firstEmbed(calls);
    expect(embed.description).toContain('stress** marked on Silks');
    expect(embed.footer?.text).toBe('Logged to The Docks Job');
  });

  it('a critical phrases the 1-stress clear (already at 0 → sheet untouched)', async () => {
    const r = repos();
    const calls = await run(
      await handleResist(ctx(r, [6, 6]), guildCmd('resist', [{ name: 'dice', type: 4, value: 2 }]))
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'resistance' })
    );
    // stress 0 + (−1) clamps back to 0 — the engine skips the no-op write.
    expect(r.characterManagement.updateCharacterWithValidation).not.toHaveBeenCalled();
    expect(firstEmbed(calls).description).toContain('1 stress cleared');
  });

  it('in a DM, /resist stays the Phase-0 inline display-only roll', async () => {
    const result = await handleResist(ctx(repos(), [4, 2]), {
      type: 2,
      user: { id: 'discord-1' },
      data: { name: 'resist', type: 1, options: [{ name: 'dice', type: 4, value: 2 }] },
    } as unknown as APIApplicationCommandInteraction);
    expect(result.work).toBeUndefined();
    expect(result.response.type).toBe(4);
  });

  it('an unlinked guild channel rolls display-only with the notLinked footer', async () => {
    const r = repos({ games: { findByDiscordChannel: vi.fn().mockResolvedValue(ok(null)) } });
    const calls = await run(
      await handleResist(ctx(r, [4, 2]), guildCmd('resist', [{ name: 'dice', type: 4, value: 2 }]))
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    const embed = firstEmbed(calls);
    expect(embed.footer?.text).toContain('isn’t linked');
    expect(embed.description).toContain('mark **2 stress**');
  });

  it('no active character in a linked channel → the /character use hint footer', async () => {
    const r = repos({
      discordPlayers: { getActiveCharacterId: vi.fn().mockResolvedValue(ok(null)) },
    });
    const calls = await run(
      await handleResist(ctx(r, [4, 2]), guildCmd('resist', [{ name: 'dice', type: 4, value: 2 }]))
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    expect(firstEmbed(calls).footer?.text).toContain('no active character');
  });
});
