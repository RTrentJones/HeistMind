/**
 * useDebounce hook
 * Debounces a value with configurable delay and options
 */

import { useState, useEffect, useRef } from 'react';

export interface DebounceOptions {
  /** Delay in milliseconds */
  delay: number;
  /** Whether to call the function on the leading edge */
  leading?: boolean;
  /** Whether to call the function on the trailing edge */
  trailing?: boolean;
  /** Maximum time to wait before invoking the function */
  maxWait?: number;
}

/**
 * Hook that debounces a value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook that debounces a callback function
 */
export const useDebouncedCallback = <T extends (...args: readonly unknown[]) => unknown>(
  callback: T,
  options: DebounceOptions
): T => {
  const { delay, leading = false, trailing = true, maxWait } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef<number | undefined>(undefined);
  const maxTimeoutRef = useRef<number | undefined>(undefined);
  const lastCallTimeRef = useRef<number | undefined>(undefined);
  const lastInvokeTimeRef = useRef<number>(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const isMountedRef = useRef(true);

  const debouncedCallback = useRef((...args: Parameters<T>) => {
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - (lastCallTimeRef.current || 0);
    const timeSinceLastInvoke = currentTime - lastInvokeTimeRef.current;

    lastCallTimeRef.current = currentTime;

    const shouldInvokeLeading = leading && (!lastCallTimeRef.current || timeSinceLastCall >= delay);
    const shouldInvokeMaxWait = maxWait && timeSinceLastInvoke >= maxWait;

    if (shouldInvokeLeading || shouldInvokeMaxWait) {
      lastInvokeTimeRef.current = currentTime;
      return callbackRef.current(...args);
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Set trailing timeout with mount check
    if (trailing) {
      timeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          lastInvokeTimeRef.current = Date.now();
          callbackRef.current(...args);
        }
      }, delay);
    }

    // Set max wait timeout with mount check
    if (maxWait && timeSinceLastInvoke < maxWait) {
      maxTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          lastInvokeTimeRef.current = Date.now();
          callbackRef.current(...args);
        }
      }, maxWait - timeSinceLastInvoke);
    }

    // Return undefined for trailing/delayed execution
    return undefined as ReturnType<T>;
  }).current as T;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};
