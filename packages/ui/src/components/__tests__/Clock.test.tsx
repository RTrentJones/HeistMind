/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '../../lib/test-utils';
import { Clock } from '../Clock';

describe('Clock', () => {
  it('renders one wedge per segment and lights the filled ones', () => {
    const { container } = render(<Clock segments={8} filled={3} label='Heat' />);
    const wedges = container.querySelectorAll('path');
    expect(wedges).toHaveLength(8);
    // The first three wedges are lit (ember), the rest are not.
    const lit = container.querySelectorAll('path.fill-game-ember');
    expect(lit).toHaveLength(3);
  });

  it('shows the label with its filled/segments count and an accessible label', () => {
    render(<Clock segments={6} filled={2} label='Escape' />);
    expect(screen.getByText('Escape 2/6')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Escape: 2 of 6 segments filled/ })).toBeInTheDocument();
  });

  it('clamps an out-of-range fill for display', () => {
    const { container } = render(<Clock segments={4} filled={99} />);
    expect(container.querySelectorAll('path.fill-game-ember')).toHaveLength(4);
  });
});
