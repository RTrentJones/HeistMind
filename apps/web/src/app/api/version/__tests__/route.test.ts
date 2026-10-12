import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

const SHA = '0123456789abcdef0123456789abcdef01234567';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/version', () => {
  it('serves the deployed commit sha, uncached', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', SHA);
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ sha: SHA });
  });

  it('reports null when built without a commit sha', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    expect(await GET().json()).toEqual({ sha: null });
  });
});
