import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('links all five legal documents and shows the operator copyright', () => {
    render(<Footer />);

    const expected: Array<[string, string]> = [
      ['Terms', '/legal/terms'],
      ['Privacy', '/legal/privacy'],
      ['DMCA', '/legal/dmca'],
      ['Acceptable use', '/legal/acceptable-use'],
      ['Licenses', '/legal/licenses'],
    ];
    for (const [name, href] of expected) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(screen.getByText(/Trent Jones \(HeistMind\)/)).toBeInTheDocument();
  });
});
