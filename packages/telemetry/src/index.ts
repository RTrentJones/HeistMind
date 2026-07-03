// @heist-mind/telemetry — HeistMind's observability seam.
//
// The app-facing API is TWO functions (`captureError`, `logEvent`) whose shapes mirror
// OpenTelemetry semantics: an exception event with attributes, and a named log/event with
// attributes. A backend (Sentry in the web app — itself OTel-based — or whatever the Discord bot
// chooses) registers via `setTelemetryBackend`; without one, errors echo to the console so local
// dev never loses a failure. Swap the vendor, keep every call site.

/** OTel-style attribute bag: primitive values keyed by dotted names (`game.id`, `roll.kind`). */
export type TelemetryAttributes = Record<string, string | number | boolean | undefined>;

export interface TelemetryBackend {
  captureError(error: unknown, attributes?: TelemetryAttributes): void;
  logEvent(name: string, attributes?: TelemetryAttributes): void;
}

let backend: TelemetryBackend | null = null;

/** Install the process's backend (call once at boot; pass null to detach, e.g. in tests). */
export function setTelemetryBackend(next: TelemetryBackend | null): void {
  backend = next;
}

/**
 * Record an exception with optional OTel-style attributes. Always also echoes to `console.error`
 * when no backend is installed — a failure must never be silently dropped.
 */
export function captureError(error: unknown, attributes?: TelemetryAttributes): void {
  if (backend) {
    backend.captureError(error, attributes);
    return;
  }
  console.error('[telemetry]', error, attributes ?? '');
}

/** Record a named event (OTel log-record shape). No-op without a backend — events are optional. */
export function logEvent(name: string, attributes?: TelemetryAttributes): void {
  backend?.logEvent(name, attributes);
}
