import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { ComingSoon } from '../ComingSoon';

describe('ComingSoon', () => {
  it('shows the holding-page heading and no sign-in affordance', () => {
    render(<ComingSoon />);

    expect(screen.getByRole('heading', { level: 1, name: /coming soon/i })).toBeInTheDocument();
    // It IS the disabled front door — there must be no way to sign in from here.
    expect(screen.queryByRole('button', { name: /sign in|discord/i })).not.toBeInTheDocument();
  });

  it('keeps the legal links reachable (Footer) during the gate', () => {
    render(<ComingSoon />);
    expect(screen.getByRole('link', { name: /^terms$/i })).toHaveAttribute('href', '/legal/terms');
  });
});
