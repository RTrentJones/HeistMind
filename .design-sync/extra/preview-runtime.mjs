// design-sync preview runtime wrapper (merged into the bundle via cfg.extraEntries,
// mounted as the OUTERMOST cfg.provider around every preview card).
//
// It carries two preview-only concerns that the Storybook decorators handled for
// the reference render, so previews match the oracle. Both are scoped to preview
// cards: components imported into actual designs don't mount this wrapper and are
// unaffected (fully animated, no forced surface).
//
// 1. Settled motion. Several @heist-mind/ui components (Button, etc.) drive an
//    entrance animation with framer-motion (initial opacity:0 → animate opacity:1)
//    via the Web Animations API. The verification screenshotter emulates
//    reduced-motion and freezes the document timeline, stranding that WAAPI
//    animation at its initial (opacity:0) frame — the component captures blank
//    even though it animates in correctly live. MotionGlobalConfig.skipAnimations
//    makes framer-motion render each motion component's target state directly as
//    inline style (no WAAPI animation to strand). Set during render so it applies
//    before child motion components initialize.
//
// 2. Dark card surface. This DS is dark-themed (its CSS paints body with
//    --color-background-primary), but the preview-card chrome hard-codes a white
//    page background that wins the cascade — light text and transparent surfaces
//    then vanish. An inline style on <body> beats the card's <style> block, so we
//    paint the DS background/foreground, matching the storybook reference.
import * as React from 'react';
import { MotionGlobalConfig } from 'framer-motion';

export function PreviewRuntime(props) {
  MotionGlobalConfig.skipAnimations = true;
  React.useLayoutEffect(() => {
    const bg = 'var(--color-background-primary)';
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.body.style.color = 'var(--color-foreground-primary)';
  }, []);
  return props.children;
}
