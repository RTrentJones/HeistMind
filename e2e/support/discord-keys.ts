// A LOCAL Ed25519 keypair for the Discord endpoint spec: playwright.config generates it and
// injects the public key into the managed dev server's env; the spec reads the same file to
// sign its POSTs. File-based because the config and the worker processes don't share memory.
// Only meaningful for the locally-managed server — deployed targets hold the real app key we
// can't sign for, so the spec skips there.
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KEYS_PATH = resolve(__dirname, '../.discord-test-keys.json');

export interface DiscordTestKeys {
  publicKeyHex: string;
  privateKeyPem: string;
}

/** Generate (once) and return the local test keypair. Called by playwright.config. */
export function ensureDiscordTestKeys(): DiscordTestKeys {
  if (existsSync(KEYS_PATH)) {
    return JSON.parse(readFileSync(KEYS_PATH, 'utf8')) as DiscordTestKeys;
  }
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const keys: DiscordTestKeys = {
    publicKeyHex: spki.subarray(spki.length - 32).toString('hex'),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
  return keys;
}

/** The keys, if this run generated them (i.e. we manage the server); null against a deploy. */
export function loadDiscordTestKeys(): DiscordTestKeys | null {
  return existsSync(KEYS_PATH)
    ? (JSON.parse(readFileSync(KEYS_PATH, 'utf8')) as DiscordTestKeys)
    : null;
}

/** Sign an interaction body the way Discord does: Ed25519 over `timestamp + rawBody`. */
export function signInteraction(
  keys: DiscordTestKeys,
  timestamp: string,
  rawBody: string
): string {
  const privateKey = createPrivateKey(keys.privateKeyPem);
  return sign(null, Buffer.from(timestamp + rawBody), privateKey).toString('hex');
}
