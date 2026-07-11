// F76 — automated axe pass over EVERY story in the CI smoke (the a11y addon panel is dev-only;
// this is what actually gates). Stories render as fragments inside the Storybook root, so the
// page-level rules (landmarks / heading hierarchy / region) are off — they judge the harness,
// not the component. Everything else in the WCAG 2.x A/AA rule set runs as-is, color-contrast
// included: a story that fails here ships an inaccessible component, and the job should go red.
import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page) {
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        rules: {
          // Fragment-vs-page rules: stories are components, not documents.
          region: { enabled: false },
          'landmark-one-main': { enabled: false },
          'page-has-heading-one': { enabled: false },
          bypass: { enabled: false },
          // color-contrast GATES (F87 fixed it): fg-variant tokens for accents-as-text, the
          // stale ThemeProvider inline-style injection removed, and the opacity pulses tamed.
        },
      },
    });
  },
};

export default config;
