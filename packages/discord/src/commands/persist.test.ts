// PR 2.3 behavior spec: /roll and /resist PERSIST through the real engine use-cases when the
// surface is linked + the actor is a member + their active character is in that campaign — and
// stay display-only (footer says why) in every lesser context. Repos are mocked; the engine
// functions are the real ones, so these tests pin the whole bot→engine→repo call shape. The
// active character rides the REAL shipped DEFAULT_RULESET (F69 fixture-provenance rule) with
// RATED_ACTION at 2 and ATTRIBUTE as the resistance label.
import type { APIApplicationCommandInteraction, APIEmbed } from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { clearActorCache } from '../authz';
import {
  ATTRIBUTE,
  characterOn,
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
    expect(firstEmbed(calls).footer?.text).toContain('Ask the GM for an invite link');
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

describe('/roll push — the trauma reply reports the APPLIED outcome', () => {
  // The shipped ruleset with one crew ability that grants a stress box: max 9 → 10 for members.
  const withCrewBox = structuredClone(DEFAULT_RULESET);
  withCrewBox.crew = {
    ...(withCrewBox.crew ?? { types: [] }),
    abilities: [
      ...(withCrewBox.crew?.abilities ?? []),
      { id: 'hardy', name: 'Hardy', description: '', effects: { stressBoxes: 1 } },
    ],
  } as typeof withCrewBox.crew;

  it('a push to 9 on a crew-lengthened track announces no trauma', async () => {
    const r = repos(
      {
        crews: {
          findByGame: vi.fn().mockResolvedValue(ok({ id: 'cr1', crewAbilities: ['hardy'] })),
        },
      },
      characterOn(withCrewBox, { characterData: { stress: 7, skills: { [RATED_ACTION]: 2 } } })
    );
    const calls = await run(
      await handleRoll(
        ctx(r, [6, 5, 4]),
        guildCmd('roll', [
          { name: 'action', type: 3, value: RATED_ACTION },
          { name: 'push', type: 5, value: true },
        ])
      )
    );
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ characterData: expect.objectContaining({ stress: 9 }) })
    );
    expect(JSON.stringify(calls)).not.toMatch(/trauma/i);
  });
});

describe('/resist — persisted (Phase 2)', () => {
  // ATTRIBUTE's rating is DERIVED from the sheet: the fixture rates one of its actions (RATED_ACTION)
  // so the rating is 1; rating a second of its actions makes it 2.
  const secondAction = DEFAULT_RULESET.attributes[0]!.skills[1]!;
  const ratedTwo = () =>
    characterOnDefaultRuleset({
      characterData: { skills: { [RATED_ACTION]: 2, [secondAction]: 1 } },
    });

  it('linked + member + in-campaign → rolls the SHEET rating (typed dice ignored) and marks stress', async () => {
    const r = repos();
    const calls = await run(
      await handleResist(
        ctx(r, [4, 2, 6, 6, 6, 6, 6, 6, 6, 6]),
        guildCmd('resist', [
          { name: 'dice', type: 4, value: 10 },
          { name: 'attribute', type: 3, value: ATTRIBUTE },
        ])
      )
    );
    // Review #6: a rating-1 resist rolls 1 die, not the typed 10.
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        gameId: 'g1',
        characterId: 'c1',
        kind: 'resistance',
        label: ATTRIBUTE,
        dice: 1,
        results: [4],
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

  it('bonus: adds an ability’s resistance dice (Iron Will +1d) to the sheet rating', async () => {
    const r = repos();
    const calls = await run(
      await handleResist(
        ctx(r, [4, 2, 6, 6]),
        guildCmd('resist', [
          { name: 'attribute', type: 3, value: ATTRIBUTE },
          { name: 'bonus', type: 4, value: 1 },
        ])
      )
    );
    // Rating 1 + bonus 1 = 2 dice; the highest (4) costs 2 stress.
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'resistance', dice: 2, results: [4, 2] })
    );
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ characterData: expect.objectContaining({ stress: 2 }) })
    );
    const embed = firstEmbed(calls);
    expect(embed.title).toContain('2d');
    expect(embed.description).toContain('+1d bonus');
  });

  it('a point-buy ruleset rolls the STORED attribute rating (nothing to derive from)', async () => {
    // The shipped ruleset with action ratings switched off = the legacy point-buy shape: attributes
    // are bought directly, so the sheet (and the bot) read them as stored.
    const pointBuy = structuredClone(DEFAULT_RULESET);
    delete pointBuy.characterCreation.actionRatings;
    const attrId = DEFAULT_RULESET.attributes[0]!.id;
    const r = repos({}, characterOn(pointBuy, { characterData: { attributes: { [attrId]: 3 } } }));
    await run(
      await handleResist(
        ctx(r, [4, 2, 1, 6, 6]),
        guildCmd('resist', [{ name: 'attribute', type: 3, value: ATTRIBUTE }])
      )
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'resistance', dice: 3, results: [4, 2, 1] })
    );
  });

  it('persisting needs a ruleset attribute — refuses ephemerally, nothing logged', async () => {
    const r = repos();
    const calls = await run(
      await handleResist(ctx(r, [4, 2]), guildCmd('resist', [{ name: 'dice', type: 4, value: 2 }]))
    );
    expect(r.rolls.create).not.toHaveBeenCalled();
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).toContain(ATTRIBUTE);
  });

  it('a resist cost that marks the last box → trauma reply pointing at the sheet', async () => {
    const r = repos({}, characterOnDefaultRuleset({ characterData: { stress: 8 } }));
    const calls = await run(
      await handleResist(
        ctx(r, [3]),
        guildCmd('resist', [{ name: 'attribute', type: 3, value: ATTRIBUTE }])
      )
    );
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({
        characterData: expect.objectContaining({ stress: 0, traumaPending: 1 }),
      })
    );
    const payload = calls[0]?.payload as { content?: string };
    expect(payload.content).toContain('trauma');
    expect(payload.content).toContain('https://heistmind.example/characters/c1');
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'note' }));
  });

  it('a critical phrases the 1-stress clear (already at 0 → sheet untouched)', async () => {
    const r = repos({}, ratedTwo());
    const calls = await run(
      await handleResist(
        ctx(r, [6, 6]),
        guildCmd('resist', [{ name: 'attribute', type: 3, value: ATTRIBUTE }])
      )
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
