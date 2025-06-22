/**
 * Accessibility utilities and helpers for HeistMind UI components
 * Provides ARIA attributes, keyboard navigation, and screen reader support
 */

import * as React from 'react';

// Common ARIA attributes interface
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-busy'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
  'aria-pressed'?: boolean;
  'aria-readonly'?: boolean;
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-level'?: number;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-multiselectable'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuenow'?: number;
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  role?: string;
}

// Generate unique IDs for ARIA relationships
let idCounter = 0;
export function generateId(prefix = 'hm'): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create stable ID hook
export function useId(prefix?: string): string {
  const [id] = React.useState(() => generateId(prefix));
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

  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
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

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

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
}): AriaAttributes {
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
}): AriaAttributes {
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
}): AriaAttributes {
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
    'aria-describedby': props.description ? generateId('desc') : undefined,
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
