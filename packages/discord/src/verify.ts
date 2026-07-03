// Discord request authentication: every interaction POST is signed with the application's
// Ed25519 key. Verification MUST run over the RAW body bytes (timestamp + body, exactly as
// received) BEFORE any JSON.parse — a parsed-then-reserialized body would verify nothing.
// Web Crypto (Node 20 native) keeps the verifier portable to any runtime.
import { webcrypto } from 'node:crypto';

const encoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verify Discord's `X-Signature-Ed25519` / `X-Signature-Timestamp` headers against the raw
 * request body. Returns false (never throws) on any malformed input — the caller replies 401.
 */
export async function verifyDiscordRequest(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string
): Promise<boolean> {
  const publicKey = hexToBytes(publicKeyHex);
  const signature = hexToBytes(signatureHex);
  if (!publicKey || !signature || publicKey.length !== 32 || signature.length !== 64) {
    return false;
  }
  try {
    const key = await webcrypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, [
      'verify',
    ]);
    return await webcrypto.subtle.verify(
      'Ed25519',
      key,
      signature,
      encoder.encode(timestamp + rawBody)
    );
  } catch {
    return false;
  }
}
