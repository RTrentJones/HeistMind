/**
 * useEventListener hook
 * Provides type-safe event listener management
 */

import { useEffect, useRef, RefObject } from 'react';

type EventHandler<T = Event> = (event: T) => void;

/**
 * Hook for adding event listeners with automatic cleanup
 */
export const useEventListener = <
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLElement,
>(
  eventName: K,
  handler: EventHandler<HTMLElementEventMap[K]>,
  element?: RefObject<T | null> | T | null | Window | Document,
  options?: boolean | AddEventListenerOptions
): void => {
  const savedHandler = useRef<EventHandler<HTMLElementEventMap[K]> | undefined>(undefined);

  // Update ref.current value if handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Define the listening target
    const targetElement = element && 'current' in element ? element.current : element;

    if (!(targetElement && targetElement.addEventListener)) {
      return;
    }

    // Create event listener that calls handler function stored in ref
    const eventListener = (event: Event) => {
      if (savedHandler.current) {
        savedHandler.current(event as HTMLElementEventMap[K]);
      }
    };

    targetElement.addEventListener(eventName, eventListener, options);

    // Remove event listener on cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
};
