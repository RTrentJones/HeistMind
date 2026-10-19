// Round 4 P2-N2 — sign-in buttons that paint from SSR work BEFORE hydration: they are submit
// buttons in a real GET form to /auth/signin (the no-JS path), and once hydrated the form's submit
// is intercepted and the Discord OAuth starts in place, exactly as the old onClick did.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@heist-mind/ui';
import { getAuthService } from '@/lib/auth';
import '@/lib/i18n';
import { SIGN_IN_PATH, SignInForm } from '../SignInForm';

describe('SignInForm', () => {
  it('is a real GET form to /auth/signin carrying a validated next (works without JS)', () => {
    const { container } = render(
      <SignInForm next='/games/new'>
        <Button type='submit'>Sign Up with Discord</Button>
      </SignInForm>
    );
    const form = container.querySelector('form');
    expect(form?.getAttribute('action')).toBe(SIGN_IN_PATH);
    expect(form?.getAttribute('method')).toBe('get');
    expect(container.querySelector('input[name="next"]')?.getAttribute('value')).toBe('/games/new');
    expect(screen.getByRole('button', { name: 'Sign Up with Discord' })).toHaveAttribute(
      'type',
      'submit'
    );
  });

  it('drops an unsafe next (no open redirect through the form)', () => {
    const { container } = render(
      <SignInForm next='https://evil.example/'>
        <Button type='submit'>Sign in</Button>
      </SignInForm>
    );
    expect(container.querySelector('input[name="next"]')).toBeNull();
  });

  it('once hydrated, a click starts the Discord OAuth in place (no navigation)', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(getAuthService).mockReturnValue({
      signInWithOAuth,
      onAuthStateChange: vi.fn(),
      getCurrentSession: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof getAuthService>);
    render(
      <SignInForm next='/games#join'>
        <Button type='submit'>Join a campaign</Button>
      </SignInForm>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Join a campaign' }));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'discord',
      options: { redirectTo: expect.stringContaining('next=%2Fgames%23join') },
    });
  });
});
