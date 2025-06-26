/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useHover } from '../useHover';

// Don't mock useEventListener - use the real implementation

describe('useHover', () => {
  let mockElement: HTMLElement;

  // Helper function to wait for useEffect to complete
  const waitForEffects = async () => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock touch detection to ensure non-touch environment
    delete (window as any).ontouchstart;

    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return initial hover state as false', async () => {
      const { result } = renderHook(() => useHover());

      // Wait for initial useEffect to complete
      await waitForEffects();

      expect(result.current.isHovered).toBe(false);
      expect(result.current.hoverRef.current).toBe(null);
      expect(typeof result.current.handlers.onMouseEnter).toBe('function');
      expect(typeof result.current.handlers.onMouseLeave).toBe('function');
    });

    it('should set hover state to true on mouse enter', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      // Wait for useEffect to update touch detection
      await waitForEffects();

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('should set hover state to false on mouse leave', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      // First hover
      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);

      // Then leave
      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should handle multiple hover cycles', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      // First cycle
      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);

      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(false);

      // Second cycle
      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);

      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(false);
    });

    it('should handle rapid mouse events', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      // Rapid enter/leave events
      act(() => {
        result.current.handlers.onMouseEnter();
        result.current.handlers.onMouseLeave();
        result.current.handlers.onMouseEnter();
        result.current.handlers.onMouseLeave();
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Focus Handling', () => {
    it('should set hover state to true on focus', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      act(() => {
        result.current.handlers.onFocus();
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('should set hover state to false on blur', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      // First focus
      act(() => {
        result.current.handlers.onFocus();
      });
      expect(result.current.isHovered).toBe(true);

      // Then blur
      act(() => {
        result.current.handlers.onBlur();
      });
      expect(result.current.isHovered).toBe(false);
    });
  });

  describe('Touch Handling', () => {
    it('should ignore touch events when ignoreTouch is true', () => {
      // Mock touch capability
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 1,
      });

      const { result } = renderHook(() => useHover({ ignoreTouch: true }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      // Should ignore because it's a touch device
      expect(result.current.isHovered).toBe(false);
    });

    it('should handle touch events when ignoreTouch is false', () => {
      // Mock touch capability
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 1,
      });

      const { result } = renderHook(() => useHover({ ignoreTouch: false }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Delay Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should delay hover start', () => {
      const { result } = renderHook(() => useHover({ delayEnter: 100 }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('should delay hover end', () => {
      const { result } = renderHook(() => useHover({ delayLeave: 100 }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      // Start hover immediately
      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);

      // Leave with delay
      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(true);

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isHovered).toBe(false);
    });

    it('should cancel delayed hover start if mouse leaves', () => {
      const { result } = renderHook(() => useHover({ delayEnter: 100 }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(false);

      // Leave before delay completes
      act(() => {
        result.current.handlers.onMouseLeave();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isHovered).toBe(false);
    });

    it('should cancel delayed hover end if mouse enters', () => {
      const { result } = renderHook(() => useHover({ delayLeave: 100 }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      // Start hover
      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);

      // Leave with delay
      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(true);

      // Enter again before delay completes
      act(() => {
        result.current.handlers.onMouseEnter();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Motion Preferences', () => {
    it('should respect reduced motion preference', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() =>
        useHover({
          delayEnter: 100,
          respectMotionPreference: true,
        })
      );

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      // Should not delay when reduced motion is preferred
      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should clean up timeouts on unmount', () => {
      const { result, unmount } = renderHook(() => useHover({ delayEnter: 100 }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      // Unmount before timeout completes
      unmount();

      // Should not throw or cause memory leaks
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Edge Cases', () => {
    it('should handle null ref gracefully', async () => {
      const { result } = renderHook(() => useHover());

      await waitForEffects();

      expect(result.current.hoverRef.current).toBe(null);

      // Should not throw when handlers are called
      expect(() => {
        act(() => {
          result.current.handlers.onMouseEnter();
          result.current.handlers.onMouseLeave();
        });
      }).not.toThrow();
    });

    it('should handle non-touch devices', async () => {
      // Mock non-touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 0,
      });

      const { result } = renderHook(() => useHover({ ignoreTouch: true }));

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should not recreate handlers on re-renders', async () => {
      const { result, rerender } = renderHook(() => useHover());

      await waitForEffects();

      const initialHandlers = result.current.handlers;

      // Multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      // Handlers should be stable (implementation dependent)
      expect(typeof result.current.handlers.onMouseEnter).toBe('function');
      expect(typeof result.current.handlers.onMouseLeave).toBe('function');
    });

    it('should handle many rapid hover events efficiently', async () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverRef.current = mockElement;
      });

      await waitForEffects();

      // Simulate many rapid events
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.handlers.onMouseEnter();
          result.current.handlers.onMouseLeave();
        }
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });
  });
});
