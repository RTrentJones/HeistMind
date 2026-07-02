/**
 * Shared type definitions for HeistMind UI components
 * Provides type-safe interfaces and utilities for consistent component APIs
 */

import type * as React from 'react';
import { type VariantProps } from 'class-variance-authority';

// Base component size variants used across all components
export type ComponentSize = 'sm' | 'default' | 'lg' | 'xl';

// Base component states for form elements
export type ComponentState = 'default' | 'error' | 'success' | 'warning';

// Base animation variants
export type AnimationVariant = 'fade' | 'slide' | 'scale' | 'none';

// Common interaction props for all interactive components
export interface InteractiveProps {
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state for async actions */
  loading?: boolean;
  /** Whether the component should show interactive states (hover, focus, etc.) */
  interactive?: boolean;
}

// Base props that all components should extend from
export interface BaseComponentProps {
  /** Additional CSS classes */
  className?: string;
  /** Test ID for automated testing */
  'data-testid'?: string;
  /** Accessibility label */
  'aria-label'?: string;
}

// Motion-safe props that avoid Framer Motion type conflicts
export interface MotionSafeProps extends BaseComponentProps {
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Mouse enter handler */
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Mouse leave handler */
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Focus handler */
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  /** Blur handler */
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  /** Key down handler */
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

// Form element specific props
export interface FormElementProps extends MotionSafeProps, InteractiveProps {
  /** Field label */
  label?: string;
  /** Help text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Warning message */
  warning?: string;
  /** Whether the field is required */
  required?: boolean;
}

// Icon props for components that support icons
export interface IconProps {
  /** Icon element to display */
  icon?: React.ReactNode;
  /** Position of the icon relative to content */
  iconPosition?: 'left' | 'right';
}

// Polymorphic component props for flexible element rendering
export type PolymorphicProps<T extends React.ElementType> = {
  /** The element type to render as */
  as?: T;
} & React.ComponentPropsWithoutRef<T>;

// Animation configuration
export interface AnimationConfig {
  /** Animation duration in milliseconds */
  duration?: number;
  /** Animation easing function */
  easing?: string;
  /** Animation delay in milliseconds */
  delay?: number;
}

// Validation result type for form elements
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type?: ComponentState;
}

// Loading state configuration
export interface LoadingConfig {
  /** Whether the component is in loading state */
  loading: boolean;
  /** Text to show during loading */
  loadingText?: string;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
}

// Accessibility helpers
export interface A11yProps {
  /** ARIA role override */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA described by */
  'aria-describedby'?: string;
  /** ARIA live region */
  'aria-live'?: 'off' | 'polite' | 'assertive';
  /** Whether element is expanded (for dropdowns, etc.) */
  'aria-expanded'?: boolean;
  /** Whether element has popup */
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

// Design system color token type
export type ColorToken =
  | 'background'
  | 'foreground'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'muted'
  | 'border'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

// Design system spacing token type
export type SpacingToken =
  | '0'
  | 'px'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '16'
  | '20'
  | '24';

// Component variant constraints
export type ComponentVariant<T extends Record<string, unknown>> = keyof T;

// Utility type for extracting variant props
export type ExtractVariants<T> = T extends VariantProps<infer U> ? U : never;

// Generic component props with proper constraints
export interface ComponentProps<TVariants extends Record<string, unknown> = Record<string, unknown>>
  extends BaseComponentProps,
    InteractiveProps,
    A11yProps {
  /** Component size variant */
  size?: ComponentSize;
  /** Component variant */
  variant?: ComponentVariant<TVariants>;
  /** Component state for validation styling */
  state?: ComponentState;
}
