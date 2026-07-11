/**
 * @vitest-environment jsdom
 */

import { render, screen } from '../../lib/test-utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { HarmTracker } from '../HarmTracker';

const bounds = { lesser: 2, moderate: 2, severe: 1 };

describe('HarmTracker', () => {
  it('renders all three levels and shows filled harm text', () => {
    render(
      <HarmTracker
        harm={{ lesser: ['Scraped'], moderate: [], severe: ['Gutted'] }}
        bounds={bounds}
      />
    );
    expect(screen.getByText('Severe')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Lesser')).toBeInTheDocument();
    expect(screen.getByText('Gutted')).toBeInTheDocument();
    expect(screen.getByText('Scraped')).toBeInTheDocument();
  });

  it('renders empty boxes without throwing when harm is empty/missing', () => {
    expect(() =>
      render(<HarmTracker harm={{ lesser: [], moderate: [], severe: [] }} bounds={bounds} />)
    ).not.toThrow();
  });

  it('with onClearEntry, a filled box becomes an accessible clear button', async () => {
    const onClearEntry = vi.fn();
    render(
      <HarmTracker
        harm={{ lesser: ['Scraped'], moderate: [], severe: [] }}
        bounds={bounds}
        onClearEntry={onClearEntry}
        clearLabel={text => `Clear harm: ${text}`}
      />
    );
    // Only the filled box is a button; empty boxes stay inert spans.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Clear harm: Scraped' }));
    expect(onClearEntry).toHaveBeenCalledWith('lesser', 'Scraped');
  });

  it('clear buttons disable while a save is in flight', () => {
    render(
      <HarmTracker
        harm={{ lesser: ['Scraped'], moderate: [], severe: [] }}
        bounds={bounds}
        onClearEntry={() => {}}
        disabled
      />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
