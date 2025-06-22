/**
 * Runtime validation utilities for component props and design tokens
 * Provides development-time warnings for invalid combinations
 */

import { isValidDesignToken, type ValidDesignToken } from './variant-types';

// Development mode validation
const isDev = process.env.NODE_ENV === 'development';

export function validateDesignToken(token: string, componentName: string): boolean {
  if (!isDev) return true;

  if (!isValidDesignToken(token)) {
    console.warn(
      `[${componentName}] Invalid design token "${token}". ` +
        `Expected one of: brand-primary, brand-secondary, brand-accent, ` +
        `game-ember, game-steel, game-shadow, game-crimson, game-gold, ` +
        `semantic-success, semantic-warning, semantic-error, semantic-info`
    );
    return false;
  }

  return true;
}

export function validateVariantCombination(
  props: Record<string, any>,
  validCombinations: Record<string, any>[],
  componentName: string
): boolean {
  if (!isDev) return true;

  const isValid = validCombinations.some(combo =>
    Object.entries(combo).every(([key, value]) => {
      if (value === undefined) return props[key] === undefined;
      if (Array.isArray(value)) return value.includes(props[key]);
      return props[key] === value;
    })
  );

  if (!isValid) {
    console.warn(
      `[${componentName}] Invalid variant combination:`,
      props,
      '\nValid combinations:',
      validCombinations
    );
  }

  return isValid;
}

export function validateAccessibilityProps(
  props: Record<string, any>,
  componentName: string
): string[] {
  if (!isDev) return [];

  const warnings: string[] = [];

  // Check for conflicting ARIA labels
  if (props['aria-label'] && props['aria-labelledby']) {
    warnings.push(
      `[${componentName}] Both aria-label and aria-labelledby provided. ` +
        `aria-labelledby takes precedence.`
    );
  }

  // Check interactive elements have accessible names
  if (props.interactive || props.onClick) {
    const hasAccessibleName = props['aria-label'] || props['aria-labelledby'] || props.children;

    if (!hasAccessibleName) {
      warnings.push(
        `[${componentName}] Interactive element should have an accessible name ` +
          `via aria-label, aria-labelledby, or visible text content.`
      );
    }
  }

  // Check required props for specific variants
  if (props.variant === 'destructive' && !props['aria-label']) {
    warnings.push(
      `[${componentName}] Destructive variant should have an aria-label ` +
        `to clarify the destructive action.`
    );
  }

  // Log warnings
  warnings.forEach(warning => console.warn(warning));

  return warnings;
}

export function validatePerformanceProps(
  props: Record<string, any>,
  componentName: string
): string[] {
  if (!isDev) return [];

  const warnings: string[] = [];

  // Check for performance anti-patterns
  if (props.children && typeof props.children === 'function') {
    warnings.push(
      `[${componentName}] Function children may cause unnecessary re-renders. ` +
        `Consider memoizing or using a stable reference.`
    );
  }

  // Check for inline object props
  const inlineObjectProps = ['style', 'className'].filter(
    prop => props[prop] && typeof props[prop] === 'object'
  );

  if (inlineObjectProps.length > 0) {
    warnings.push(
      `[${componentName}] Inline object props [${inlineObjectProps.join(', ')}] ` +
        `may cause unnecessary re-renders. Consider memoizing or extracting to constants.`
    );
  }

  // Log warnings
  warnings.forEach(warning => console.warn(warning));

  return warnings;
}

// Runtime type guards
export function isGameVariant(
  variant: string
): variant is 'ember' | 'steel' | 'shadow' | 'crimson' | 'gold' {
  return ['ember', 'steel', 'shadow', 'crimson', 'gold'].includes(variant);
}

export function isSemanticVariant(
  variant: string
): variant is 'success' | 'warning' | 'error' | 'info' {
  return ['success', 'warning', 'error', 'info'].includes(variant);
}

export function isStateVariant(
  variant: string
): variant is 'default' | 'error' | 'success' | 'warning' {
  return ['default', 'error', 'success', 'warning'].includes(variant);
}

// Component-specific validators
export function validateButtonProps(props: Record<string, any>): boolean {
  const warnings: string[] = [];

  // Add button-specific validations
  if (props.loading && props.disabled) {
    warnings.push('[Button] Both loading and disabled props provided. Loading takes precedence.');
  }

  if (props.asChild && props.loading) {
    warnings.push('[Button] asChild and loading cannot be used together.');
  }

  warnings.forEach(warning => console.warn(warning));

  return warnings.length === 0;
}

export function validateInputProps(props: Record<string, any>): boolean {
  const warnings: string[] = [];

  // Add input-specific validations
  if (props.error && props.success) {
    warnings.push('[Input] Both error and success props provided. Error takes precedence.');
  }

  if (props.showPasswordToggle && props.type !== 'password') {
    warnings.push('[Input] showPasswordToggle can only be used with type="password".');
  }

  warnings.forEach(warning => console.warn(warning));

  return warnings.length === 0;
}

// Hook for comprehensive prop validation
export function useComponentValidation(
  componentName: string,
  props: Record<string, any>,
  additionalValidators: ((props: Record<string, any>) => boolean)[] = []
) {
  if (!isDev) return;

  // Run all validation checks
  validateAccessibilityProps(props, componentName);
  validatePerformanceProps(props, componentName);

  // Run component-specific validators
  additionalValidators.forEach(validator => validator(props));
}
