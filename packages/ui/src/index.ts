// Design System & Core utilities
export * from './lib/design-system';
export * from './lib/utils';
export * from './lib/design-tokens';
export * from './lib/runtime-validation';

// Test utilities (development only - not included in production builds)
// export * from './lib/test-utils';

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

// Base components
export * from './components/Button';
export * from './components/Card';
export * from './components/Input';
export * from './components/Badge';
export * from './components/Tooltip';
export * from './components/ThemeToggle';

// Error handling
export * from './components/ErrorBoundary';
export * from './components/ErrorFallbacks';

// Game-specific components
export * from './components/StressTracker';

// Styles - import in your app to apply global styles
import './styles/globals.css';
