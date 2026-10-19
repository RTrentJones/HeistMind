// Heading-order check (axe `heading-order`, F94): walking the visible headings in DOM order, a
// heading may go at most ONE level deeper than the heading before it (h1 → h2 → h3; never h1 → h3).
// A dependency-free mirror of the axe rule so page specs can gate it without bundling axe-core.
import type { Locator, Page } from '@playwright/test';

export interface HeadingJump {
  from: string;
  to: string;
  text: string;
}

export async function headingOrderViolations(page: Page): Promise<HeadingJump[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      if (el.closest('[aria-hidden="true"]')) return false;
      const r = (el as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
    };
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(visible);
    const level = (el: Element) =>
      el.getAttribute('role') === 'heading'
        ? Number(el.getAttribute('aria-level') ?? 2)
        : Number(el.tagName.slice(1));
    const out: { from: string; to: string; text: string }[] = [];
    let prev = 0;
    for (const h of hs) {
      const l = level(h);
      if (prev !== 0 && l > prev + 1)
        out.push({
          from: `h${prev}`,
          to: `h${l}`,
          text: (h.textContent ?? '').trim().slice(0, 60),
        });
      prev = l;
    }
    return out;
  });
}

/** Exactly one visible h1 (the page title), never the header brand. */
export async function h1Texts(page: Page): Promise<string[]> {
  return page.locator('h1:visible').allInnerTexts();
}

/**
 * The element's EFFECTIVE opacity — its own times every ancestor's. Playwright's `toBeVisible()`
 * treats `opacity: 0` as visible, which is how F102's JS-off sign-in message passed while sitting
 * invisible inside a Card whose framer-motion entrance SSRs at `opacity: 0` (round 6 P1-1).
 */
export async function effectiveOpacity(locator: Locator): Promise<number> {
  return locator.evaluate(el => {
    let o = 1;
    for (let n: Element | null = el; n; n = n.parentElement)
      o *= Number(getComputedStyle(n).opacity);
    return o;
  });
}
