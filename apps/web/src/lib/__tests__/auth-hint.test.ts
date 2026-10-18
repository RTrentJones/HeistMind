import { afterEach, describe, expect, it } from 'vitest';
import { applyAuthAttribute, authHintInitScript, hasAuthHint } from '../auth-hint';

/** A minimal Storage over a plain map (what the inline script and hasAuthHint both read). */
function storage(entries: Record<string, string>): Storage {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => entries[k] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  };
}

/** Run the inline script against `entries` and report whether it marked <html data-auth="in">. */
function runScript(entries: Record<string, string>): boolean {
  document.documentElement.removeAttribute('data-auth');
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage(entries) });
  try {
    new Function(authHintInitScript())();
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original);
  }
  return document.documentElement.getAttribute('data-auth') === 'in';
}

const CASES: Array<[string, Record<string, string>, boolean]> = [
  ['empty storage', {}, false],
  [
    'a persisted signed-in hint',
    { 'auth-store': '{"state":{"isAuthenticated":true},"version":1}' },
    true,
  ],
  ['a persisted signed-OUT hint', { 'auth-store': '{"state":{"isAuthenticated":false}}' }, false],
  ['a Supabase session key, no hint', { 'sb-127-auth-token': '{"access_token":"x"}' }, true],
  ['an unrelated sb- key', { 'sb-127-something': 'x' }, false],
  ['malformed JSON', { 'auth-store': '{nope' }, false],
  ['the theme key only', { 'heistmind-theme': 'light' }, false],
];

describe('auth hint (F98)', () => {
  afterEach(() => document.documentElement.removeAttribute('data-auth'));

  it.each(CASES)('%s → hasAuthHint and the inline script agree', (_label, entries, expected) => {
    expect(hasAuthHint(storage(entries))).toBe(expected);
    expect(runScript(entries)).toBe(expected);
  });

  it('treats missing/blocked storage as signed out', () => {
    expect(hasAuthHint(null)).toBe(false);
    const throwing = {
      length: 1,
      key: () => {
        throw new Error('blocked');
      },
      getItem: () => null,
    };
    expect(hasAuthHint(throwing)).toBe(false);
  });

  it('applyAuthAttribute mirrors the store onto <html>', () => {
    applyAuthAttribute(true);
    expect(document.documentElement.getAttribute('data-auth')).toBe('in');
    applyAuthAttribute(false);
    expect(document.documentElement.hasAttribute('data-auth')).toBe(false);
  });
});
