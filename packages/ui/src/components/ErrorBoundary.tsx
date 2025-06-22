import * as React from 'react';
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorId: string;
}

export interface ErrorBoundaryProps {
  /** Fallback component to render on error */
  fallback?: React.ComponentType<{ error: Error; resetError: () => void; errorId: string }>;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Children to wrap */
  children: React.ReactNode;
  /** Custom error title */
  title?: string;
  /** Whether to show technical details by default */
  showDetailsDefault?: boolean;
  /** Isolate errors to prevent cascade failures */
  isolate?: boolean;
}

/**
 * Production-ready error boundary with detailed error reporting and recovery options
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: props.showDetailsDefault ?? false,
      errorId: this.generateErrorId(),
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || 'No component stack available',
    };

    this.setState({
      errorInfo: enhancedErrorInfo,
    });

    // Log error for monitoring
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo: enhancedErrorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  private handleCopyError = async () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    } catch (err) {
      console.warn('Failed to copy error details to clipboard:', err);
    }
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, title = 'Something went wrong' } = this.props;
      const { error, errorInfo, showDetails, errorId } = this.state;

      if (Fallback) {
        return <Fallback error={error!} resetError={this.handleRetry} errorId={errorId} />;
      }

      return (
        <Card variant='danger' className='max-w-2xl mx-auto my-4'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-semantic-error'>
              <AlertTriangle className='w-5 h-5' />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='text-sm text-foreground-secondary'>
              {error?.message || 'An unexpected error occurred while rendering this component.'}
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={this.handleRetry}
                className='flex items-center gap-1'
              >
                <RefreshCw className='w-3 h-3' />
                Try Again
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={this.handleCopyError}
                className='flex items-center gap-1'
              >
                <Copy className='w-3 h-3' />
                Copy Error
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={this.toggleDetails}
                className='flex items-center gap-1'
              >
                {showDetails ? (
                  <ChevronUp className='w-3 h-3' />
                ) : (
                  <ChevronDown className='w-3 h-3' />
                )}
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            {showDetails && (
              <div className='space-y-3 text-xs'>
                <div className='bg-background-tertiary p-3 rounded border'>
                  <div className='font-medium text-foreground-muted mb-1'>Error ID:</div>
                  <code className='text-foreground-secondary'>{errorId}</code>
                </div>

                {error?.stack && (
                  <div className='bg-background-tertiary p-3 rounded border'>
                    <div className='font-medium text-foreground-muted mb-2'>Stack Trace:</div>
                    <pre className='text-foreground-secondary whitespace-pre-wrap break-all'>
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div className='bg-background-tertiary p-3 rounded border'>
                    <div className='font-medium text-foreground-muted mb-2'>Component Stack:</div>
                    <pre className='text-foreground-secondary whitespace-pre-wrap'>
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className='text-xs text-foreground-muted pt-2 border-t border-border-secondary'>
              If this error persists, please report it with the error ID above.
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook to get error boundary context and throw errors to nearest boundary
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    // Enhanced error with additional context
    const enhancedError = new Error(error.message);
    enhancedError.name = error.name;
    enhancedError.stack = error.stack;

    if (errorInfo) {
      enhancedError.message += ` (${errorInfo})`;
    }

    throw enhancedError;
  }, []);
}

/**
 * Lightweight error boundary for specific use cases
 */
export const SimpleErrorBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, fallback, onError }) => {
  return (
    <ErrorBoundary onError={onError} fallback={fallback ? () => <>{fallback}</> : undefined}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
