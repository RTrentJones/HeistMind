/**
 * Utilities for safely handling props with Framer Motion components
 * Prevents DOM prop warnings and type conflicts
 */

import * as React from 'react';

// Props that should never be passed to DOM elements
const MOTION_PROPS = new Set([
  'animate',
  'initial',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileDrag',
  'whileFocus',
  'whileInView',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragPropagation',
  'dragTransition',
  'onDrag',
  'onDragStart',
  'onDragEnd',
  'layout',
  'layoutId',
  'layoutDependency',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onViewportEnter',
  'onViewportLeave',
]);

// Props that are safe to pass to DOM elements
const DOM_SAFE_PROPS = new Set([
  'children',
  'className',
  'style',
  'id',
  'title',
  'role',
  'tabIndex',
  'onClick',
  'onMouseEnter',
  'onMouseLeave',
  'onFocus',
  'onBlur',
  'onKeyDown',
  'onKeyUp',
  'disabled',
  'type',
  'value',
  'defaultValue',
  'placeholder',
  'name',
  'required',
  'readOnly',
  'autoComplete',
  'autoFocus',
  'checked',
  'defaultChecked',
  'multiple',
  'accept',
  'min',
  'max',
  'step',
  'pattern',
  'minLength',
  'maxLength',
  'rows',
  'cols',
  'wrap',
  'data-testid',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-expanded',
  'aria-haspopup',
  'aria-hidden',
  'aria-live',
  'aria-atomic',
  'aria-relevant',
  'aria-busy',
  'aria-current',
  'aria-disabled',
  'aria-invalid',
  'aria-pressed',
  'aria-readonly',
  'aria-required',
  'aria-selected',
]);

/**
 * Separates props into DOM-safe and Motion-specific props
 */
export function separateProps<T extends Record<string, any>>(props: T) {
  const domProps: Record<string, any> = {};
  const motionProps: Record<string, any> = {};
  const componentProps: Record<string, any> = {};

  Object.entries(props).forEach(([key, value]) => {
    if (MOTION_PROPS.has(key)) {
      motionProps[key] = value;
    } else if (DOM_SAFE_PROPS.has(key)) {
      domProps[key] = value;
    } else {
      // Custom component props (variant, size, etc.)
      componentProps[key] = value;
    }
  });

  return { domProps, motionProps, componentProps };
}

/**
 * Filters out motion-specific props to create DOM-safe props
 */
export function getDomSafeProps<T extends Record<string, any>>(props: T): Record<string, any> {
  const { domProps } = separateProps(props);
  return domProps;
}

/**
 * Extracts only motion-specific props
 */
export function getMotionProps<T extends Record<string, any>>(props: T): Record<string, any> {
  const { motionProps } = separateProps(props);
  return motionProps;
}

/**
 * Creates a safe ref callback that handles both HTML elements and Motion components
 */
export function createSafeRef<T extends HTMLElement>(
  ref: React.ForwardedRef<T>
): React.RefCallback<T> {
  return (element: T | null) => {
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };
}

/**
 * Animation presets for consistent motion across components
 */
export const animationPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  slideIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  bounce: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 10 },
  },
} as const;

/**
 * Standard interaction props for interactive components
 */
export const interactionPresets = {
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  card: {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  subtle: {
    whileHover: { scale: 1.005 },
    whileTap: { scale: 0.995 },
    transition: { duration: 0.15, ease: 'easeOut' },
  },
} as const;
