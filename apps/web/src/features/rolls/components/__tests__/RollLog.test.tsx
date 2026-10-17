// RollLog's async states (review items 6/7) and translated enums (item 8): loading, error-with-
// retry, and empty are DISTINCT, and outcomes/kinds/position never render as raw enum strings.
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Roll } from '@heist-mind/core';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
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
  });
});
