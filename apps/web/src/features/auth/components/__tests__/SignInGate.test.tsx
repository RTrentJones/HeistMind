import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getAuthService } from '@/lib/auth';
import '@/lib/i18n';
import { SignInGate } from '../SignInGate';

describe('SignInGate', () => {
  it('renders the default heading, page prompt, and a working sign-in button', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(getAuthService).mockReturnValue({
      signInWithOAuth,
      onAuthStateChange: vi.fn(),
      getCurrentSession: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof getAuthService>);

    render(<SignInGate prompt='Sign in to view your characters.' />);

    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.getByText('Sign in to view your characters.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Sign In with Discord/i }));
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'discord' });
  });

  it('uses a page-specific heading when given one', () => {
    render(<SignInGate heading='Your campaigns' prompt='Sign in to see them.' />);
    expect(screen.getByText('Your campaigns')).toBeInTheDocument();
  });
});
