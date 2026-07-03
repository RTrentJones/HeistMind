// Router contract: the PING handshake, dispatch, the unknown-command fallback (a bot must ALWAYS
// answer within 3s), and the Phase-0 autocomplete stub.
import type { APIInteraction } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';
import { handleInteraction } from './router';
import type { BotContext } from './types';

const ctx: BotContext = {
  realize: count => Array.from({ length: count }, () => 4),
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
};

const as = (value: unknown) => value as APIInteraction;

describe('handleInteraction', () => {
  it('answers PING with PONG (the endpoint-validation handshake)', async () => {
    expect(await handleInteraction(ctx, as({ type: 1 }))).toEqual({ type: 1 });
  });

  it('dispatches a known command', async () => {
    const res = await handleInteraction(
      ctx,
      as({ type: 2, data: { name: 'roll', type: 1, options: [{ name: 'dice', type: 4, value: 2 }] } })
    );
    expect(res.type).toBe(4);
  });

  it('answers an unknown command ephemerally instead of timing out', async () => {
    const res = await handleInteraction(ctx, as({ type: 2, data: { name: 'nope', type: 1 } }));
    expect(res.type).toBe(4);
    expect((res as { data?: { flags?: number } }).data?.flags).toBe(64);
  });

  it('answers autocomplete with an empty choice list (Phase 1 wires real suggestions)', async () => {
    const res = await handleInteraction(ctx, as({ type: 4, data: { name: 'roll', type: 1 } }));
    expect(res).toEqual({ type: 8, data: { choices: [] } });
  });

  it('answers any other interaction type ephemerally', async () => {
    const res = await handleInteraction(ctx, as({ type: 3, data: {} }));
    expect(res.type).toBe(4);
  });
});
