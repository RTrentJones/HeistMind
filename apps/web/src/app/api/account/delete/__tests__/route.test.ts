import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

// The route talks straight to @supabase/supabase-js with the service role — mock the client
// factory, not the network. vi.hoisted so the mock fns are visible inside the factory.
const { getUser, deleteUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser, admin: { deleteUser } } })),
}));

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/account/delete', { method: 'POST', headers });

beforeEach(() => {
  getUser.mockReset();
  deleteUser.mockReset();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/account/delete', () => {
  it('503s when the service-role key is not configured (creds-guarded)', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await POST(request({ Authorization: 'Bearer jwt' }));
    expect(res.status).toBe(503);
  });

  it('401s without an Authorization header', async () => {
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('401s when the token does not verify to a user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await POST(request({ Authorization: 'Bearer forged' }));
    expect(res.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes exactly the verified caller's own user and answers 204", async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    deleteUser.mockResolvedValue({ error: null });

    const res = await POST(request({ Authorization: 'Bearer jwt' }));

    expect(res.status).toBe(204);
    expect(getUser).toHaveBeenCalledWith('jwt');
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('500s when the admin delete fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    deleteUser.mockResolvedValue({ error: { message: 'boom' } });

    const res = await POST(request({ Authorization: 'Bearer jwt' }));
    expect(res.status).toBe(500);
  });
});
