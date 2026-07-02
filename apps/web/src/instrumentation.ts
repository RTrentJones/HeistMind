// Next.js server instrumentation: runs once per server boot (nodejs + edge runtimes).
import * as Sentry from '@sentry/nextjs';
import { assertRequiredEnv } from '@/lib/env';

export async function register(): Promise<void> {
  // Fail fast, by name, on missing configuration.
  assertRequiredEnv();

  // Error reporting is CREDS-GUARDED: without a DSN this is a clean no-op, so CI, previews, and
  // local dev need no Sentry secrets. Sentry's SDK is OpenTelemetry-based — spans/logs it emits
  // are OTel-compatible, matching the @heist-mind/telemetry seam's contract.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export const onRequestError = Sentry.captureRequestError;
