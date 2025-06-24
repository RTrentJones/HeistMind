/**
 * useElementSize hook
 * Tracks element dimensions with ResizeObserver
 */

import { useState, useEffect, RefObject, useRef } from 'react';

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
  const ref = useRef<T | null>(null);
  const targetRef = elementRef || ref;

  const [size, setSize] = useState<ElementSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Get initial size
    const { width, height } = element.getBoundingClientRect();
    setSize({ width, height });

    return () => {
      resizeObserver.disconnect();
    };
  }, [targetRef]);

  return [targetRef, size];
};
