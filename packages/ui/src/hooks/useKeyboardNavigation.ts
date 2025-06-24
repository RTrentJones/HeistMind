/**
 * useKeyboardNavigation hook
 * Provides comprehensive keyboard navigation support for interactive components
 */

import { useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { useEventListener } from './useEventListener';

export interface KeyboardNavigationOptions {
  /** Whether to enable arrow key navigation */
  enableArrowKeys?: boolean;
  /** Whether to enable home/end navigation */
  enableHomeEnd?: boolean;
  /** Whether to enable escape key handling */
  enableEscape?: boolean;
  /** Whether to enable enter/space activation */
  enableActivation?: boolean;
  /** Whether to loop navigation at boundaries */
  loop?: boolean;
  /** Custom key handlers */
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Callback when enter/space is pressed */
  onActivate?: () => void;
  /** Whether navigation is disabled */
  disabled?: boolean;
}

export interface KeyboardNavigationReturn {
  /** Current focus index */
  focusIndex: number;
  /** Set focus to specific index */
  setFocusIndex: (index: number) => void;
  /** Move focus to next item */
  focusNext: () => void;
  /** Move focus to previous item */
  focusPrevious: () => void;
  /** Move focus to first item */
  focusFirst: () => void;
  /** Move focus to last item */
  focusLast: () => void;
  /** Key handler to attach to container */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Register focusable elements */
  registerElement: (element: HTMLElement, index: number) => void;
  /** Unregister focusable elements */
  unregisterElement: (index: number) => void;
}

/**
 * Hook for managing keyboard navigation in component collections
 */
export const useKeyboardNavigation = (
  itemCount: number,
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationReturn => {
  const {
    enableArrowKeys = true,
    enableHomeEnd = true,
    enableEscape = true,
    enableActivation = true,
    loop = false,
    onKeyDown,
    onEscape,
    onActivate,
    disabled = false,
  } = options;

  const focusIndexRef = useRef(0);
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map());

  const setFocusIndex = useCallback(
    (index: number) => {
      if (disabled || itemCount === 0) return;

      const clampedIndex = Math.max(0, Math.min(index, itemCount - 1));
      focusIndexRef.current = clampedIndex;

      const element = elementsRef.current.get(clampedIndex);
      if (element) {
        element.focus();
      }
    },
    [itemCount, disabled]
  );

  const focusNext = useCallback(() => {
    if (disabled) return;

    let nextIndex = focusIndexRef.current + 1;

    if (nextIndex >= itemCount) {
      nextIndex = loop ? 0 : itemCount - 1;
    }

    setFocusIndex(nextIndex);
  }, [itemCount, loop, disabled, setFocusIndex]);

  const focusPrevious = useCallback(() => {
    if (disabled) return;

    let prevIndex = focusIndexRef.current - 1;

    if (prevIndex < 0) {
      prevIndex = loop ? itemCount - 1 : 0;
    }

    setFocusIndex(prevIndex);
  }, [itemCount, loop, disabled, setFocusIndex]);

  const focusFirst = useCallback(() => {
    if (!disabled) {
      setFocusIndex(0);
    }
  }, [disabled, setFocusIndex]);

  const focusLast = useCallback(() => {
    if (!disabled) {
      setFocusIndex(itemCount - 1);
    }
  }, [itemCount, disabled, setFocusIndex]);

  const registerElement = useCallback((element: HTMLElement, index: number) => {
    elementsRef.current.set(index, element);
  }, []);

  const unregisterElement = useCallback((index: number) => {
    elementsRef.current.delete(index);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // Call custom key handler first
      if (onKeyDown) {
        onKeyDown(event);
        if (event.defaultPrevented) return;
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          if (enableArrowKeys) {
            event.preventDefault();
            focusNext();
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          if (enableArrowKeys) {
            event.preventDefault();
            focusPrevious();
          }
          break;

        case 'Home':
          if (enableHomeEnd) {
            event.preventDefault();
            focusFirst();
          }
          break;

        case 'End':
          if (enableHomeEnd) {
            event.preventDefault();
            focusLast();
          }
          break;

        case 'Escape':
          if (enableEscape && onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;

        case 'Enter':
        case ' ':
          if (enableActivation && onActivate) {
            event.preventDefault();
            onActivate();
          }
          break;

        default:
          break;
      }
    },
    [
      disabled,
      onKeyDown,
      enableArrowKeys,
      enableHomeEnd,
      enableEscape,
      enableActivation,
      focusNext,
      focusPrevious,
      focusFirst,
      focusLast,
      onEscape,
      onActivate,
    ]
  );

  // Reset focus index when item count changes
  useEffect(() => {
    if (focusIndexRef.current >= itemCount) {
      setFocusIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, setFocusIndex]);

  return {
    focusIndex: focusIndexRef.current,
    setFocusIndex,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    onKeyDown: handleKeyDown,
    registerElement,
    unregisterElement,
  };
};
