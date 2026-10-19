// Round 6 P1-1 — the no-JS reveal must match framer-motion's SSR entrance styles (and only those).
import { describe, expect, it } from 'vitest';
import { NOSCRIPT_REVEAL_CSS } from '../noscript-reveal';

const selector = NOSCRIPT_REVEAL_CSS.slice(0, NOSCRIPT_REVEAL_CSS.indexOf('{'));
const matches = (style: string) => {
  const el = document.createElement('div');
  el.setAttribute('style', style);
  return el.matches(selector);
};

describe('NOSCRIPT_REVEAL_CSS', () => {
  it('matches the SSR entrance styles (opacity 0, with or without a transform)', () => {
    expect(matches('opacity:0;transform:translateY(20px)')).toBe(true);
    expect(matches('opacity:0')).toBe(true);
  });

  it('leaves partial opacity and unrelated inline styles alone', () => {
    expect(matches('opacity:0.5')).toBe(false);
    expect(matches('transform:translateY(20px)')).toBe(false);
    expect(matches('position:fixed;bottom:0')).toBe(false);
  });

  it('lands the element at its end state: opaque, no offset', () => {
    expect(NOSCRIPT_REVEAL_CSS).toContain('opacity:1!important');
    expect(NOSCRIPT_REVEAL_CSS).toContain('transform:none!important');
  });
});
