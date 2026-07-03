// Router contract: the PING handshake, dispatch, the unknown-command fallback (a bot must ALWAYS
// answer within 3s), and autocomplete degrading to [] without repos.
import type { APIInteraction } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';
import { handleInteraction } from './router';
import type { BotContext } from './types';

const ctx: BotContext = {
  realize: count => Array.from({ length: count }, () => 4),
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: null,
};

const as = (value: unknown) => value as APIInteraction;

describe('handleInteraction', () => {
  it('answers PING with PONG (the endpoint-validation handshake)', async () => {
    const { response, work } = await handleInteraction(ctx, as({ type: 1 }));
    expect(response).toEqual({ type: 1 });
    expect(work).toBeUndefined();
  });

  it('dispatches a known command', async () => {
    const { response } = await handleInteraction(
      ctx,
      as({ type: 2, data: { name: 'roll', type: 1, options: [{ name: 'dice', type: 4, value: 2 }] } })
    );
    expect(response.type).toBe(4);
  });

  it('answers an unknown command ephemerally instead of timing out', async () => {
    const { response } = await handleInteraction(ctx, as({ type: 2, data: { name: 'nope', type: 1 } }));
    expect(response.type).toBe(4);
    expect((response as { data?: { flags?: number } }).data?.flags).toBe(64);
  });

  it('answers autocomplete with an empty choice list when nothing can suggest', async () => {
    const { response } = await handleInteraction(ctx, as({ type: 4, data: { name: 'roll', type: 1 } }));
    expect(response).toEqual({ type: 8, data: { choices: [] } });
    const char = await handleInteraction(
      ctx,
      as({ type: 4, data: { name: 'character', type: 1 }, user: { id: 'u1' } })
    );
    expect(char.response).toEqual({ type: 8, data: { choices: [] } });
  });

  it('answers any other interaction type ephemerally', async () => {
    const { response } = await handleInteraction(ctx, as({ type: 3, data: {} }));
    expect(response.type).toBe(4);
  });
});
