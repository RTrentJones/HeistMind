// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The transport hands the bot a BotContext; its siteUrl is what every bot link (sheet, campaign,
// /heist link) is built from. Before F101 it fell back to http://localhost:3000 whenever SITE_URL
// was unset, so a deployment missing that env var posted localhost links into Discord.

const handleInteraction = vi.fn();

vi.mock('@heist-mind/discord', () => ({
  handleInteraction: (...args: unknown[]) => handleInteraction(...args),
  makeChannelParentFetcher: () => null,
  makeFollowUpClient: () => ({}),
  realizeD6: () => 1,
  verifyDiscordRequest: async () => true,
}));
vi.mock('@/lib/auth/service-repositories', () => ({ createServiceRepositories: () => null }));
vi.mock('next/server', () => ({ after: () => {} }));

async function siteUrlFor(env: Record<string, string | undefined>): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('DISCORD_PUBLIC_KEY', 'test-key');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  handleInteraction.mockResolvedValue({ response: { type: 1 } });

  const { POST } = await import('../route');
  const res = await POST(
    new Request('https://example.test/api/discord', {
      method: 'POST',
      headers: { 'x-signature-ed25519': 'sig', 'x-signature-timestamp': '1' },
      body: JSON.stringify({ type: 1, application_id: 'app', token: 'tok' }),
    })
  );
  expect(res.status).toBe(200);
  const ctx = handleInteraction.mock.calls.at(-1)?.[0] as { siteUrl: string };
  return ctx.siteUrl;
}

describe('POST /api/discord — bot site URL', () => {
  beforeEach(() => handleInteraction.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  // Clear every input the resolver reads so the host's env can't leak into a case.
  const clean = {
    SITE_URL: undefined,
    VERCEL_ENV: undefined,
    NEXT_PUBLIC_VERCEL_ENV: undefined,
    VERCEL_URL: undefined,
    PORT: undefined,
  };

  it('uses SITE_URL when set', async () => {
    expect(
      await siteUrlFor({
        ...clean,
        SITE_URL: 'https://beta.heistmind.rtrentjones.dev',
        VERCEL_ENV: 'preview',
      })
    ).toBe('https://beta.heistmind.rtrentjones.dev');
  });

  it('is the canonical origin on production without SITE_URL (never localhost)', async () => {
    expect(
      await siteUrlFor({
        ...clean,
        VERCEL_ENV: 'production',
        VERCEL_URL: 'heist-mind-x.vercel.app',
      })
    ).toBe('https://www.heistmind.com');
  });

  it("is the deployment's own URL on a preview without SITE_URL (never localhost)", async () => {
    expect(
      await siteUrlFor({ ...clean, VERCEL_ENV: 'preview', VERCEL_URL: 'heist-mind-x.vercel.app' })
    ).toBe('https://heist-mind-x.vercel.app');
  });
});
