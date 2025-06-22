/**
 * Accessibility utilities and helpers for HeistMind UI components
 * Provides ARIA attributes, keyboard navigation, and screen reader support
 */

import * as React from 'react';

// Common ARIA attributes interface - compatible with React.AriaAttributes
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: React.AriaAttributes['aria-expanded'];
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup'];
  'aria-hidden'?: React.AriaAttributes['aria-hidden'];
  'aria-live'?: React.AriaAttributes['aria-live'];
  'aria-atomic'?: React.AriaAttributes['aria-atomic'];
  'aria-relevant'?: React.AriaAttributes['aria-relevant'];
  'aria-busy'?: React.AriaAttributes['aria-busy'];
  'aria-current'?: React.AriaAttributes['aria-current'];
  'aria-disabled'?: React.AriaAttributes['aria-disabled'];
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  'aria-pressed'?: React.AriaAttributes['aria-pressed'];
  'aria-readonly'?: React.AriaAttributes['aria-readonly'];
  'aria-required'?: React.AriaAttributes['aria-required'];
  'aria-selected'?: React.AriaAttributes['aria-selected'];
  'aria-checked'?: React.AriaAttributes['aria-checked'];
  'aria-level'?: React.AriaAttributes['aria-level'];
  'aria-setsize'?: React.AriaAttributes['aria-setsize'];
  'aria-posinset'?: React.AriaAttributes['aria-posinset'];
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-multiselectable'?: React.AriaAttributes['aria-multiselectable'];
  'aria-orientation'?: React.AriaAttributes['aria-orientation'];
  'aria-valuenow'?: React.AriaAttributes['aria-valuenow'];
  'aria-valuemax'?: React.AriaAttributes['aria-valuemax'];
  'aria-valuemin'?: React.AriaAttributes['aria-valuemin'];
  role?: string;
}

// Generate unique IDs for ARIA relationships
let idCounter = 0;
export function generateAccessibilityId(prefix = 'hm'): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create stable ID hook
export function useId(prefix?: string): string {
  const [id] = React.useState(() => generateAccessibilityId(prefix));
  return id;
}

// ARIA live region announcer
export class AriaAnnouncer {
  private static instance: AriaAnnouncer | null = null;
  private liveRegion: HTMLElement | null = null;

  static getInstance(): AriaAnnouncer {
    if (!AriaAnnouncer.instance) {
      AriaAnnouncer.instance = new AriaAnnouncer();
    }
    return AriaAnnouncer.instance;
  }

  private constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion() {
    if (typeof window === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

// Hook for announcements
export function useAnnouncer() {
  const announcer = React.useMemo(() => AriaAnnouncer.getInstance(), []);

  return React.useCallback(
    (message: string, priority?: 'polite' | 'assertive') => {
      announcer.announce(message, priority);
    },
    [announcer]
  );
}

// Keyboard navigation utilities
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  TAB: 'Tab',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
} as const;

export type KeyboardKey = (typeof KeyboardKeys)[keyof typeof KeyboardKeys];

// Keyboard event handler utilities
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void,
  keys: KeyboardKey[] = [KeyboardKeys.ENTER, KeyboardKeys.SPACE]
) {
  if (keys.includes(event.key as KeyboardKey)) {
    event.preventDefault();
    callback();
  }
}

// Focus management utilities
export function focusElement(element: HTMLElement | null, options?: FocusOptions) {
  if (element) {
    element.focus(options);
  }
}

export function focusFirstFocusableElement(container: HTMLElement | null) {
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  if (firstElement) {
    firstElement.focus();
  }
}

export function focusLastFocusableElement(container: HTMLElement | null) {
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;
  if (lastElement) {
    lastElement.focus();
  }
}

// Trap focus within container
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement | undefined;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

    if (!firstElement || !lastElement) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, isActive]);
}

// Screen reader utilities
export function getScreenReaderText(text: string, context?: string): string {
  if (context) {
    return `${context}: ${text}`;
  }
  return text;
}

// Accessibility validation helpers
export function validateAriaAttributes(props: AriaAttributes): string[] {
  const warnings: string[] = [];

  // Check for common accessibility issues
  if (props['aria-labelledby'] && props['aria-label']) {
    warnings.push(
      'Both aria-labelledby and aria-label provided. aria-labelledby takes precedence.'
    );
  }

  if (props['aria-expanded'] !== undefined && !props['aria-haspopup']) {
    warnings.push('aria-expanded should typically be used with aria-haspopup.');
  }

  if (props.role === 'button' && !props['aria-label'] && !props['aria-labelledby']) {
    warnings.push('Button role requires accessible name via aria-label or aria-labelledby.');
  }

  return warnings;
}

// Common ARIA attribute builders
export function buildButtonAria(props: {
  label?: string;
  describedBy?: string;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  controls?: string;
}) {
  return {
    'aria-label': props.label,
    'aria-describedby': props.describedBy,
    'aria-pressed': props.pressed,
    'aria-expanded': props.expanded,
    'aria-disabled': props.disabled,
    'aria-controls': props.controls,
    role: 'button',
  };
}

export function buildFormFieldAria(props: {
  label?: string;
  describedBy?: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
}) {
  return {
    'aria-label': props.label,
    'aria-describedby': props.describedBy,
    'aria-required': props.required,
    'aria-invalid': props.invalid,
  };
}

export function buildListAria(props: {
  label?: string;
  multiselectable?: boolean;
  orientation?: 'horizontal' | 'vertical';
}) {
  return {
    'aria-label': props.label,
    'aria-multiselectable': props.multiselectable,
    'aria-orientation': props.orientation,
    role: 'list',
  };
}

export function buildListItemAria(props: {
  selected?: boolean;
  position?: number;
  setSize?: number;
  level?: number;
}): AriaAttributes {
  return {
    'aria-selected': props.selected,
    'aria-posinset': props.position,
    'aria-setsize': props.setSize,
    'aria-level': props.level,
    role: 'listitem',
  };
}

// Gaming-specific accessibility helpers
export function buildGameComponentAria(props: {
  gameRole?: 'character' | 'skill' | 'action' | 'status' | 'dice' | 'inventory';
  value?: string | number;
  max?: number;
  description?: string;
}): AriaAttributes {
  const roleDescriptions = {
    character: 'Character information',
    skill: 'Character skill',
    action: 'Game action',
    status: 'Status indicator',
    dice: 'Dice roll component',
    inventory: 'Inventory item',
  };

  const baseAria: AriaAttributes = {
    'aria-label': props.gameRole ? roleDescriptions[props.gameRole] : undefined,
    'aria-describedby': props.description ? generateAccessibilityId('desc') : undefined,
  };

  // Add value-specific attributes
  if (typeof props.value === 'number' && props.max) {
    baseAria['aria-valuenow'] = props.value;
    baseAria['aria-valuemax'] = props.max;
    baseAria['aria-valuemin'] = 0;
    baseAria.role = 'progressbar';
  }

  return baseAria;
}

// Reduced motion support
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// High contrast support
export function useHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// Shared hooks for common component behaviors

/**
 * Hook for managing keyboard navigation on interactive elements
 */
export function useKeyboardNavigation(onActivate?: () => void, activationKeys?: KeyboardKey[]) {
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (onActivate) {
        handleKeyboardActivation(event, onActivate, activationKeys);
      }
    },
    [onActivate, activationKeys]
  );

  return { onKeyDown: handleKeyDown };
}

/**
 * Hook for managing focus states with accessibility announcements
 */
export function useFocusState(announceStateChanges = false) {
  const [isFocused, setIsFocused] = React.useState(false);
  const announcer = useAnnouncer();

  const focusHandlers = React.useMemo(
    () => ({
      onFocus: (event: React.FocusEvent) => {
        setIsFocused(true);
        if (announceStateChanges) {
          const element = event.currentTarget as HTMLElement;
          const label =
            element.getAttribute('aria-label') || element.textContent || 'Element focused';
          announcer(`Focused: ${label}`, 'polite');
        }
      },
      onBlur: () => {
        setIsFocused(false);
      },
    }),
    [announceStateChanges, announcer]
  );

  return { isFocused, ...focusHandlers };
}

/**
 * Hook for managing loading states with accessibility announcements
 */
export function useLoadingState(
  loading: boolean,
  loadingText?: string,
  announceStateChanges = true
) {
  const announcer = useAnnouncer();
  const prevLoading = React.useRef(loading);

  React.useEffect(() => {
    if (announceStateChanges && prevLoading.current !== loading) {
      if (loading) {
        announcer(loadingText || 'Loading started', 'polite');
      } else if (prevLoading.current) {
        announcer('Loading completed', 'polite');
      }
    }
    prevLoading.current = loading;
  }, [loading, loadingText, announcer, announceStateChanges]);

  const loadingContent = React.useMemo(() => {
    if (!loading) return null;

    return {
      srOnlySpan: {
        className: 'sr-only',
        'aria-live': 'polite' as const,
        children: loadingText || 'Loading...',
      },
      hiddenSpan: {
        'aria-hidden': 'true' as const,
        children: loadingText || 'Loading...',
      },
    };
  }, [loading, loadingText]);

  return {
    loadingContent,
    isLoading: loading,
  };
}

/**
 * Hook for managing form field validation states with accessibility
 */
export function useFormFieldState(
  error?: string,
  success?: string,
  warning?: string,
  state?: 'default' | 'error' | 'success' | 'warning'
) {
  const resolvedState = React.useMemo(() => {
    return state !== 'default' && state
      ? state
      : error
        ? 'error'
        : success
          ? 'success'
          : warning
            ? 'warning'
            : 'default';
  }, [state, error, success, warning]);

  const message = error || success || warning;

  const getMessageRole = React.useCallback(() => {
    return resolvedState === 'error' ? 'alert' : 'status';
  }, [resolvedState]);

  const getAriaLive = React.useCallback(() => {
    return resolvedState === 'error' ? 'assertive' : 'polite';
  }, [resolvedState]);

  return {
    resolvedState,
    message,
    messageRole: getMessageRole(),
    ariaLive: getAriaLive(),
    hasError: resolvedState === 'error',
    hasSuccess: resolvedState === 'success',
    hasWarning: resolvedState === 'warning',
  };
}

/**
 * Hook for managing component IDs and ARIA relationships
 */
export function useComponentIds(prefix?: string) {
  const baseId = useId(prefix);

  const ids = React.useMemo(
    () => ({
      component: baseId,
      label: `${baseId}-label`,
      description: `${baseId}-desc`,
      error: `${baseId}-error`,
      help: `${baseId}-help`,
    }),
    [baseId]
  );

  const buildDescribedBy = React.useCallback(
    (includeDescription = false, includeError = false, includeHelp = false) => {
      const describedByIds = [];
      if (includeDescription) describedByIds.push(ids.description);
      if (includeError) describedByIds.push(ids.error);
      if (includeHelp) describedByIds.push(ids.help);
      return describedByIds.length > 0 ? describedByIds.join(' ') : undefined;
    },
    [ids]
  );

  return { ids, buildDescribedBy };
}

/**
 * Hook for managing interactive states with reduced motion support
 */
export function useInteractiveMotion(disabled = false, loading = false) {
  const prefersReducedMotion = useReducedMotion();
  const isInteractive = !disabled && !loading;

  const motionProps = React.useMemo(() => {
    if (!isInteractive || prefersReducedMotion) {
      return {};
    }

    return {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
    };
  }, [isInteractive, prefersReducedMotion]);

  const getInitialAnimation = React.useCallback(
    (defaultInitial: any = { opacity: 0, y: 10 }) => {
      return prefersReducedMotion ? { opacity: 1 } : defaultInitial;
    },
    [prefersReducedMotion]
  );

  const getTransitionDuration = React.useCallback(
    (defaultDuration = 0.2) => {
      return prefersReducedMotion ? 0 : defaultDuration;
    },
    [prefersReducedMotion]
  );

  return {
    isInteractive,
    prefersReducedMotion,
    motionProps,
    getInitialAnimation,
    getTransitionDuration,
  };
}
