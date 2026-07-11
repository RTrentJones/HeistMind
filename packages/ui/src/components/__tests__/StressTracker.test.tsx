/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '../../lib/test-utils';
import { StressTracker } from '../StressTracker';
import { TooltipProvider } from '../Tooltip';
import { calculateStressLevel } from '../../lib/utils';

const withProvider = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('calculateStressLevel', () => {
  it('degrades gracefully on a non-positive max (no throw)', () => {
    // Regression: the attribute dot-allocator legitimately renders a 0-length track when the
    // point-buy budget is spent; throwing here crashed the whole character-creation page.
    expect(() => calculateStressLevel(0, 0)).not.toThrow();
    expect(calculateStressLevel(0, 0)).toBe('low');
    expect(calculateStressLevel(3, -1)).toBe('low');
  });

  it('clamps a negative current instead of throwing', () => {
    expect(() => calculateStressLevel(-2, 9)).not.toThrow();
    expect(calculateStressLevel(-2, 9)).toBe('low');
  });

  it('still classifies normal values', () => {
    expect(calculateStressLevel(0, 9)).toBe('low');
    expect(calculateStressLevel(9, 9)).toBe('critical');
  });
});

describe('StressTracker', () => {
  it('renders a zero-length track without throwing', () => {
    // The character-creation allocator could pass max=0 (no affordable dots); this must not crash.
    expect(() => withProvider(<StressTracker current={0} max={0} interactive />)).not.toThrow();
  });

  it('renders a normal track without throwing', () => {
    expect(() =>
      withProvider(<StressTracker current={2} max={4} interactive showNumbers />)
    ).not.toThrow();
  });

  it('pips carry their action as an accessible name (F84)', () => {
    withProvider(<StressTracker current={3} max={9} interactive onChange={() => {}} />);
    // Any non-top pip names the value it sets; the top filled pip names the step back down.
    expect(screen.getByRole('button', { name: 'Set stress to 5' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Clear stress to 2' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
