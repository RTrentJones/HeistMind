// The Discord interactions endpoint — the transport for @heist-mind/discord (BRD Phase 4).
// Discord POSTs every slash command here, Ed25519-signed. The signature MUST verify over the
// RAW body bytes before any parse; failures answer 401 (Discord probes with forged requests
// when the endpoint URL is saved). Creds-guarded: without DISCORD_PUBLIC_KEY the route answers
// 503 and the deployment is otherwise unaffected.
import {
  handleInteraction,
  realizeD6,
  verifyDiscordRequest,
  type APIInteraction,
  type BotContext,
} from '@heist-mind/discord';

// Node runtime (webcrypto Ed25519 + later the service-role Supabase client).
export const runtime = 'nodejs';

function buildContext(): BotContext {
  return {
    realize: realizeD6,
    deploySha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    siteUrl: process.env.SITE_URL ?? 'http://localhost:3000',
  };
}

export async function POST(request: Request): Promise<Response> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return new Response('Discord integration is not configured', { status: 503 });
  }

  const signature = request.headers.get('x-signature-ed25519') ?? '';
  const timestamp = request.headers.get('x-signature-timestamp') ?? '';
  const rawBody = await request.text();

  if (!(await verifyDiscordRequest(publicKey, signature, timestamp, rawBody))) {
    return new Response('invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as APIInteraction;
  const response = await handleInteraction(buildContext(), interaction);
  return Response.json(response);
}
