// Self-service account deletion (the /settings danger zone). The browser keeps its Supabase
// session in localStorage (plain supabase-js, no SSR cookies), so this handler can't read a
// session itself — the caller sends its access token and we verify it server-side before acting
// with the service role. Deleting the auth user cascades through profiles → games / characters /
// rulesets / rolls (ON DELETE CASCADE chains from migrations 00001/00002).
//
// SECURITY: the service-role key bypasses RLS. The only action this route ever takes is deleting
// the VERIFIED caller's own auth user — no request-supplied ids are trusted.
import { createClient } from '@supabase/supabase-js';
import { captureError } from '@heist-mind/telemetry';

// Node runtime (service-role Supabase client).
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    // Creds-guarded like /api/discord: deployments without the service key answer "not
    // configured" instead of erroring.
    return new Response('Account deletion is not configured', { status: 503 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    captureError(deleteError, { 'error.surface': 'account.delete' });
    return new Response('Account deletion failed', { status: 500 });
  }

  return new Response(null, { status: 204 });
}
