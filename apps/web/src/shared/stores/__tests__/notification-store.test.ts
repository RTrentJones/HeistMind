// The notification store's queue semantics: add/remove/clear, the typed helpers, and the
// auto-dismiss timer (errors are persistent and stay until dismissed).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from '../notification-store';

const store = () => useNotificationStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  useNotificationStore.setState({ notifications: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('add / remove / clear', () => {
  it('appends with a generated id and the 5s default duration', () => {
    store().add({ type: 'info', title: 'Saved' });

    const [n] = store().notifications;
    expect(n?.id).toBeTruthy();
    expect(n).toMatchObject({ type: 'info', title: 'Saved', duration: 5000 });
  });

  it('auto-removes a non-persistent notification after its duration', () => {
    store().add({ type: 'success', title: 'Saved', duration: 1000 });
    expect(store().notifications).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(store().notifications).toHaveLength(0);
  });

  it('keeps a persistent notification past its duration', () => {
    store().add({ type: 'error', title: 'Failed', persistent: true });

    vi.advanceTimersByTime(10_000);

    expect(store().notifications).toHaveLength(1);
  });

  it('remove drops only the matching id; clear empties the queue', () => {
    store().add({ type: 'info', title: 'One', persistent: true });
    store().add({ type: 'info', title: 'Two', persistent: true });
    const [first] = store().notifications;

    store().remove(first?.id ?? '');
    expect(store().notifications.map(n => n.title)).toEqual(['Two']);

    store().clear();
    expect(store().notifications).toHaveLength(0);
  });
});

describe('typed helpers', () => {
  it('success/warning/info enqueue auto-dismissing toasts of their type', () => {
    store().success('S');
    store().warning('W', 'watch out');
    store().info('I');

    expect(store().notifications.map(n => n.type)).toEqual(['success', 'warning', 'info']);
    expect(store().notifications.every(n => !n.persistent)).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(store().notifications).toHaveLength(0);
  });

  it('error is persistent — it stays until dismissed', () => {
    store().error('Boom', 'the details');

    const [n] = store().notifications;
    expect(n).toMatchObject({
      type: 'error',
      title: 'Boom',
      message: 'the details',
      persistent: true,
    });

    vi.advanceTimersByTime(60_000);
    expect(store().notifications).toHaveLength(1);
  });
});
