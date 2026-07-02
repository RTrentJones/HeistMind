import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Game } from '@heist-mind/core';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { GameCard } from '../GameCard';

// The state badge's Tooltip needs the Radix provider (mounted by I18nProvider in the app).
function renderCard(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const GAME = {
  id: 'g1',
  name: 'Docks Job',
  description: 'A quiet score by the water.',
  state: 'active',
} as Game;

describe('GameCard', () => {
  it('renders the campaign with a GM badge and open link', () => {
    renderCard(<GameCard game={GAME} role='gm' />);
    expect(screen.getByText('Docks Job')).toBeInTheDocument();
    expect(screen.getByText('A quiet score by the water.')).toBeInTheDocument();
    expect(screen.getByText('GM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/games/g1');
  });

  it('renders the player badge for a joined campaign', () => {
    renderCard(<GameCard game={GAME} role='player' />);
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.queryByText('GM')).not.toBeInTheDocument();
  });
});
