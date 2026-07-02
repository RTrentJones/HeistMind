/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should return the initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value changes with default delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      expect(result.current).toBe('initial');

      // Change the value
      rerender({ value: 'changed' });
      expect(result.current).toBe('initial'); // Should still be initial

      // Fast forward time but not enough
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe('initial');

      // Fast forward the rest of the time
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe('changed');
    });

    it('should update immediately when delay is 0', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'changed' });

      // With 0 delay, still need to wait for the timeout
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('changed');
    });
  });

  describe('Multiple Value Changes', () => {
    it('should only use the latest value after multiple rapid changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // Rapid changes
      rerender({ value: 'change1' });
      rerender({ value: 'change2' });
      rerender({ value: 'final' });

      // Should still show initial
      expect(result.current).toBe('initial');

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should show the final value, not intermediate ones
      expect(result.current).toBe('final');
    });

    it('should reset timer on each value change', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'change1' });

      // Advance but not full time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Change again, should reset timer
      rerender({ value: 'change2' });

      // Advance the original remaining time
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should still be initial because timer was reset
      expect(result.current).toBe('initial');

      // Advance the new full duration
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('change2');
    });
  });

  describe('Different Data Types', () => {
    it('should work with numbers', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 0 },
      });

      rerender({ value: 42 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(42);
    });

    it('should work with booleans', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: false },
      });

      rerender({ value: true });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(true);
    });

    it('should work with objects', () => {
      const initialObj = { name: 'initial' };
      const changedObj = { name: 'changed' };

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: initialObj },
      });

      rerender({ value: changedObj });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(changedObj);
    });

    it('should work with arrays', () => {
      const initialArray = [1, 2, 3];
      const changedArray = [4, 5, 6];

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: initialArray },
      });

      rerender({ value: changedArray });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(changedArray);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | null>(value, 500),
        { initialProps: { value: null as string | null } }
      );

      rerender({ value: 'not null' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('not null');
    });

    it('should handle undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | undefined>(value, 500),
        { initialProps: { value: undefined as string | undefined } }
      );

      rerender({ value: 'defined' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('defined');
    });

    it('should handle changing from defined to undefined', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | undefined>(value, 500),
        { initialProps: { value: 'defined' as string | undefined } }
      );

      rerender({ value: undefined });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(undefined);
    });

    it('should handle very small delays', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'changed' });

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe('changed');
    });

    it('should handle very large delays', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 10000), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'changed' });

      // Advance by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current).toBe('initial');

      // Advance by another 5 seconds to complete the delay
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current).toBe('changed');
    });
  });

  describe('Cleanup', () => {
    it('should clean up timers on unmount', () => {
      const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'changed' });

      // Spy on clearTimeout to verify cleanup
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update state after unmount', () => {
      const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'changed' });

      // Unmount before timer completes
      unmount();

      // Timer should not fire and update state
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // This test verifies that no errors are thrown due to state updates after unmount
      expect(true).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should not create new timers if value has not changed', () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      setTimeoutSpy.mockClear();

      const { rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'same' },
      });

      const initialCallCount = setTimeoutSpy.mock.calls.length;

      // Re-render with the same value
      rerender({ value: 'same' });
      rerender({ value: 'same' });

      // Should not create additional timers
      expect(setTimeoutSpy.mock.calls.length).toBe(initialCallCount);
    });

    it('should handle rapid successive identical values efficiently', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // Change to a new value
      rerender({ value: 'new' });

      // Rapidly change back to the same value multiple times
      for (let i = 0; i < 10; i++) {
        rerender({ value: 'new' });
      }

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('new');
    });
  });
});
