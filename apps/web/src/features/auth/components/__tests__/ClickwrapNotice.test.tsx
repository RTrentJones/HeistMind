import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { ClickwrapNotice } from '../ClickwrapNotice';

describe('ClickwrapNotice', () => {
  it('states the agreement and links both documents', () => {
    render(<ClickwrapNotice />);

    expect(screen.getByText(/By signing in, you agree to the/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/legal/terms'
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/legal/privacy'
    );
  });
});
