/**
 * Design System Constants
 * Centralized constants to eliminate magic numbers and improve maintainability
 */

// Stress Level Thresholds
export const STRESS_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
} as const;

// Component Size Defaults
export const COMPONENT_SIZES = {
  SM: 'sm',
  DEFAULT: 'default',
  LG: 'lg',
  XL: 'xl',
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  DEFAULT: 200,
  SLOW: 300,
  HOVER_DELAY: 100,
  TOOLTIP_DELAY: 500,
} as const;

// Z-Index Scale
export const Z_INDEX = {
  DROPDOWN: 1000,
  TOOLTIP: 1010,
  MODAL: 1020,
  NOTIFICATION: 1030,
} as const;

// Accessibility
export const A11Y = {
  MIN_TOUCH_TARGET: 44, // pixels
  DEFAULT_DEBOUNCE_DELAY: 300, // ms
  FOCUS_VISIBLE_OUTLINE_WIDTH: 2, // pixels
} as const;

// Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_INPUT_LENGTH: 500,
  DEBOUNCE_DELAY: 300,
} as const;

// DOM ID Patterns
export const ID_PATTERNS = {
  PREFIX_REGEX: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  MAX_PREFIX_LENGTH: 20,
  DEFAULT_PREFIX: 'hm',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  NETWORK_ERROR: 'Network request failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;
