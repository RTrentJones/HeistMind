// Phase-3 GM-command spec: /score /crew /clock /faction drive the REAL engine use-cases against
// the LINKED campaign behind the GM gate — pinning the rules (heat cascade, tier gate, clock
// completion milestone), the feed events, and the leak-nothing failure paths. The campaign
// fixtures (GAME/CREW/CLOCK/FACTION) and scaffolding come from the shared helpers.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearActorCache } from '../authz';
import { content, CREW, ctx, ok, repos, run } from '../test/helpers';
import {
  clockAutocomplete,
  factionAutocomplete,
  handleClock,
  handleCrew,
  handleFaction,
  handleScore,
} from './gm';

afterEach(() => clearActorCache());

type Option = { name: string; type: number; value?: unknown };
const guildCmd = (
  name: string,
  sub: string,
  options: Option[] = []
): APIApplicationCommandInteraction =>
  ({
    type: 2,
    guild_id: 'guild-1',
    channel: { id: 'chan-1', parent_id: null },
    member: { user: { id: 'discord-1' } },
    data: { name, type: 1, options: [{ name: sub, type: 1, options }] },
  }) as unknown as APIApplicationCommandInteraction;

describe('/score', () => {
  it('start creates the score and logs a score event tagged with it', async () => {
    const r = repos();
    const calls = await run(
      await handleScore(
        ctx(r),
        guildCmd('score', 'start', [{ name: 'name', type: 3, value: 'The Vault' }])
      )
    );
    expect(r.scores.start).toHaveBeenCalledWith('p1', { gameId: 'g1', name: 'The Vault' });
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'score', scoreId: 's1' })
    );
    expect(content(calls)).toContain('Score started — **The Vault**');
  });

  it('end wraps the active score; no active score refuses ephemerally', async () => {
    const r = repos();
    const calls = await run(await handleScore(ctx(r), guildCmd('score', 'end')));
    expect(r.scores.end).toHaveBeenCalledWith('s1');
    expect(content(calls)).toContain('Score wrapped — **The Vault**');

    const idle = repos({
      scores: { findActive: vi.fn().mockResolvedValue(ok(null)), end: vi.fn() },
    });
    const refusal = await run(await handleScore(ctx(idle), guildCmd('score', 'end')));
    expect(refusal.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(refusal[1]?.payload)).toContain('No active score');
  });

  it('a non-GM is refused without leaking; a DM answers the guild-only hint inline', async () => {
    const notGm = repos({ gamePlayers: { isGameMaster: vi.fn().mockResolvedValue(ok(false)) } });
    const calls = await run(await handleScore(ctx(notGm), guildCmd('score', 'start')));
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).not.toContain('Docks');

    const dm = {
      type: 2,
      user: { id: 'discord-1' },
      data: { name: 'score', type: 1, options: [{ name: 'start', type: 1, options: [] }] },
    } as unknown as APIApplicationCommandInteraction;
    const result = await handleScore(ctx(repos()), dm);
    expect(result.work).toBeUndefined();
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64);
  });
});

describe('/crew', () => {
  it('heat runs the heat→wanted cascade and logs a crew event', async () => {
    const r = repos();
    const calls = await run(
      await handleCrew(ctx(r), guildCmd('crew', 'heat', [{ name: 'amount', type: 4, value: 3 }]))
    );
    // 8 + 3 = 11 → one Wanted level marked, heat wraps to 2.
    expect(r.crews.update).toHaveBeenCalledWith('cr1', { heat: 2, wanted: 3 });
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'crew' }));
    expect(content(calls)).toContain('Heat 2/9');
    expect(content(calls)).toContain('Wanted 3/4');
  });

  it('tier spends the full Rep track; an unfilled track refuses BEFORE any write', async () => {
    const r = repos();
    const calls = await run(await handleCrew(ctx(r), guildCmd('crew', 'tier')));
    expect(r.crews.update).toHaveBeenCalledWith('cr1', { tier: 2, rep: 1 });
    expect(content(calls)).toContain('Tier 2');

    const grinding = repos({
      crews: {
        findByGame: vi.fn().mockResolvedValue(ok({ ...CREW, rep: 5 })),
        update: vi.fn(),
      },
    });
    const refusal = await run(await handleCrew(ctx(grinding), guildCmd('crew', 'tier')));
    expect(grinding.crews.update).not.toHaveBeenCalled();
    expect(String(refusal[1]?.payload)).toContain('5/12');
  });

  it('incarcerate clears heat and drops a Wanted level; no crew sheet refuses', async () => {
    const r = repos();
    const calls = await run(await handleCrew(ctx(r), guildCmd('crew', 'incarcerate')));
    expect(r.crews.update).toHaveBeenCalledWith('cr1', { heat: 0, wanted: 1 });
    expect(content(calls)).toContain('Heat 0/9');

    const bare = repos({ crews: { findByGame: vi.fn().mockResolvedValue(ok(null)) } });
    const refusal = await run(await handleCrew(ctx(bare), guildCmd('crew', 'incarcerate')));
    expect(String(refusal[1]?.payload)).toContain('No crew sheet');
  });

  it('xp adds marks to the advancement track (clamped) and logs a crew event', async () => {
    const withXp = repos({
      crews: {
        findByGame: vi.fn().mockResolvedValue(ok({ ...CREW, resources: { 'crew-xp': 5 } })),
        update: vi.fn().mockResolvedValue(ok(CREW)),
      },
    });
    const calls = await run(
      await handleCrew(ctx(withXp), guildCmd('crew', 'xp', [{ name: 'amount', type: 4, value: 2 }]))
    );
    expect(withXp.crews.update).toHaveBeenCalledWith('cr1', { resources: { 'crew-xp': 7 } });
    expect(withXp.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'crew', note: 'Crew XP 7/8' })
    );
    expect(content(calls)).toContain('7/8');

    // Filling the track points at /crew advance.
    const nearFull = repos({
      crews: {
        findByGame: vi.fn().mockResolvedValue(ok({ ...CREW, resources: { 'crew-xp': 7 } })),
        update: vi.fn().mockResolvedValue(ok(CREW)),
      },
    });
    const full = await run(await handleCrew(ctx(nearFull), guildCmd('crew', 'xp')));
    expect(nearFull.crews.update).toHaveBeenCalledWith('cr1', { resources: { 'crew-xp': 8 } });
    expect(content(full)).toContain('/crew advance');
  });

  it('advance spends a FULL track and logs; a non-full track refuses BEFORE any write', async () => {
    const full = repos({
      crews: {
        findByGame: vi.fn().mockResolvedValue(ok({ ...CREW, resources: { 'crew-xp': 8 } })),
        update: vi.fn().mockResolvedValue(ok(CREW)),
      },
    });
    const calls = await run(await handleCrew(ctx(full), guildCmd('crew', 'advance')));
    expect(full.crews.update).toHaveBeenCalledWith('cr1', { resources: { 'crew-xp': 0 } });
    expect(full.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'crew' }));
    expect(content(calls)).toContain('Advance taken');

    const grinding = repos({
      crews: {
        findByGame: vi.fn().mockResolvedValue(ok({ ...CREW, resources: { 'crew-xp': 6 } })),
        update: vi.fn(),
      },
    });
    const refusal = await run(await handleCrew(ctx(grinding), guildCmd('crew', 'advance')));
    expect(grinding.crews.update).not.toHaveBeenCalled();
    expect(String(refusal[1]?.payload)).toContain('6/8');
  });
});

describe('/clock tick', () => {
  it('a completing tick announces the milestone and logs a clock event', async () => {
    const r = repos();
    const calls = await run(
      await handleClock(
        ctx(r),
        guildCmd('clock', 'tick', [{ name: 'clock', type: 3, value: 'cl1' }])
      )
    );
    expect(r.clocks.update).toHaveBeenCalledWith('cl1', { filled: 4 });
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'clock' }));
    expect(content(calls)).toContain('**Alarm** — 4/4');
    expect(content(calls)).toContain('comes to a head');
  });

  it('a routine (non-completing) tick stays panel-only — no feed event', async () => {
    const r = repos();
    const calls = await run(
      await handleClock(
        ctx(r),
        guildCmd('clock', 'tick', [
          { name: 'clock', type: 3, value: 'Alarm' }, // hand-typed name resolves too
          { name: 'segments', type: 4, value: -1 },
        ])
      )
    );
    expect(r.clocks.update).toHaveBeenCalledWith('cl1', { filled: 2 });
    expect(r.rolls.create).not.toHaveBeenCalled();
    expect(content(calls)).toContain('2/4');

    const missing = await run(
      await handleClock(
        ctx(repos()),
        guildCmd('clock', 'tick', [{ name: 'clock', type: 3, value: 'Nope' }])
      )
    );
    expect(String(missing[1]?.payload)).toContain('No clock');
  });
});

describe('/faction status', () => {
  it('sets the standing through the rules and logs a faction event', async () => {
    const r = repos();
    const calls = await run(
      await handleFaction(
        ctx(r),
        guildCmd('faction', 'status', [
          { name: 'faction', type: 3, value: 'f1' },
          { name: 'status', type: 4, value: -3 },
        ])
      )
    );
    expect(r.factions.update).toHaveBeenCalledWith('f1', { status: -3 });
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'faction' }));
    expect(content(calls)).toContain('**The Hive** — status **-3**');
  });
});

describe('GM autocompletes', () => {
  const auto = (
    name: string,
    sub: string,
    options: Option[]
  ): APIApplicationCommandAutocompleteInteraction =>
    ({
      type: 4,
      guild_id: 'guild-1',
      channel: { id: 'chan-1', parent_id: null },
      member: { user: { id: 'discord-1' } },
      data: { name, type: 1, options: [{ name: sub, type: 1, options }] },
    }) as unknown as APIApplicationCommandAutocompleteInteraction;

  it('clock/faction suggest the linked campaign’s state with ids as values', async () => {
    expect(
      await clockAutocomplete(
        ctx(repos()),
        auto('clock', 'tick', [{ name: 'clock', type: 3, value: '' }])
      )
    ).toEqual([{ name: 'Alarm (3/4)', value: 'cl1' }]);
    clearActorCache();
    expect(
      await factionAutocomplete(
        ctx(repos()),
        auto('faction', 'status', [{ name: 'faction', type: 3, value: 'hi' }])
      )
    ).toEqual([{ name: 'The Hive (+1)', value: 'f1' }]);
  });

  it('a non-GM (or unlinked channel) gets NOTHING — no campaign state leaks', async () => {
    const notGm = repos({ gamePlayers: { isGameMaster: vi.fn().mockResolvedValue(ok(false)) } });
    expect(
      await clockAutocomplete(
        ctx(notGm),
        auto('clock', 'tick', [{ name: 'clock', type: 3, value: '' }])
      )
    ).toEqual([]);
    clearActorCache();
    const unlinked = repos({
      games: { findByDiscordChannel: vi.fn().mockResolvedValue(ok(null)) },
    });
    expect(
      await factionAutocomplete(
        ctx(unlinked),
        auto('faction', 'status', [{ name: 'faction', type: 3, value: '' }])
      )
    ).toEqual([]);
  });
});
