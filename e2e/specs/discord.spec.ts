// Bot phase 0 — the /api/discord interactions endpoint, driven with REAL signed requests (the
// BRD Phase-4 verification: a signed POST is served, a forged one is rejected). Runs only
// against the locally-managed dev server, whose env got our test public key from
// playwright.config; deployed targets hold the real Discord app key we can't sign for.
import { test, expect } from '@playwright/test';
import { loadDiscordTestKeys, signInteraction } from '../support/discord-keys';

const keys = loadDiscordTestKeys();
const localServer =
  !process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://localhost') ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://127.0.0.1');

function signed(body: unknown) {
  if (!keys) throw new Error('test keys missing');
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    data: raw,
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': signInteraction(keys, timestamp, raw),
      'x-signature-timestamp': timestamp,
    },
  };
}

test.describe('Discord interactions endpoint', () => {
  test.beforeEach(() => {
    test.skip(!keys || !localServer, 'Needs the locally-managed dev server + test keypair.');
  });

  test('answers the PING handshake with PONG', async ({ request }) => {
    const response = await request.post('/api/discord', signed({ type: 1 }));
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });
  });

  test('rejects a forged signature with 401', async ({ request }) => {
    const { data, headers } = signed({ type: 1 });
    const response = await request.post('/api/discord', {
      data,
      headers: { ...headers, 'x-signature-ed25519': '00'.repeat(64) },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects a tampered body with 401 (signature covers raw bytes)', async ({ request }) => {
    const { data, headers } = signed({ type: 1 });
    const response = await request.post('/api/discord', { data: `${data} `, headers });
    expect(response.status()).toBe(401);
  });

  test('/roll answers inline with a classified FitD embed', async ({ request }) => {
    const response = await request.post(
      '/api/discord',
      signed({
        type: 2,
        data: { name: 'roll', type: 1, options: [{ name: 'dice', type: 4, value: 3 }] },
      })
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      type: number;
      data: { embeds: { title: string; fields?: { name: string; value: string }[] }[] };
    };
    expect(body.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE — inline, no defer needed
    expect(body.data.embeds[0]?.title).toBe('Action roll — 3d');
    expect(body.data.embeds[0]?.fields?.[0]?.name).toBe('Outcome');
  });
});
