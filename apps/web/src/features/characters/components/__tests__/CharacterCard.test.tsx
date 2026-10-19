// Round 6 P2-10 — at 360 one dashboard card kept View inline ("Mara Thistle") while the next
// dropped it to a second row ("Asher Vane · The Bluecoat Ledger"): whether the action wrapped
// depended on the NAME's length. The identity block now takes the row (min 12rem, wrapping inside)
// and the actions never shrink, so the layout depends only on the actions.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { CharacterCard } from '../CharacterCard';

const card = (name: string) =>
  render(
    <CharacterCard
      character={{ id: name, name, status: 'active', gameId: 'g1' }}
      meta='Cutter · The Bluecoat Ledger'
      actions={<button type='button'>View</button>}
    />
  );

describe('CharacterCard layout', () => {
  it('the identity block flexes (and wraps inside); the actions never shrink', () => {
    card('Asher Vane of the Very Long Name');
    const heading = screen.getByRole('heading', { name: 'Asher Vane of the Very Long Name' });
    const identity = heading.closest('.basis-48');
    expect(identity).toHaveClass('min-w-0', 'flex-1', 'basis-48');
    const actions = screen.getByRole('button', { name: 'View' }).parentElement;
    expect(actions).toHaveClass('shrink-0');
    expect(identity?.parentElement).toBe(actions?.parentElement);
  });
});
