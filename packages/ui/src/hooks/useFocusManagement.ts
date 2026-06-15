/**
 * useFocusManagement hook
 * Provides comprehensive focus management utilities for accessibility
 */

import { useRef, useEffect, useCallback } from 'react';
import { useEventListener } from './useEventListener';

export interface FocusManagementOptions {
  /** Whether to trap focus within the container */
  trapFocus?: boolean;
  /** Whether to restore focus when unmounting */
  restoreFocus?: boolean;
  /** Whether to focus the first element on mount */
  autoFocus?: boolean;
  /** Custom selector for focusable elements */
  focusableSelector?: string;
  /** Callback when focus is trapped */
  onFocusTrapped?: () => void;
  /** Callback when focus escapes */
  onFocusEscape?: () => void;
}

export interface FocusManagementReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Focus the first focusable element */
  focusFirst: () => void;
  /** Focus the last focusable element */
  focusLast: () => void;
  /** Check if focus is within the container */
  containsFocus: () => boolean;
  /** Get all focusable elements */
  getFocusableElements: () => HTMLElement[];
}

const defaultFocusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Hook for managing focus within a container with accessibility features
 */
export const useFocusManagement = (options: FocusManagementOptions = {}): FocusManagementReturn => {
  const {
    trapFocus = false,
    restoreFocus = false,
    autoFocus = false,
    focusableSelector = defaultFocusableSelector,
    onFocusTrapped,
    onFocusEscape,
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll(focusableSelector);
    return Array.from(elements) as HTMLElement[];
  }, [focusableSelector]);

  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1]?.focus();
    }
  }, [getFocusableElements]);

  const containsFocus = useCallback((): boolean => {
    if (!containerRef.current) return false;

    const activeElement = document.activeElement;
    return containerRef.current.contains(activeElement);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!trapFocus || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // If shift+tab on first element, focus last
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
        onFocusTrapped?.();
      }
      // If tab on last element, focus first
      else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
        onFocusTrapped?.();
      }
    },
    [trapFocus, getFocusableElements, onFocusTrapped]
  );

  const handleFocusOut = useCallback(
    (event: FocusEvent) => {
      if (!trapFocus || !containerRef.current) return;

      // Check if the new focus target is outside the container
      const relatedTarget = event.relatedTarget as HTMLElement | null;

      if (relatedTarget && !containerRef.current.contains(relatedTarget)) {
        // Focus escaped the container
        onFocusEscape?.();

        // Bring focus back to the container
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0]?.focus();
        }
      }
    },
    [trapFocus, onFocusEscape, getFocusableElements]
  );

  // Set up event listeners
  useEventListener('keydown', handleKeyDown, containerRef);
  useEventListener('focusout', handleFocusOut, containerRef);

  // Handle initial focus and cleanup
  useEffect(() => {
    if (restoreFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    if (autoFocus) {
      // Use setTimeout to ensure the container is mounted
      const timeoutId = setTimeout(() => {
        focusFirst();
      }, 0);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [autoFocus, restoreFocus, focusFirst]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElementRef.current) {
        // Use setTimeout to ensure the restore happens after React cleanup
        setTimeout(() => {
          if (previousActiveElementRef.current) {
            previousActiveElementRef.current.focus();
          }
        }, 0);
      }
    };
  }, [restoreFocus]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    containsFocus,
    getFocusableElements,
  };
};
