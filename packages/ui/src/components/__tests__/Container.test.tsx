/**
 * @vitest-environment jsdom
 */

import { Container } from '../Container';
import { render, screen } from '../../lib/test-utils';

// F99 — the page container's entrance is opacity-only: a box that is still translating when page
// content resolves into it can be scored as layout shift. (The hub's measured shift turned out to
// be its loading state's narrower Container — fixed in the hub page — but a fade never moves.)
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
