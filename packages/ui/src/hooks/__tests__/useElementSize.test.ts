/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useElementSize } from '../useElementSize';

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private elements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter(el => el !== element);
  }

  disconnect() {
    this.elements = [];
  }

  // Test helper to trigger resize
  trigger(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

describe('useElementSize', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    // Mock ResizeObserver
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = vi.fn().mockImplementation(callback => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver;
    });
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return initial size as zero and ref', () => {
      const { result } = renderHook(() => useElementSize());

      const [ref, size] = result.current;
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
      expect(ref.current).toBe(null);
    });

    it('should create ResizeObserver when element is set', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      expect(global.ResizeObserver).toHaveBeenCalledTimes(1);
    });

    it('should observe element when ref is set', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const observeSpy = vi.spyOn(mockResizeObserver, 'observe');

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      expect(observeSpy).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('Size Updates', () => {
    it('should get initial size from getBoundingClientRect', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 150, height: 75 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      const [, size] = result.current;
      expect(size.width).toBe(150);
      expect(size.height).toBe(75);
    });

    it('should update size when ResizeObserver triggers', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      const mockEntry: ResizeObserverEntry = {
        target: mockElement,
        contentRect: {
          width: 200,
          height: 100,
          top: 0,
          left: 0,
          bottom: 100,
          right: 200,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      };

      act(() => {
        mockResizeObserver.trigger([mockEntry]);
      });

      const [, size] = result.current;
      expect(size.width).toBe(200);
      expect(size.height).toBe(100);
    });

    it('should handle multiple size updates', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      // First update
      const mockEntry1: ResizeObserverEntry = {
        target: mockElement,
        contentRect: {
          width: 100,
          height: 50,
          top: 0,
          left: 0,
          bottom: 50,
          right: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      };

      act(() => {
        mockResizeObserver.trigger([mockEntry1]);
      });

      let [, size] = result.current;
      expect(size.width).toBe(100);
      expect(size.height).toBe(50);

      // Second update
      const mockEntry2: ResizeObserverEntry = {
        target: mockElement,
        contentRect: {
          width: 300,
          height: 150,
          top: 0,
          left: 0,
          bottom: 150,
          right: 300,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      };

      act(() => {
        mockResizeObserver.trigger([mockEntry2]);
      });

      [, size] = result.current;
      expect(size.width).toBe(300);
      expect(size.height).toBe(150);
    });

    it('should handle decimal sizes', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      const mockEntry: ResizeObserverEntry = {
        target: mockElement,
        contentRect: {
          width: 199.5,
          height: 99.75,
          top: 0,
          left: 0,
          bottom: 99.75,
          right: 199.5,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      };

      act(() => {
        mockResizeObserver.trigger([mockEntry]);
      });

      const [, size] = result.current;
      expect(size.width).toBe(199.5);
      expect(size.height).toBe(99.75);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect ResizeObserver on unmount', () => {
      const disconnectSpy = vi.spyOn(mockResizeObserver, 'disconnect');

      const { unmount } = renderHook(() => useElementSize());

      unmount();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no element gracefully', () => {
      const { result } = renderHook(() => useElementSize());

      const [ref, size] = result.current;
      expect(ref.current).toBe(null);
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });

    it('should handle zero sizes', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      const mockEntry: ResizeObserverEntry = {
        target: mockElement,
        contentRect: {
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      };

      act(() => {
        mockResizeObserver.trigger([mockEntry]);
      });

      const [, size] = result.current;
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid size changes efficiently', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 50 });

      const { result } = renderHook(() => useElementSize());

      act(() => {
        const [ref] = result.current;
        ref.current = mockElement;
      });

      // Simulate rapid size changes
      for (let i = 0; i < 10; i++) {
        const mockEntry: ResizeObserverEntry = {
          target: mockElement,
          contentRect: {
            width: i * 10,
            height: i * 5,
            top: 0,
            left: 0,
            bottom: i * 5,
            right: i * 10,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        };

        act(() => {
          mockResizeObserver.trigger([mockEntry]);
        });
      }

      const [, size] = result.current;
      expect(size.width).toBe(90);
      expect(size.height).toBe(45);
    });
  });
});
