/**
 * Round 6 P1-1 — the design system's entrance animations (Card, Container, Heading, Section, …)
 * are framer-motion `initial={{ opacity: 0, … }}`, which server-renders as an INLINE
 * `style="opacity:0;transform:…"` that only animates in once JavaScript runs. With JavaScript off
 * (or blocked) every SSR'd animated element stayed invisible — /auth/signin's "Sign-in needs
 * JavaScript" message (F102) and the 404 card rendered as a blank page.
 *
 * The root layout puts this inside `<noscript><style>` in <head>: it only applies when scripting
 * is disabled, so the animations are untouched for everyone else. It matches the exact inline
 * serialisation (`opacity:0` followed by `;` or at the end — never `opacity:0.5`) and lands the
 * element at its animated end state: fully opaque, no entrance offset/scale.
 */
export const NOSCRIPT_REVEAL_CSS =
  '[style*="opacity:0;"],[style$="opacity:0"]{opacity:1!important;transform:none!important}';
