/**
 * Error handling utilities for consistent error management
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ComponentError extends Error {
  constructor(
    message: string,
    public component?: string,
    public props?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ComponentError';
  }
}

export class AccessibilityError extends Error {
  constructor(
    message: string,
    public element?: string,
    public requirement?: string
  ) {
    super(message);
    this.name = 'AccessibilityError';
  }
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a ComponentError
 */
export function isComponentError(error: unknown): error is ComponentError {
  return error instanceof ComponentError;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Error context for debugging
 */
export function createErrorContext(
  component: string,
  action: string,
  props?: Record<string, unknown>
): Record<string, unknown> {
  return {
    component,
    action,
    timestamp: new Date().toISOString(),
    props: props ? JSON.parse(JSON.stringify(props)) : undefined,
  };
}
