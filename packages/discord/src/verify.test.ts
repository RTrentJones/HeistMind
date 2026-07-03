// The security boundary: a real Ed25519 round-trip (Discord signs timestamp+rawBody) plus every
// tamper direction. Verification must run over RAW bytes — the perturbed-body case is the
// regression guard against verifying a parsed/reserialized body.
import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyDiscordRequest } from './verify';

function makeApp() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  // Raw 32-byte public key = the tail of the SPKI DER (what Discord shows in the dev portal).
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const publicKeyHex = spki.subarray(spki.length - 32).toString('hex');
  const signPayload = (timestamp: string, body: string) =>
    sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');
  return { publicKeyHex, signPayload };
}

const BODY = JSON.stringify({ type: 1 });
const TS = '1719900000';

describe('verifyDiscordRequest', () => {
  it('accepts a correctly signed payload', async () => {
    const app = makeApp();
    const sig = app.signPayload(TS, BODY);
    expect(await verifyDiscordRequest(app.publicKeyHex, sig, TS, BODY)).toBe(true);
  });

  it('rejects a tampered body — including whitespace-only perturbation', async () => {
    const app = makeApp();
    const sig = app.signPayload(TS, BODY);
    expect(await verifyDiscordRequest(app.publicKeyHex, sig, TS, BODY + ' ')).toBe(false);
    expect(await verifyDiscordRequest(app.publicKeyHex, sig, TS, '{"type": 1}')).toBe(false);
  });

  it('rejects a tampered timestamp', async () => {
    const app = makeApp();
    const sig = app.signPayload(TS, BODY);
    expect(await verifyDiscordRequest(app.publicKeyHex, sig, '1719900001', BODY)).toBe(false);
  });

  it('rejects a signature from a DIFFERENT app key', async () => {
    const app = makeApp();
    const impostor = makeApp();
    const sig = impostor.signPayload(TS, BODY);
    expect(await verifyDiscordRequest(app.publicKeyHex, sig, TS, BODY)).toBe(false);
  });

  it('never throws on malformed hex inputs', async () => {
    const app = makeApp();
    expect(await verifyDiscordRequest('zz-not-hex', 'ff', TS, BODY)).toBe(false);
    expect(await verifyDiscordRequest(app.publicKeyHex, 'abc', TS, BODY)).toBe(false); // odd length
    expect(await verifyDiscordRequest('', '', TS, BODY)).toBe(false);
  });
});
