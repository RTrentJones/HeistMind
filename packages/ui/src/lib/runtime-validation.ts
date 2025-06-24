/**
 * Runtime validation utilities for HeistMind UI components
 * Provides type-safe validation with meaningful error messages
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Base validator interface
 */
export interface Validator<T = any> {
  validate: (value: T, context?: string) => ValidationResult;
  optional?: boolean;
}

/**
 * Creates a validator for required values
 */
export const required = <T>(message?: string): Validator<T> => ({
  validate: (value: T, context = 'value') => {
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        error: message || `${context} is required`,
      };
    }
    return { isValid: true };
  },
});

/**
 * Creates a validator for string values
 */
export const string = (options?: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}): Validator<string> => ({
  validate: (value: string, context = 'value') => {
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: `${context} must be a string`,
      };
    }

    if (options?.minLength && value.length < options.minLength) {
      return {
        isValid: false,
        error: `${context} must be at least ${options.minLength} characters`,
      };
    }

    if (options?.maxLength && value.length > options.maxLength) {
      return {
        isValid: false,
        error: `${context} must be no more than ${options.maxLength} characters`,
      };
    }

    if (options?.pattern && !options.pattern.test(value)) {
      return {
        isValid: false,
        error: options.message || `${context} format is invalid`,
      };
    }

    return { isValid: true, warnings };
  },
});

/**
 * Creates a validator for enum values
 */
export const oneOf = <T extends readonly any[]>(
  values: T,
  message?: string
): Validator<T[number]> => ({
  validate: (value: T[number], context = 'value') => {
    if (!values.includes(value)) {
      return {
        isValid: false,
        error: message || `${context} must be one of: ${values.join(', ')}`,
      };
    }
    return { isValid: true };
  },
});

/**
 * Validates component props and throws meaningful errors
 */
export const validateProps = <T extends Record<string, any>>(
  props: T,
  validators: { [K in keyof T]?: Validator<T[K]> },
  componentName: string
): void => {
  if (process.env.NODE_ENV === 'production') {
    return; // Skip validation in production for performance
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, validator] of Object.entries(validators)) {
    if (!validator) continue;

    const value = props[key as keyof T];
    const result = validator.validate(value, `${componentName}.${key}`);

    if (!result.isValid && result.error) {
      errors.push(result.error);
    }

    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed for ${componentName}:\n${errors.join('\n')}`);
  }

  if (warnings.length > 0) {
    console.warn(`Validation warnings for ${componentName}:\n${warnings.join('\n')}`);
  }
};

/**
 * Component variant validator
 */
export const variant = <T extends string>(variants: readonly T[]): Validator<T | undefined> => ({
  optional: true,
  validate: (value: T | undefined, context = 'variant') => {
    if (value === undefined) {
      return { isValid: true };
    }

    if (!variants.includes(value)) {
      return {
        isValid: false,
        error: `${context} must be one of: ${variants.join(', ')}. Received: ${value}`,
      };
    }

    return { isValid: true };
  },
});

/**
 * Event handler validator
 */
export const eventHandler = <T extends (...args: any[]) => any>(): Validator<T | undefined> => ({
  optional: true,
  validate: (value: T | undefined, context = 'event handler') => {
    if (value === undefined) {
      return { isValid: true };
    }

    if (typeof value !== 'function') {
      return {
        isValid: false,
        error: `${context} must be a function`,
      };
    }

    return { isValid: true };
  },
});

/**
 * Creates a runtime type guard with validation
 */
export const createTypeGuard = <T>(validator: Validator<T>): ((value: unknown) => value is T) => {
  return (value: unknown): value is T => {
    try {
      const result = validator.validate(value as T);
      return result.isValid;
    } catch {
      return false;
    }
  };
};
