import * as React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string;
}

/**
 * Minimal error fallback for small components
 */
export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className='flex items-center gap-2 p-2 bg-semantic-error/20 border border-semantic-error/40 rounded text-semantic-error text-sm'>
    <AlertTriangle className='w-4 h-4 flex-shrink-0' />
    <span className='flex-1 truncate'>Error loading component</span>
    <Button variant='ghost' size='sm' onClick={resetError} className='h-6 px-2 text-xs'>
      Retry
    </Button>
  </div>
);

/**
 * Card-based error fallback for form components
 */
export const FormErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, errorId }) => (
  <Card variant='danger' className='max-w-md'>
    <CardHeader className='pb-3'>
      <CardTitle className='text-sm flex items-center gap-2'>
        <AlertTriangle className='w-4 h-4' />
        Form Component Error
      </CardTitle>
    </CardHeader>
    <CardContent className='space-y-3'>
      <p className='text-sm text-foreground-secondary'>
        This form component encountered an error and couldn't be displayed.
      </p>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={resetError}>
          <RefreshCw className='w-3 h-3 mr-1' />
          Retry
        </Button>
        <Badge variant='destructive' size='sm'>
          {errorId.slice(-8)}
        </Badge>
      </div>
    </CardContent>
  </Card>
);

/**
 * Character sheet specific error fallback
 */
export const CharacterErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorId,
}) => (
  <Card variant='character' className='max-w-lg'>
    <CardHeader>
      <CardTitle className='text-brand-accent flex items-center gap-2'>
        <Bug className='w-5 h-5' />
        Character Data Error
      </CardTitle>
    </CardHeader>
    <CardContent className='space-y-4'>
      <div className='space-y-2'>
        <p className='text-sm text-foreground-secondary'>
          There was an issue loading this character component. This might be due to:
        </p>
        <ul className='text-sm text-foreground-muted list-disc list-inside space-y-1'>
          <li>Invalid character data format</li>
          <li>Missing required fields</li>
          <li>Temporary rendering issue</li>
        </ul>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button variant='ember' size='sm' onClick={resetError}>
          <RefreshCw className='w-3 h-3 mr-1' />
          Reload Character
        </Button>
        <Button variant='ghost' size='sm' onClick={() => window.location.reload()}>
          <Home className='w-3 h-3 mr-1' />
          Back to Dashboard
        </Button>
      </div>

      <div className='text-xs text-foreground-muted pt-2 border-t border-border-secondary'>
        Error ID: {errorId}
      </div>
    </CardContent>
  </Card>
);

/**
 * Page-level error fallback
 */
export const PageErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, errorId }) => (
  <div className='min-h-screen flex items-center justify-center p-4'>
    <Card variant='elevated' className='max-w-2xl'>
      <CardHeader>
        <CardTitle className='text-2xl flex items-center gap-3'>
          <AlertTriangle className='w-8 h-8 text-semantic-error' />
          Application Error
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='space-y-3'>
          <p className='text-lg text-foreground-secondary'>
            HeistMind encountered an unexpected error and couldn't continue.
          </p>
          <p className='text-sm text-foreground-muted'>
            Don't worry - your data is safe. This is likely a temporary issue that can be resolved.
          </p>
        </div>

        <div className='bg-background-tertiary p-4 rounded border space-y-2'>
          <div className='text-sm font-medium text-foreground-secondary'>What you can try:</div>
          <ul className='text-sm text-foreground-muted space-y-1'>
            <li>• Refresh the page to reload the application</li>
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache and cookies</li>
            <li>• Try again in a few minutes</li>
          </ul>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Button variant='default' onClick={resetError}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Try Again
          </Button>
          <Button variant='outline' onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button variant='ghost' onClick={() => (window.location.href = '/')}>
            <Home className='w-4 h-4 mr-2' />
            Go Home
          </Button>
        </div>

        <div className='text-xs text-foreground-muted pt-4 border-t border-border-secondary space-y-1'>
          <div>
            Error ID: <code className='bg-background-tertiary px-1 rounded'>{errorId}</code>
          </div>
          <div>Timestamp: {new Date().toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Storybook-friendly error fallback
 */
export const StorybookErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className='p-4 border border-semantic-error/50 bg-semantic-error/10 rounded'>
    <div className='flex items-start gap-3'>
      <AlertTriangle className='w-5 h-5 text-semantic-error flex-shrink-0 mt-0.5' />
      <div className='flex-1 space-y-2'>
        <div className='font-medium text-semantic-error'>Component Error</div>
        <div className='text-sm text-foreground-secondary'>{error.message}</div>
        <Button variant='outline' size='sm' onClick={resetError}>
          Reset Component
        </Button>
      </div>
    </div>
  </div>
);

export const ErrorFallbacks = {
  Minimal: MinimalErrorFallback,
  Form: FormErrorFallback,
  Character: CharacterErrorFallback,
  Page: PageErrorFallback,
  Storybook: StorybookErrorFallback,
};
