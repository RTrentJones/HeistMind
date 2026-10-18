// F96 — dashboard heading + first-run layout (round-3 pixel/launch review):
// - the page h1 is a dashboard title, distinct from the header's "Welcome, <name>" (the name
//   appeared twice) — and the email is never shown;
// - the subtitle waits for the lists (no Welcome/Welcome-back style flip);
// - first run leads with Start here, without the six quick actions that repeat its steps;
// - the Start here Discord step only points at an install button that actually renders.
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/lib/i18n';
import { Dashboard } from '../Dashboard';

const status = (over: Partial<{ loading: boolean; error: string | null }> = {}) => ({
  loading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
let data: Record<string, unknown> = {};
vi.mock('@/features/dashboard/hooks/use-dashboard-data', () => ({
  useDashboardData: () => data,
}));
vi.mock('@/features/auth/stores/auth-store', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'secret@example.com', profile: null } }),
}));
vi.mock('@/shared/components/AppShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/features/games/components/GameCard', () => ({ GameCard: () => null }));
vi.mock('@/features/characters/components/CharacterCard', () => ({ CharacterCard: () => null }));

const empty = (over: Record<string, unknown> = {}) => ({
  campaigns: [],
  characters: [],
  activity: [],
  campaignsStatus: status(),
  charactersStatus: status(),
  activityStatus: status(),
  ...over,
});

beforeEach(() => {
  data = empty();
});
afterEach(() => vi.unstubAllEnvs());

describe('Dashboard', () => {
  it('titles the page "Your dashboard" and never shows the email', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your dashboard');
    expect(document.body.textContent).not.toMatch(/secret@example\.com/);
    expect(document.body.textContent).not.toMatch(/welcome/i);
  });

  it('first run leads with Start here and drops the duplicate quick actions', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-start-here')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-quick-actions')).toBeNull();
    expect(screen.getByTestId('dashboard-subtitle')).toHaveTextContent(/pick any step below/i);
  });

  it('holds the subtitle and quick actions until the lists have loaded', () => {
    data = empty({ campaignsStatus: status({ loading: true }) });
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-subtitle')).toHaveTextContent('');
    expect(screen.queryByTestId('dashboard-quick-actions')).toBeNull();
    expect(screen.queryByTestId('dashboard-start-here')).toBeNull();
  });

  it('a returning user gets the quick actions and the sections, not Start here', () => {
    data = empty({
      campaigns: [{ game: { id: 'g1', name: 'Job' }, role: 'gm' }],
    });
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-quick-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-start-here')).toBeNull();
    expect(screen.getByTestId('dashboard-subtitle')).toHaveTextContent(/pick up where/i);
  });

  it('the Start here Discord step points at a button only when one renders', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '');
    const { unmount } = render(<Dashboard />);
    expect(screen.getByTestId('dashboard-start-here')).not.toHaveTextContent(/button below/i);
    unmount();
    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '123456789012345678');
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-start-here')).toHaveTextContent(/button below/i);
  });
});
