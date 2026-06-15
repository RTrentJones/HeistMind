/**
 * Performance optimization utilities
 */

import React, { useCallback, useRef, useMemo } from 'react';

/**
 * Stable callback hook that only changes when dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>(callback);
  const depsRef = useRef(deps);

  // Update callback if dependencies changed
  if (!areDepsEqual(depsRef.current, deps)) {
    ref.current = callback;
    depsRef.current = deps;
  }

  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

/**
 * Deep comparison for dependency arrays
 */
function areDepsEqual(oldDeps: React.DependencyList, newDeps: React.DependencyList): boolean {
  if (oldDeps.length !== newDeps.length) {
    return false;
  }

  for (let i = 0; i < oldDeps.length; i++) {
    if (oldDeps[i] !== newDeps[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Memoized component props for performance optimization
 */
export function useStableProps<T extends Record<string, any>>(props: T): T {
  return useMemo(() => props, [JSON.stringify(props)]);
}

/**
 * Throttle hook for limiting function execution rate
 */
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<number | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(
          () => {
            lastCall.current = Date.now();
            callback(...args);
          },
          delay - (now - lastCall.current)
        );
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Batch updates to reduce re-renders
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const isScheduled = useRef(false);

  const scheduleUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);

    if (!isScheduled.current) {
      isScheduled.current = true;
      requestAnimationFrame(() => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        isScheduled.current = false;

        updates.forEach(update => update());
      });
    }
  }, []);

  return scheduleUpdate;
}

/**
 * Intersection Observer hook for performance optimization
 */
export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setIsIntersecting(entry.isIntersecting);
      }
    }, options);

    observer.observe(target);

    return () => observer.disconnect();
  }, [targetRef, options]);

  return isIntersecting;
}

/**
 * Lazy loading hook for components
 */
export function useLazyComponent<T>(
  factory: () => Promise<{ default: T }>,
  deps: React.DependencyList = []
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    setLoading(true);
    setError(null);

    factory()
      .then(module => {
        if (!isCancelled) {
          setComponent(module.default);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, deps);

  return { Component, loading, error };
}
