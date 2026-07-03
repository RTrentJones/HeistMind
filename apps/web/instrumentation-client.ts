// Next.js client instrumentation: runs before the app hydrates in the browser. Installs the
// telemetry backend behind the @heist-mind/telemetry seam — Sentry when a DSN is configured
// (creds-guarded: previews/CI/local run without secrets and fall back to console echoes).
import * as Sentry from '@sentry/nextjs';
import { setTelemetryBackend } from '@heist-mind/telemetry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, replaysOnErrorSampleRate: 0 });
  setTelemetryBackend({
    captureError: (error, attributes) => {
      Sentry.captureException(error, { extra: attributes });
    },
    logEvent: (name, attributes) => {
      Sentry.addBreadcrumb({ category: 'app', message: name, data: attributes });
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
