/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useEventListener } from '../useEventListener';

describe('useEventListener', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (mockElement.parentNode) {
      document.body.removeChild(mockElement);
    }
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should add event listener to element', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      renderHook(() => useEventListener('click', handler, mockElement));

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });

    it('should add event listener to window when window is provided', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useEventListener('resize', handler, window));

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), undefined);
    });

    it('should add event listener to document when document provided', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useEventListener('keydown', handler, document));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), undefined);
    });

    it('should pass options to addEventListener', () => {
      const handler = vi.fn();
      const options = { passive: true, capture: true };
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      renderHook(() => useEventListener('scroll', handler, mockElement, options));

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), options);
    });
  });

  describe('Event Handling', () => {
    it('should call handler when event is triggered', () => {
      const handler = vi.fn();

      renderHook(() => useEventListener('click', handler, mockElement));

      const clickEvent = new MouseEvent('click');
      mockElement.dispatchEvent(clickEvent);

      expect(handler).toHaveBeenCalledWith(clickEvent);
    });

    it('should call handler with correct event data', () => {
      const handler = vi.fn();

      renderHook(() => useEventListener('mousedown', handler, mockElement));

      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        button: 0,
      });
      mockElement.dispatchEvent(mouseEvent);

      expect(handler).toHaveBeenCalledWith(mouseEvent);
      expect(handler.mock.calls[0][0].clientX).toBe(100);
      expect(handler.mock.calls[0][0].clientY).toBe(200);
    });

    it('should handle multiple event types on same element', () => {
      const clickHandler = vi.fn();
      const mouseOverHandler = vi.fn();

      renderHook(() => useEventListener('click', clickHandler, mockElement));
      renderHook(() => useEventListener('mouseover', mouseOverHandler, mockElement));

      mockElement.dispatchEvent(new MouseEvent('click'));
      mockElement.dispatchEvent(new MouseEvent('mouseover'));

      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(mouseOverHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      const { unmount } = renderHook(() => useEventListener('click', handler, mockElement));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });

    it('should remove event listener when element changes', () => {
      const handler = vi.fn();
      const newElement = document.createElement('span');
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');
      const addEventListenerSpy = vi.spyOn(newElement, 'addEventListener');

      const { rerender } = renderHook(
        ({ element }) => useEventListener('click', handler, element),
        { initialProps: { element: mockElement } }
      );

      rerender({ element: newElement });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });

    it('should remove event listener when event type changes', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      const { rerender } = renderHook(
        ({ eventType }) => useEventListener(eventType, handler, mockElement),
        { initialProps: { eventType: 'click' as const } }
      );

      addEventListenerSpy.mockClear(); // Clear initial call

      rerender({ eventType: 'mousedown' as const });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
        undefined
      );
    });

    it('should handle element removal from DOM gracefully', () => {
      const handler = vi.fn();
      const { unmount } = renderHook(() => useEventListener('click', handler, mockElement));

      // Remove element from DOM before unmounting hook
      if (mockElement.parentNode) {
        document.body.removeChild(mockElement);
      }

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null element gracefully', () => {
      const handler = vi.fn();

      expect(() => {
        renderHook(() => useEventListener('click', handler, null));
      }).not.toThrow();
    });

    it('should handle undefined element gracefully', () => {
      const handler = vi.fn();

      expect(() => {
        renderHook(() => useEventListener('click', handler, undefined));
      }).not.toThrow();
    });

    it('should handle changing to null element', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      const { rerender } = renderHook(
        ({ element }) => useEventListener('click', handler, element),
        { initialProps: { element: mockElement } }
      );

      rerender({ element: null });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });

    it('should handle changing from null to element', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      const { rerender } = renderHook(
        ({ element }) => useEventListener('click', handler, element),
        { initialProps: { element: null } }
      );

      rerender({ element: mockElement });

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    });
  });

  describe('Event Types', () => {
    it('should handle keyboard events', () => {
      const handler = vi.fn();

      renderHook(() => useEventListener('keydown', handler, document));

      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(keyEvent);

      expect(handler).toHaveBeenCalledWith(keyEvent);
    });

    it('should handle custom events', () => {
      const handler = vi.fn();

      renderHook(() => useEventListener('custom-event', handler, mockElement));

      const customEvent = new CustomEvent('custom-event', { detail: { test: 'data' } });
      mockElement.dispatchEvent(customEvent);

      expect(handler).toHaveBeenCalledWith(customEvent);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ test: 'data' });
    });

    it('should handle window events', () => {
      const handler = vi.fn();

      renderHook(() => useEventListener('resize', handler, window));

      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);

      expect(handler).toHaveBeenCalledWith(resizeEvent);
    });
  });

  describe('Handler Updates', () => {
    it('should use latest handler function', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const { rerender } = renderHook(
        ({ handler }) => useEventListener('click', handler, mockElement),
        { initialProps: { handler: handler1 } }
      );

      mockElement.dispatchEvent(new MouseEvent('click'));
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);

      rerender({ handler: handler2 });

      mockElement.dispatchEvent(new MouseEvent('click'));
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not re-add event listener when only handler changes', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      const { rerender } = renderHook(
        ({ handler }) => useEventListener('click', handler, mockElement),
        { initialProps: { handler: handler1 } }
      );

      const initialCallCount = addEventListenerSpy.mock.calls.length;

      rerender({ handler: handler2 });

      // Should not have added/removed listeners, just updated the ref
      expect(addEventListenerSpy.mock.calls.length).toBe(initialCallCount);
      expect(removeEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Options Handling', () => {
    it('should handle boolean options', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      renderHook(() => useEventListener('click', handler, mockElement, true));

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
    });

    it('should handle object options', () => {
      const handler = vi.fn();
      const options = { once: true, passive: true };
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      renderHook(() => useEventListener('click', handler, mockElement, options));

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), options);
    });

    it('should update listeners when options change', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      const { rerender } = renderHook(
        ({ options }) => useEventListener('click', handler, mockElement, options),
        { initialProps: { options: { passive: true } } }
      );

      addEventListenerSpy.mockClear(); // Clear initial call

      rerender({ options: { capture: true } });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), {
        passive: true,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), {
        capture: true,
      });
    });
  });

  describe('Performance', () => {
    it('should not recreate listeners unnecessarily', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      const { rerender } = renderHook(() => useEventListener('click', handler, mockElement));

      const initialAddCalls = addEventListenerSpy.mock.calls.length;

      // Re-render with same props
      rerender();

      expect(addEventListenerSpy.mock.calls.length).toBe(initialAddCalls);
      expect(removeEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should handle rapid re-renders efficiently', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      const { rerender } = renderHook(() => useEventListener('click', handler, mockElement));

      const initialAddCalls = addEventListenerSpy.mock.calls.length;

      // Multiple re-renders with same props
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      expect(addEventListenerSpy.mock.calls.length).toBe(initialAddCalls);
    });
  });
});
