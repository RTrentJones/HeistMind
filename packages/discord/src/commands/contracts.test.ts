// Shape contracts (audit T2): the bot's suggestion surfaces must work for a character on EVERY
// SHIPPED ruleset — the F69 bug class was an invented fixture proving a path real content can't
// take (the default ruleset ships content.skills: [] and the bot read exactly that). These run
// on the real builtins, so a content-shape drift in either the bot or a builtin fails HERE
// before any player types /roll.
import type { APIApplicationCommandAutocompleteInteraction } from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rulesetActions, usesXpTracks, type RulesetContent } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import { clearActorCache } from '../authz';
import type { BotContext } from '../types';
import { rollAutocomplete } from './roll';
import { xpAutocomplete } from './sheet';

afterEach(() => clearActorCache());

const ok = <T,>(data: T) => ({ success: true as const, data });

function characterOn(content: RulesetContent) {
  return {
    id: 'c1',
    name: 'Contract Runner',
    createdBy: 'p1',
    gameId: null,
    game: null,
    ruleset: { content },
    characterData: {
      playbook: content.playbooks[0]?.id ?? 'none',
      skills: {},
      attributes: {},
      specialAbilities: [],
      stress: 0,
      trauma: [],
      contacts: [],
      custom: {},
    },
  };
}

function ctxOn(content: RulesetContent): BotContext {
  const repos = {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok({ id: 'p1', username: 'c' })) },
    discordPlayers: { getActiveCharacterId: vi.fn().mockResolvedValue(ok('c1')) },
    characters: { findWithDetails: vi.fn().mockResolvedValue(ok(characterOn(content))) },
  } as unknown as DatabaseRepositories;
  return { realize: () => [], deploySha: 'test', siteUrl: 'https://x.example', repos };
}

const auto = (
  name: string,
  options: unknown[],
  sub?: string
): APIApplicationCommandAutocompleteInteraction =>
  ({
    type: 4,
    user: { id: 'discord-contract' },
    data: {
      name,
      type: 1,
      options: sub ? [{ name: sub, type: 1, options }] : options,
    },
  }) as unknown as APIApplicationCommandAutocompleteInteraction;

describe.each(BUILTIN_RULESETS.map(b => [b.id, b.content] as const))(
  'builtin contract: %s',
  (_id, content) => {
    it('offers every canonical action to /roll action:', async () => {
      const choices = await rollAutocomplete(
        ctxOn(content),
        auto('roll', [{ name: 'action', type: 3, value: '', focused: true }])
      );
      const actions = rulesetActions(content);
      expect(actions.length).toBeGreaterThan(0);
      expect(choices.map(c => c.value)).toEqual(actions.slice(0, 25));
    });

    it('offers XP tracks (or dots) to /xp — the P1 surface', async () => {
      clearActorCache();
      const marks = await xpAutocomplete(
        ctxOn(content),
        auto('xp', [{ name: 'track', type: 3, value: '', focused: true }], 'mark')
      );
      if (usesXpTracks(content)) {
        expect(marks[0]).toEqual({ name: 'Playbook', value: 'playbook' });
        expect(marks.length).toBe(1 + (content.attributes?.length ?? 0));
      } else {
        expect(marks).toEqual([]);
      }
      clearActorCache();
      const picks = await xpAutocomplete(
        ctxOn(content),
        auto('xp', [{ name: 'pick', type: 3, value: '', focused: true }], 'advance')
      );
      // Action dots are always offerable; unowned abilities depend on the roster.
      expect(picks.length).toBeGreaterThanOrEqual(rulesetActions(content).length);
    });
  }
);
