/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '../../lib/test-utils';
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
});
