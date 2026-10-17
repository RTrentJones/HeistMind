import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthService } from '@/lib/auth';
import '@/lib/i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { SignInGate } from '../SignInGate';

describe('SignInGate', () => {
  beforeEach(() => {
    useAuthStore.setState({ hasHydrated: true });
  });

  it('holds a spinner (not a sign-in prompt) until the persisted auth hint has hydrated', () => {
    useAuthStore.setState({ hasHydrated: false });
    render(<SignInGate prompt='Sign in to view your characters.' />);
    expect(screen.queryByText('Sign in to continue')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign In with Discord/i })).not.toBeInTheDocument();
  });

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
    // F94 — the gate returns to the gated page (usePathname is '/' in the test shim).
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'discord',
      options: { redirectTo: expect.stringContaining('/auth/callback?provider=discord&next=%2F') },
    });
  });

  it('carries an explicit return path through sign-in', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(getAuthService).mockReturnValue({
      signInWithOAuth,
      onAuthStateChange: vi.fn(),
      getCurrentSession: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof getAuthService>);

    render(<SignInGate prompt='Join the campaign.' next='/join/AB12CD34' />);
    await userEvent.click(screen.getByRole('button', { name: /Sign In with Discord/i }));
    const redirectTo = new URL(signInWithOAuth.mock.calls[0]?.[0].options.redirectTo);
    expect(redirectTo.searchParams.get('next')).toBe('/join/AB12CD34');
    expect(sessionStorage.getItem('heistmind.auth.next')).toBe('/join/AB12CD34');
  });

  it('uses a page-specific heading when given one', () => {
    render(<SignInGate heading='Your campaigns' prompt='Sign in to see them.' />);
    expect(screen.getByText('Your campaigns')).toBeInTheDocument();
  });
});
