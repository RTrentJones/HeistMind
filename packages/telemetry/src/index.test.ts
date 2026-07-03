import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureError, logEvent, setTelemetryBackend, type TelemetryBackend } from './index';

afterEach(() => setTelemetryBackend(null));

describe('telemetry seam', () => {
  it('routes captures and events to the installed backend', () => {
    const backend: TelemetryBackend = { captureError: vi.fn(), logEvent: vi.fn() };
    setTelemetryBackend(backend);

    const boom = new Error('boom');
    captureError(boom, { 'game.id': 'g1' });
    logEvent('score.started', { 'score.id': 's1' });

    expect(backend.captureError).toHaveBeenCalledWith(boom, { 'game.id': 'g1' });
    expect(backend.logEvent).toHaveBeenCalledWith('score.started', { 'score.id': 's1' });
  });

  it('falls back to console.error for captures without a backend (never silent)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureError(new Error('lost?'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('drops events without a backend (events are optional)', () => {
    expect(() => logEvent('noop')).not.toThrow();
  });
});
