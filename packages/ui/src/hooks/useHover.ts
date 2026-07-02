/**
 * useHover hook
 * Provides hover state management with accessibility considerations
 */

import { useState, useRef, useEffect, type RefObject } from 'react';
import { useEventListener } from './useEventListener';

export interface UseHoverOptions {
  /** Delay before hover state activates (ms) */
  delayEnter?: number;
  /** Delay before hover state deactivates (ms) */
  delayLeave?: number;
  /** Whether to respect user's motion preferences */
  respectMotionPreference?: boolean;
  /** Whether to ignore touch events */
  ignoreTouch?: boolean;
}

export interface UseHoverReturn {
  /** Current hover state */
  isHovered: boolean;
  /** Ref to attach to the element */
  hoverRef: RefObject<HTMLElement | null>;
  /** Manual hover handlers */
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Hook for managing hover state with accessibility and motion preferences
 */
export const useHover = (options: UseHoverOptions = {}): UseHoverReturn => {
  const {
    delayEnter = 0,
    delayLeave = 0,
    respectMotionPreference = true,
    ignoreTouch = true,
  } = options;

  const [isHovered, setIsHovered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const hoverRef = useRef<HTMLElement | null>(null);
  const enterTimeoutRef = useRef<number | undefined>(undefined);
  const leaveTimeoutRef = useRef<number | undefined>(undefined);

  // Detect touch capability
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Check motion preferences
  const prefersReducedMotion =
    respectMotionPreference && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTimeouts = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = undefined;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = undefined;
    }
  };

  const handleMouseEnter = () => {
    if (ignoreTouch && isTouch) return;

    clearTimeouts();

    const delay = prefersReducedMotion ? 0 : delayEnter;

    if (delay > 0) {
      enterTimeoutRef.current = window.setTimeout(() => {
        setIsHovered(true);
      }, delay);
    } else {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (ignoreTouch && isTouch) return;

    clearTimeouts();

    const delay = prefersReducedMotion ? 0 : delayLeave;

    if (delay > 0) {
      leaveTimeoutRef.current = window.setTimeout(() => {
        setIsHovered(false);
      }, delay);
    } else {
      setIsHovered(false);
    }
  };

  const handleFocus = () => {
    if (ignoreTouch && isTouch) return;
    setIsHovered(true);
  };

  const handleBlur = () => {
    if (ignoreTouch && isTouch) return;
    setIsHovered(false);
  };

  // Set up event listeners on the ref element
  useEventListener('mouseenter', handleMouseEnter, hoverRef);
  useEventListener('mouseleave', handleMouseLeave, hoverRef);
  useEventListener('focus', handleFocus, hoverRef);
  useEventListener('blur', handleBlur, hoverRef);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  return {
    isHovered,
    hoverRef,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
};
