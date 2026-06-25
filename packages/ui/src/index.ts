// Design System & Core utilities
export * from './lib/design-system';
export * from './lib/utils';
export * from './lib/design-tokens';
export * from './lib/runtime-validation';
export * from './lib/constants';
export * from './lib/errors';
export * from './lib/performance';

// Validation system (excludes conflicting BadgeVariant)
export {
  validateDesignToken,
  validateVariantCombination,
  validateAccessibilityProps,
  validatePerformanceProps,
  isGameVariant,
  isSemanticVariant,
  isStateVariant,
  validateButtonProps,
  validateInputProps,
  useComponentValidation,
  type ValidButtonCombination,
  type ValidInputState,
} from './lib/validation';
export {
  type ButtonVariant,
  type ButtonSize,
  type CardVariant,
  type CardSize,
  type InputVariant,
  type InputSize,
  type InputState,
  type GameVariant,
  type StateVariant,
  type SemanticVariant,
  type ValidCardCombination,
  type ValidAriaAttributes,
  type BrandColor,
  type GameColor,
  type SemanticColor,
  type ValidThemeVariant,
  type ValidSizeCombination,
  type MotionSafeProps,
  type ValidInteractiveProps,
  type ValidNonInteractiveProps,
  type InteractiveConstraint,
  type ValidDesignToken,
  isValidVariantCombination,
  validateAriaAttributes,
  isValidDesignToken,
} from './lib/variant-types';

// Test utilities live in './lib/test-utils' and are imported directly by test
// files. They must NOT be re-exported here: the web app transpiles this package
// from source (next transpilePackages + tsconfig path -> packages/ui/src), so a
// re-export pulls vitest / @testing-library (and its `act` import) into the
// production bundle.

// Shared hooks (includes useKeyboardNavigation and useTheme)
export * from './hooks';

// Accessibility utilities (excluding conflicting exports)
export {
  useComponentIds,
  useLoadingState,
  useInteractiveMotion,
  type AriaAttributes,
} from './lib/accessibility';

// Theme utilities (excluding conflicting exports)
export { type ThemeConfig } from './lib/theme';
// ThemeProvider pairs with the exported `useTheme` hook — components such as
// Header read theme context from it, so it must be part of the public API.
export { ThemeProvider, type ThemeProviderProps } from './lib/theme';

// Layout components
export * from './components/Container';
export * from './components/Grid';
export * from './components/Stack';
export * from './components/Section';

// Navigation components
export * from './components/Header';

// Typography components
export * from './components/Heading';
export * from './components/Text';
export * from './components/Paragraph';

// Status & Feedback components
export * from './components/StatusIcon';
export * from './components/LoadingSpinner';
export * from './components/ErrorDisplay';
export * from './components/Alert';

// Form components
export * from './components/Input';
export * from './components/Textarea';

// Base components
export * from './components/Button';
export * from './components/Card';
export * from './components/Badge';
export * from './components/Tooltip';
export * from './components/ThemeToggle';

// Error handling
export * from './components/ErrorBoundary';
export * from './components/ErrorFallbacks';

// Game-specific components
export * from './components/StressTracker';
export * from './components/HarmTracker';
export * from './components/Clock';

// Styles - export path for manual import to prevent duplicate CSS
// Import './styles/globals.css' in your app's main file only once
export const GLOBAL_STYLES_PATH = './styles/globals.css';
