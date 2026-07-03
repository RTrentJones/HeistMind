// Handler behavior spec: pure interaction→response functions driven by a fake context with
// SCRIPTED dice (ctx.realize is the injection seam — same philosophy as the engine's
// caller-realized dice).
import type {
  APIApplicationCommandInteraction,
  APIEmbed,
  APIInteractionResponse,
} from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';
import type { BotContext } from '../types';
import { handleRoll } from './roll';
import { handleResist } from './resist';
import { handleFortune } from './fortune';
import { makeDiceHandler, parseNotation } from './dice';
import { handleHeist } from './heist';

const ctx = (faces: number[]): BotContext => ({
  realize: (count: number) => faces.slice(0, count),
  deploySha: 'abc1234',
  siteUrl: 'https://heistmind.example',
});

type Option = { name: string; type: number; value?: unknown; options?: Option[] };
const cmd = (name: string, options: Option[] = []): APIApplicationCommandInteraction =>
  ({ type: 2, data: { name, type: 1, options } }) as unknown as APIApplicationCommandInteraction;

const int = (name: string, value: number): Option => ({ name, type: 4, value });
const str = (name: string, value: string): Option => ({ name, type: 3, value });

function embedOf(response: APIInteractionResponse): APIEmbed {
  const data = (response as { data?: { embeds?: APIEmbed[] } }).data;
  const embed = data?.embeds?.[0];
  if (!embed) throw new Error('expected an embed response');
  return embed;
}

function isEphemeral(response: APIInteractionResponse): boolean {
  const data = (response as { data?: { flags?: number } }).data;
  return ((data?.flags ?? 0) & 64) !== 0;
}

describe('/roll', () => {
  it('rolls the pool and classifies the outcome (6 = full success)', async () => {
    const res = await handleRoll(ctx([6, 4, 2]), cmd('roll', [int('dice', 3)]));
    const embed = embedOf(res);
    expect(embed.title).toBe('Action roll — 3d');
    expect(embed.description).toContain('[6, 4, 2]');
    expect(embed.fields?.[0]?.value).toBe('Full success');
  });

  it('0d rolls two dice and takes the LOWEST — never a crit', async () => {
    const res = await handleRoll(ctx([6, 6]), cmd('roll', [int('dice', 0)]));
    const embed = embedOf(res);
    expect(embed.title).toContain('take lowest');
    // Two sixes on a zero-dice roll is a plain success, not a critical (FitD rule).
    expect(embed.fields?.[0]?.value).toBe('Full success');
  });

  it('carries position/effect and the note into the embed', async () => {
    const res = await handleRoll(
      ctx([3]),
      cmd('roll', [int('dice', 1), str('position', 'risky'), str('effect', 'standard'), str('note', 'cross the rooftops')])
    );
    const embed = embedOf(res);
    expect(embed.description).toContain('risky / standard');
    expect(embed.description).toContain('cross the rooftops');
  });
});

describe('/resist', () => {
  it('charges 6 − highest die', async () => {
    const res = await handleResist(ctx([4, 2]), cmd('resist', [int('dice', 2)]));
    expect(embedOf(res).description).toContain('mark **2 stress**');
  });

  it('a critical (two 6s) clears 1 stress', async () => {
    const res = await handleResist(ctx([6, 6]), cmd('resist', [int('dice', 2)]));
    expect(embedOf(res).description).toContain('clear 1 stress');
  });

  it('a single 6 resists for free', async () => {
    const res = await handleResist(ctx([6, 1]), cmd('resist', [int('dice', 2)]));
    expect(embedOf(res).description).toContain('0 stress');
  });
});

describe('/fortune', () => {
  it('rolls and classifies without stakes', async () => {
    const res = await handleFortune(ctx([5, 5]), cmd('fortune', [int('dice', 2)]));
    expect(embedOf(res).title).toBe('Fortune roll — 2d');
    expect(embedOf(res).fields?.[0]?.value).toBe('Partial success');
  });
});

describe('/dice', () => {
  const handler = makeDiceHandler((count, _sides) => Array.from({ length: count }, () => 3));

  it('parses NdM±k and totals with the modifier', async () => {
    const res = await handler(ctx([]), cmd('dice', [str('notation', '4d8+2')]));
    const embed = embedOf(res);
    expect(embed.description).toContain('[3, 3, 3, 3]');
    expect(embed.description).toContain('Total: **14**');
  });

  it('rejects malformed or out-of-bounds notation ephemerally', async () => {
    const res = await handler(ctx([]), cmd('dice', [str('notation', 'banana')]));
    expect(isEphemeral(res)).toBe(true);
    expect(parseNotation('101d6')).toBeNull();
    expect(parseNotation('2d1001')).toBeNull();
    expect(parseNotation('0d6')).toBeNull();
    expect(parseNotation('1d1')).toBeNull();
    expect(parseNotation('2d6-1')).toEqual({ count: 2, sides: 6, modifier: -1 });
  });
});

describe('/heist about', () => {
  it('replies ephemerally with the deployed SHA and site link', async () => {
    const res = await handleHeist(
      ctx([]),
      cmd('heist', [{ name: 'about', type: 1, options: [] }])
    );
    expect(isEphemeral(res)).toBe(true);
    const embed = embedOf(res);
    expect(embed.description).toContain('abc1234');
    expect(embed.description).toContain('https://heistmind.example');
  });
});
