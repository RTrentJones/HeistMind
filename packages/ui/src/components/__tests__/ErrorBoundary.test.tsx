/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '../../lib/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean; message?: string }> = ({
  shouldThrow,
  message = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Mock console.error to prevent noise in test output
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('renders multiple children without errors', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays default error UI when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('displays custom error message when provided', () => {
      const customMessage = 'Custom error occurred';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message={customMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('shows retry button when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state when retry button is clicked', async () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Initial error');
        }
        return <div>Component works</div>;
      };

      const { user, rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Fix the component before retrying
      shouldThrow = false;

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Component should render successfully after retry
      expect(screen.getByText('Component works')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div data-testid='custom-fallback'>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('passes error information to custom fallback function', () => {
      const fallbackFn = vi.fn((error: Error, retry: () => void) => (
        <div>
          <span>Error: {error.message}</span>
          <button onClick={retry}>Custom Retry</button>
        </div>
      ));

      render(
        <ErrorBoundary fallback={fallbackFn}>
          <ThrowError shouldThrow={true} message='Fallback test error' />
        </ErrorBoundary>
      );

      expect(fallbackFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Fallback test error',
        }),
        expect.any(Function)
      );
      expect(screen.getByText('Error: Fallback test error')).toBeInTheDocument();
    });
  });

  describe('Error Reporting', () => {
    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} message='Callback test' />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('does not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('retry button is keyboard accessible', async () => {
      const { user } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Focus the button
      retryButton.focus();
      expect(retryButton).toHaveFocus();

      // Should be activatable with Enter
      await user.keyboard('{Enter}');
      expect(retryButton).toHaveFocus();

      // Should be activatable with Space
      await user.keyboard(' ');
      expect(retryButton).toHaveFocus();
    });
  });

  describe('Error Recovery', () => {
    it('clears error state when children change', () => {
      let throwError = true;

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={throwError} />
        </ErrorBoundary>
      );

      // Error state should be displayed
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Change children to non-throwing component
      throwError = false;
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={throwError} />
        </ErrorBoundary>
      );

      // Should still show error (boundaries don't auto-reset on prop changes)
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('maintains error state across re-renders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);

      // Should render without errors
      expect(document.body).toBeInTheDocument();
    });

    it('handles undefined children gracefully', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>);

      // Should render without errors
      expect(document.body).toBeInTheDocument();
    });

    it('handles errors in nested components', () => {
      const NestedComponent = () => <ThrowError shouldThrow={true} message='Nested error' />;

      render(
        <ErrorBoundary>
          <div>
            <NestedComponent />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText(/nested error/i)).toBeInTheDocument();
    });
  });
});
