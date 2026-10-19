/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { Container } from '../Container';
import { render, screen } from '../../lib/test-utils';

// F99 — the page container's entrance is opacity-only. The old 10px slide-up was still in flight
// when page content resolved into the box, and Chrome scored the in-flight translate against the
// grown box as layout shift (hub CLS 0.17–0.23 at 768).
describe('Container entrance', () => {
  it('fades in without translating the box', () => {
    render(<Container data-testid='page'>Content</Container>);
    const box = screen.getByTestId('page');
    expect(box).toHaveTextContent('Content');
    expect(box.style.transform ?? '').not.toMatch(/translate/);
  });

  it('gets no landmark role by default', () => {
    render(<Container data-testid='page'>Content</Container>);
    expect(screen.getByTestId('page')).not.toHaveAttribute('role');
  });
});
