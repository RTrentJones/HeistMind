import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock the auth module (Supabase client + the data seam's repository accessor). Tests configure
// `vi.mocked(getRepositories).mockReturnValue(...)` with just the repos they exercise.
vi.mock('@/lib/auth', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
  getRepositories: vi.fn(),
  // Benign default: the auth store registers a listener + schedules a session check AT IMPORT
  // TIME (see auth-store.ts), so any component test that touches useAuth needs these to exist.
  getAuthService: vi.fn(() => ({
    onAuthStateChange: vi.fn(),
    getCurrentSession: vi.fn().mockResolvedValue(null),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  })),
  initializeAuth: vi.fn(),
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
