// RollLog's async states (review items 6/7) and translated enums (item 8): loading, error-with-
// retry, and empty are DISTINCT, and outcomes/kinds/position never render as raw enum strings.
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Roll } from '@heist-mind/core';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { entryParts, entryWho, rollWho } from '@/features/rolls/lib/labels';
import { RollLog } from '../RollLog';

const refetch = vi.fn();
let rollsState: Record<string, unknown> = {};
vi.mock('@/features/rolls/data/queries', () => ({
  useRollsByGame: () => rollsState,
}));
vi.mock('@/features/characters/data/queries', () => ({
  useCharactersByGame: () => ({ data: [{ id: 'c1', name: 'Silks' }] }),
}));
vi.mock('@/features/scores/data/queries', () => ({
  useScoresByGame: () => ({ data: [] }),
}));
let gameState: Record<string, unknown> = {};
vi.mock('@/features/games/data/queries', () => ({
  useGameDetail: () => gameState,
}));

const roll = (over: Partial<Roll>): Roll =>
  ({
    id: 'r1',
    gameId: 'g1',
    characterId: 'c1',
    kind: 'action',
    label: null,
    dice: 2,
    results: [6, 3],
    outcome: 'success',
    position: 'risky',
    effect: 'standard',
    note: null,
    scoreId: null,
    zeroDice: false,
    createdAt: new Date(),
    ...over,
  }) as unknown as Roll;

beforeEach(() => {
  refetch.mockReset();
  gameState = {
    data: {
      createdBy: 'gm-1',
      players: [
        { playerId: 'gm-1', profile: { username: 'Gail' } },
        { playerId: 'p-bo', profile: { username: 'bo_plays' } },
        { playerId: 'p-anon', profile: { username: null } },
      ],
    },
  };
});

describe('RollLog', () => {
  it('shows a loading line (not nothing, not the empty copy) while pending', () => {
    rollsState = { isPending: true, isError: false, data: undefined, refetch };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getByTestId('roll-log-loading')).toBeInTheDocument();
    expect(screen.queryByText('No rolls yet.')).not.toBeInTheDocument();
  });

  it('shows an error with a retry wired to refetch', () => {
    rollsState = {
      isPending: false,
      isError: true,
      error: new Error('network down'),
      data: undefined,
      refetch,
    };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the campaign log.");
    expect(screen.getByRole('alert')).toHaveTextContent('network down');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText('No rolls yet.')).not.toBeInTheDocument();
  });

  it('shows the empty copy only for a resolved empty feed', () => {
    rollsState = { isPending: false, isError: false, data: [], refetch };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument();
  });

  it('translates the outcome, kind, and position/effect instead of rendering raw enums', () => {
    rollsState = {
      isPending: false,
      isError: false,
      data: [roll({ outcome: 'bad', kind: 'action', label: null })],
      refetch,
    };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getByText('Bad outcome')).toBeInTheDocument();
    expect(screen.getByText('Action roll')).toBeInTheDocument();
    expect(screen.getByText(/Risky\/Standard/)).toBeInTheDocument();
    expect(screen.queryByText('bad')).not.toBeInTheDocument();
    // The meta line is its own line with no leading separator (pixel review #13).
    expect(screen.getByText('Silks · [6, 3] · Risky/Standard')).toBeInTheDocument();
  });

  // F96 — character events are TITLED with the character's name; the meta line must not repeat it.
  it('names the character once on an event titled with that name', () => {
    rollsState = {
      isPending: false,
      isError: false,
      data: [
        roll({
          kind: 'harm',
          label: 'Silks',
          dice: 0,
          results: [],
          position: null,
          effect: null,
          note: 'Took moderate harm: Broken arm',
        }),
      ],
      refetch,
    };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getAllByText('Silks')).toHaveLength(1);
    expect(screen.getByText('Took moderate harm: Broken arm')).toBeInTheDocument();
  });
});

describe('entryWho', () => {
  it('drops the who segment only when the title already is that name', () => {
    expect(entryWho('Silks', 'Silks')).toBe('');
    expect(entryWho(' silks ', 'Silks')).toBe('');
    expect(entryWho('Prowl', 'Silks')).toBe('Silks');
    expect(entryWho(null, 'Silks')).toBe('Silks');
    expect(entryWho('Silks', '')).toBe('');
  });
});

describe('entryParts (round 4 P2-N6: "Crew · GM · Crew XP 8/8 · Crew Crew")', () => {
  const crewRow = (over: Partial<Roll>) =>
    roll({
      kind: 'crew',
      characterId: null,
      dice: 0,
      results: [],
      position: null,
      effect: null,
      ...over,
    });
  const renderLog = (rows: Roll[]) => {
    rollsState = { isPending: false, isError: false, data: rows, refetch };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
  };

  it('an unnamed crew event is titled by what happened — no "GM", no repeated note', () => {
    renderLog([crewRow({ label: 'Crew', note: 'Crew XP 8/8' })]);
    // Title + the kind badge — and nothing else saying "Crew" or "GM".
    expect(screen.getAllByText('Crew XP 8/8')).toHaveLength(1);
    expect(screen.getAllByText('Crew')).toHaveLength(1); // the badge
    expect(screen.queryByText('GM')).not.toBeInTheDocument();
  });

  it('a named crew keeps its name as the title and the note under it', () => {
    renderLog([crewRow({ id: 'r2', label: 'The Lampblacks', note: 'Crew XP 8/8' })]);
    expect(screen.getByText('The Lampblacks')).toBeInTheDocument();
    expect(screen.getByText('Crew XP 8/8')).toBeInTheDocument();
    expect(screen.queryByText('GM')).not.toBeInTheDocument();
  });

  it('a pure-function check of the fallbacks', () => {
    const t = ((key: string) =>
      key === 'components.enumLabels.rollKind.crew' || key === 'components.crewSheet.logLabel'
        ? 'Crew'
        : key) as unknown as Parameters<typeof entryParts>[2];
    expect(entryParts({ kind: 'crew', label: null, note: null }, 'GM', t)).toEqual({
      title: 'Crew',
      who: '',
      note: null,
    });
    expect(entryParts({ kind: 'action', label: null, note: ' ' }, 'Silks', t).note).toBeNull();
  });
});

// Round 6 P1-1 — a player's characterless (bare) action roll rendered as "GM · [6]", so a spoofed
// roll passed as the GM's. "GM" now means the GM wrote it; otherwise the player who did.
describe('rollWho — who a characterless row belongs to', () => {
  const bare = (userId: string, over: Partial<Roll> = {}) =>
    roll({ id: `r-${userId}`, characterId: null, userId, results: [6], ...over });

  it('labels the GM only when the GM wrote it; a player by their name', () => {
    rollsState = {
      isPending: false,
      isError: false,
      data: [bare('p-bo'), bare('gm-1', { id: 'r-gm', results: [2] })],
      refetch,
    };
    render(
      <TooltipProvider>
        <RollLog gameId='g1' />
      </TooltipProvider>
    );
    expect(screen.getByText('bo_plays · [6] · Risky/Standard')).toBeInTheDocument();
    expect(screen.getByText('GM · [2] · Risky/Standard')).toBeInTheDocument();
  });

  it('falls back to "Player", says "Fortune" for fortune rolls, and guesses nothing while loading', () => {
    const t = ((key: string) =>
      ({
        'components.rollLog.gm': 'GM',
        'components.rollLog.player': 'Player',
        'components.rollLog.fortune': 'Fortune',
        'components.rollLog.unknownPlayer': 'Unknown',
      })[key] ?? key) as unknown as Parameters<typeof rollWho>[2];
    const ctx = { characterName: (id: string) => (id === 'c1' ? 'Silks' : undefined) };
    expect(rollWho(bare('p-x'), { ...ctx, gmId: 'gm-1' }, t)).toBe('Player');
    expect(rollWho(bare('p-x'), { ...ctx, gmId: 'gm-1', playerName: () => '' }, t)).toBe('Player');
    expect(rollWho(bare('gm-1'), { ...ctx, gmId: 'gm-1' }, t)).toBe('GM');
    expect(rollWho(bare('p-x', { kind: 'fortune' }), { ...ctx, gmId: 'gm-1' }, t)).toBe('Fortune');
    expect(rollWho(bare('p-x'), { ...ctx, gmId: undefined }, t)).toBe('');
    expect(rollWho(roll({ characterId: 'c1' }), { ...ctx, gmId: undefined }, t)).toBe('Silks');
    expect(rollWho(roll({ characterId: 'zz' }), { ...ctx, gmId: 'gm-1' }, t)).toBe('Unknown');
  });
});
