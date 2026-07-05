import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Profile } from '@heist-mind/core';
import { useAuthStore, type AuthUser } from '@/features/auth/stores/auth-store';
import { deleteAccount } from '@/features/profiles/data/api';
import '@/lib/i18n';
import { AccountSettings } from '../AccountSettings';

vi.mock('@/features/profiles/data/api', () => ({
  deleteAccount: vi.fn(),
}));

const signedIn = () => {
  useAuthStore.setState({
    user: { id: 'u1', email: 'silks@example.com' } as unknown as AuthUser,
    profile: { id: 'u1', displayName: 'Silks', username: 'silks' } as unknown as Profile,
    isAuthenticated: true,
    sessionChecked: true,
  });
};

beforeEach(() => {
  vi.mocked(deleteAccount).mockReset();
  signedIn();
});

describe('AccountSettings', () => {
  it('shows who is signed in and keeps the delete button disabled by default', () => {
    render(<AccountSettings />);

    expect(screen.getByText(/Signed in as Silks/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeDisabled();
  });

  it('only the exact confirm word arms the delete button', async () => {
    render(<AccountSettings />);
    const input = screen.getByLabelText(/Type DELETE to confirm/);
    const button = screen.getByRole('button', { name: 'Delete my account' });

    await userEvent.type(input, 'delete');
    expect(button).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, 'DELETE');
    expect(button).toBeEnabled();
  });

  it('deletes on confirm and surfaces a failure inline', async () => {
    vi.mocked(deleteAccount).mockRejectedValue(new Error('Account deletion failed (500).'));
    render(<AccountSettings />);

    await userEvent.type(screen.getByLabelText(/Type DELETE to confirm/), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByText('Account deletion failed (500).')).toBeInTheDocument()
    );
  });
});
