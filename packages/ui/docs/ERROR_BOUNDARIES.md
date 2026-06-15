# Error Boundary System

A comprehensive error handling system for HeistMind UI components that provides graceful error recovery, detailed error reporting, and multiple fallback strategies.

## Quick Start

### Basic Usage

```tsx
import { ErrorBoundary } from '@heist-mind/ui';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
import { ErrorBoundary, ErrorFallbacks } from '@heist-mind/ui';

function CharacterSheet() {
  return (
    <ErrorBoundary
      fallback={ErrorFallbacks.Character}
      onError={error => console.log('Character error:', error)}
    >
      <CharacterData />
    </ErrorBoundary>
  );
}
```

## Components

### ErrorBoundary

The main error boundary component with comprehensive error handling.

**Props:**

- `fallback?: ComponentType<ErrorFallbackProps>` - Custom fallback component
- `onError?: (error: Error, errorInfo: ErrorInfo) => void` - Error callback
- `title?: string` - Custom error title (default: "Something went wrong")
- `showDetailsDefault?: boolean` - Show technical details by default
- `isolate?: boolean` - Prevent error cascade to parent boundaries

**Features:**

- Automatic error ID generation for tracking
- Detailed error information with stack traces
- Copy error details to clipboard
- Retry functionality
- Expandable technical details
- Production-ready error logging

### Error Fallback Components

Pre-built fallback components for different scenarios:

#### ErrorFallbacks.Minimal

Compact error display for small components

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Minimal}>
  <SmallWidget />
</ErrorBoundary>
```

#### ErrorFallbacks.Form

Specialized for form components

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Form}>
  <UserForm />
</ErrorBoundary>
```

#### ErrorFallbacks.Character

Game-specific fallback for character data

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Character}>
  <CharacterSheet />
</ErrorBoundary>
```

#### ErrorFallbacks.Page

Full-page error display

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Page}>
  <EntireApp />
</ErrorBoundary>
```

#### ErrorFallbacks.Storybook

Development-friendly fallback for Storybook

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Storybook}>
  <ComponentStory />
</ErrorBoundary>
```

### Higher-Order Component

Wrap components with automatic error boundary protection:

```tsx
import { withErrorBoundary, ErrorFallbacks } from '@heist-mind/ui';

const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: ErrorFallbacks.Minimal,
  onError: error => logError(error),
});
```

### Simple Error Boundary

Lightweight alternative for basic use cases:

```tsx
import { SimpleErrorBoundary } from '@heist-mind/ui';

function BasicWrapper() {
  return (
    <SimpleErrorBoundary fallback={<div>Oops! Something went wrong.</div>}>
      <SomeComponent />
    </SimpleErrorBoundary>
  );
}
```

### Error Handler Hook

Programmatically throw errors to nearest boundary:

```tsx
import { useErrorHandler } from '@heist-mind/ui';

function MyComponent() {
  const handleError = useErrorHandler();

  const doSomethingRisky = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error as Error, 'Failed during risky operation');
    }
  };

  return <button onClick={doSomethingRisky}>Do Something</button>;
}
```

## Best Practices

### 1. Boundary Placement Strategy

**Page Level** - Catch application-wide errors:

```tsx
function App() {
  return (
    <ErrorBoundary fallback={ErrorFallbacks.Page}>
      <Router>
        <Routes />
      </Router>
    </ErrorBoundary>
  );
}
```

**Feature Level** - Isolate feature errors:

```tsx
function Dashboard() {
  return (
    <div>
      <ErrorBoundary fallback={ErrorFallbacks.Minimal}>
        <WeatherWidget />
      </ErrorBoundary>
      <ErrorBoundary fallback={ErrorFallbacks.Character}>
        <CharacterList />
      </ErrorBoundary>
    </div>
  );
}
```

**Component Level** - Protect individual components:

```tsx
const SafeButton = withErrorBoundary(Button, {
  fallback: ErrorFallbacks.Minimal,
});
```

### 2. Error Reporting

Always implement error reporting for production:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to error tracking service
    errorService.report(error, {
      errorInfo,
      userId: currentUser.id,
      sessionId: sessionId,
      timestamp: Date.now(),
    });
  }}
>
  <App />
</ErrorBoundary>
```

### 3. Development vs Production

Use different configurations for different environments:

```tsx
const isDev = process.env.NODE_ENV === 'development'

<ErrorBoundary
  showDetailsDefault={isDev}
  fallback={isDev ? ErrorFallbacks.Storybook : ErrorFallbacks.Page}
  onError={isDev ? console.error : errorService.report}
>
  <App />
</ErrorBoundary>
```

### 4. Nested Boundaries

Use nested boundaries to prevent error cascade:

```tsx
<ErrorBoundary fallback={ErrorFallbacks.Page}>
  <Layout>
    <ErrorBoundary fallback={ErrorFallbacks.Minimal}>
      <Sidebar />
    </ErrorBoundary>
    <ErrorBoundary fallback={ErrorFallbacks.Character}>
      <MainContent />
    </ErrorBoundary>
  </Layout>
</ErrorBoundary>
```

### 5. Testing Error Boundaries

Test error scenarios in your components:

```tsx
// Test component
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// In your tests
it('should catch errors gracefully', () => {
  render(
    <ErrorBoundary fallback={ErrorFallbacks.Minimal}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );

  expect(screen.getByText(/error loading component/i)).toBeInTheDocument();
});
```

## Error Boundary Limitations

React Error Boundaries cannot catch:

1. **Event handlers** - Use try/catch or useErrorHandler hook
2. **Asynchronous code** - Use error states or useErrorHandler hook
3. **Server-side rendering** - Handle on server separately
4. **Errors in the error boundary itself** - Use nested boundaries

## Monitoring and Analytics

### Error Tracking

Implement comprehensive error tracking:

```tsx
const errorTracker = {
  report: (error: Error, context: any) => {
    // Send to monitoring service (Sentry, LogRocket, etc.)
    console.error('Error reported:', {
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
  }
}

<ErrorBoundary onError={errorTracker.report}>
  <App />
</ErrorBoundary>
```

### Performance Monitoring

Track error recovery performance:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Track error metrics
    analytics.track('error_boundary_triggered', {
      error: error.message,
      component: errorInfo.componentStack,
      errorId: generateErrorId(),
    });
  }}
>
  <App />
</ErrorBoundary>
```

## Migration Guide

### From Basic Error Handling

Replace basic try/catch patterns:

```tsx
// Before
function Component() {
  try {
    return <ComplexComponent />;
  } catch (error) {
    return <div>Error occurred</div>;
  }
}

// After
function Component() {
  return (
    <ErrorBoundary fallback={ErrorFallbacks.Minimal}>
      <ComplexComponent />
    </ErrorBoundary>
  );
}
```

### Adding to Existing Components

Gradually wrap existing components:

```tsx
// Step 1: Wrap entire app
<ErrorBoundary fallback={ErrorFallbacks.Page}>
  <App />
</ErrorBoundary>

// Step 2: Add feature-level boundaries
<ErrorBoundary fallback={ErrorFallbacks.Character}>
  <CharacterManagement />
</ErrorBoundary>

// Step 3: Protect individual components
const SafeWidget = withErrorBoundary(Widget)
```
