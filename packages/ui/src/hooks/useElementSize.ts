/**
 * useElementSize hook
 * Tracks element dimensions with ResizeObserver
 */

import { useState, useEffect, type RefObject, useRef, useMemo } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Hook that tracks element size using ResizeObserver
 */
export const useElementSize = <T extends HTMLElement = HTMLElement>(
  elementRef?: RefObject<T | null>
): [RefObject<T | null>, ElementSize] => {
  const internalRef = useRef<T | null>(null);
  const [element, setElement] = useState<T | null>(null);

  const [size, setSize] = useState<ElementSize>({
    width: 0,
    height: 0,
  });

  // Create ResizeObserver immediately
  const resizeObserverRef = useRef<ResizeObserver>(
    new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    })
  );

  // Create a ref object that directly updates element state when set
  const refObject = useMemo(() => {
    if (elementRef) {
      return elementRef;
    }

    // Create a custom ref that triggers state updates immediately
    let currentValue: T | null = null;
    return {
      get current() {
        return currentValue;
      },
      set current(value: T | null) {
        if (currentValue !== value) {
          currentValue = value;
          internalRef.current = value;
          // Use functional update to ensure state change is detected
          setElement(() => value);
        }
      },
    } as RefObject<T | null>;
  }, [elementRef]);

  // Monitor external ref changes
  useEffect(() => {
    if (elementRef) {
      setElement(elementRef.current);
    }
  }, [elementRef?.current]);

  useEffect(() => {
    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const resizeObserver = resizeObserverRef.current;
    resizeObserver.observe(element);

    // Get initial size
    const { width, height } = element.getBoundingClientRect();
    setSize({ width, height });

    return () => {
      resizeObserver.unobserve(element);
    };
  }, [element]);

  // Cleanup on unmount - using a separate useEffect to ensure disconnect is called
  useEffect(() => {
    const resizeObserver = resizeObserverRef.current;
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [refObject, size];
};
