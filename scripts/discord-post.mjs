#!/usr/bin/env node
// Local Discord-interaction harness: signs an interaction payload with a LOCAL Ed25519 keypair
// and POSTs it to the dev server — the whole iteration loop with no tunnel and no real Discord
// app. First run generates `.discord-dev-keys.json` (gitignored) and prints the public key to
// put in `.env.local` as DISCORD_PUBLIC_KEY.
//
// Usage:
//   node scripts/discord-post.mjs ping
//   node scripts/discord-post.mjs roll --dice 3 --position risky --effect standard
//   node scripts/discord-post.mjs resist --dice 2
//   node scripts/discord-post.mjs dice --notation 4d8+2
//   node scripts/discord-post.mjs heist about
//   node scripts/discord-post.mjs forged            (tampered signature → expect 401)
//   URL=https://beta.example/api/discord node scripts/discord-post.mjs ping   (never prod!)
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const KEYS_FILE = new URL('../.discord-dev-keys.json', import.meta.url);
const URL_TARGET = process.env.URL ?? 'http://localhost:3000/api/discord';

function loadKeys() {
  if (existsSync(KEYS_FILE)) return JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const keys = {
    publicKeyHex: spki.subarray(spki.length - 32).toString('hex'),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
  console.log('Generated .discord-dev-keys.json — add to .env.local:');
  console.log(`  DISCORD_PUBLIC_KEY=${keys.publicKeyHex}\n`);
  return keys;
}

function buildInteraction(command, args) {
  if (command === 'ping' || command === 'forged') return { type: 1 };
  const options = [];
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]?.replace(/^--/, '');
    const raw = args[i + 1];
    if (!name || raw === undefined) continue;
    const numeric = /^\d+$/.test(raw);
    options.push({ name, type: numeric ? 4 : 3, value: numeric ? parseInt(raw, 10) : raw });
  }
  // `heist about` style: a bare subcommand word becomes the subcommand wrapper.
  if (args.length === 1 && !args[0].startsWith('--')) {
    return { type: 2, data: { name: command, type: 1, options: [{ name: args[0], type: 1, options: [] }] } };
  }
  return { type: 2, data: { name: command, type: 1, options } };
}

const [, , command, ...args] = process.argv;
if (!command) {
  console.error('Usage: node scripts/discord-post.mjs <ping|roll|resist|fortune|dice|heist|forged> [--opt value ...]');
  process.exit(1);
}

const keys = loadKeys();
const body = JSON.stringify(buildInteraction(command, args));
const timestamp = Math.floor(Date.now() / 1000).toString();
const privateKey = createPrivateKey(keys.privateKeyPem);
let signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');
if (command === 'forged') signature = signature.replace(/^../, '00'); // corrupt it

const response = await fetch(URL_TARGET, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-signature-ed25519': signature,
    'x-signature-timestamp': timestamp,
  },
  body,
});
console.log(`HTTP ${response.status}`);
const text = await response.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
