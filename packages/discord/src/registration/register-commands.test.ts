// The registration seam: creds-guard skip, the bulk-PUT shape Discord expects, and failure
// surfacing — with fetch stubbed (no network).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_MANIFEST } from '../commands/manifest';
import { registerCommands } from './register-commands';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('registerCommands', () => {
  it('skips cleanly when credentials are absent (secret-less runs/forks)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await registerCommands({ appId: undefined, botToken: undefined })).toBe('skipped');
    expect(await registerCommands({ appId: 'app', botToken: undefined })).toBe('skipped');
  });

  it('bulk-PUTs the manifest with the bot authorization', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await registerCommands({
      appId: 'app123',
      botToken: 'token456',
      apiBase: 'https://discord.test/api/v10',
    });

    expect(outcome).toBe('registered');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.test/api/v10/applications/app123/commands',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ authorization: 'Bot token456' }),
        body: JSON.stringify(COMMAND_MANIFEST),
      })
    );
  });

  it('surfaces a rejected registration as failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('bad') })
    );
    expect(await registerCommands({ appId: 'app', botToken: 'token' })).toBe('failed');
  });
});
