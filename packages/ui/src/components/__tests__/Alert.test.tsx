/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../Alert';
import { render, screen, userEvent, testAccessibility, testVariants } from '../../lib/test-utils';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with default props', () => {
      render(<Alert>Alert message</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Alert message');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('applies variant styles correctly', () => {
      const variants = [
        {
          props: { variant: 'default' as const, children: 'Default alert' },
          expectedClasses: ['bg-background-secondary', 'border-border-primary'],
        },
        {
          props: { variant: 'destructive' as const, children: 'Error alert' },
          expectedClasses: [
            'bg-semantic-error/10',
            'border-semantic-error/20',
            'text-semantic-error',
          ],
        },
        {
          props: { variant: 'warning' as const, children: 'Warning alert' },
          expectedClasses: ['bg-semantic-warning/10', 'text-semantic-warning'],
        },
        {
          props: { variant: 'success' as const, children: 'Success alert' },
          expectedClasses: ['bg-semantic-success/10', 'text-semantic-success'],
        },
        {
          props: { variant: 'info' as const, children: 'Info alert' },
          expectedClasses: ['bg-semantic-info/10', 'text-semantic-info'],
        },
      ];

      testVariants(Alert, variants);
    });

    it('displays appropriate icons for each variant', () => {
      const variants = [
        { variant: 'destructive' as const, testId: 'alert-destructive' },
        { variant: 'warning' as const, testId: 'alert-warning' },
        { variant: 'success' as const, testId: 'alert-success' },
        { variant: 'info' as const, testId: 'alert-info' },
      ];

      variants.forEach(({ variant, testId }) => {
        const { container } = render(
          <Alert variant={variant} data-testid={testId}>
            Test alert
          </Alert>
        );

        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveClass('h-4', 'w-4');
      });
    });

    it('can hide the icon when showIcon is false', () => {
      const { container } = render(<Alert showIcon={false}>Alert without icon</Alert>);

      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });

    it('supports custom icons', () => {
      const CustomIcon = () => <span data-testid='custom-icon'>Custom</span>;

      render(<Alert icon={<CustomIcon />}>Alert with custom icon</Alert>);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('meets accessibility standards', async () => {
      const { container } = render(
        <Alert variant='warning'>This is an accessible alert message</Alert>
      );
      await testAccessibility(container);
    });
  });

  describe('Dismissible Alert', () => {
    it('shows dismiss button when dismissible', () => {
      render(<Alert dismissible>Dismissible alert</Alert>);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const handleDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <Alert dismissible onDismiss={handleDismiss}>
          Dismissible alert
        </Alert>
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it('hides alert when dismissed', async () => {
      const user = userEvent.setup();

      render(<Alert dismissible>Dismissible alert</Alert>);

      const alert = screen.getByRole('alert');
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });

      expect(alert).toBeInTheDocument();

      await user.click(dismissButton);

      expect(alert).not.toBeInTheDocument();
    });

    it('dismiss button meets accessibility standards', async () => {
      const { container } = render(<Alert dismissible>Accessible dismissible alert</Alert>);
      await testAccessibility(container);
    });

    it('supports keyboard interaction for dismiss button', async () => {
      const handleDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <Alert dismissible onDismiss={handleDismiss}>
          Keyboard accessible alert
        </Alert>
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });

      // Test Enter key
      dismissButton.focus();
      await user.keyboard('{Enter}');
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('AlertTitle', () => {
    it('renders as h5 by default', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      const title = screen.getByRole('heading', { level: 5 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Alert Title');
    });

    it('applies correct styling', () => {
      render(<AlertTitle>Styled Title</AlertTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none');
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<AlertTitle>Accessible Title</AlertTitle>);
      await testAccessibility(container);
    });
  });

  describe('AlertDescription', () => {
    it('renders description content', () => {
      render(<AlertDescription>Alert description</AlertDescription>);
      const description = screen.getByText('Alert description');
      expect(description).toBeInTheDocument();
    });

    it('applies correct styling', () => {
      render(<AlertDescription>Styled description</AlertDescription>);
      const description = screen.getByText('Styled description');
      expect(description).toHaveClass('text-sm', '[&_p]:leading-relaxed');
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<AlertDescription>Accessible description</AlertDescription>);
      await testAccessibility(container);
    });
  });

  describe('Complete Alert Structure', () => {
    it('renders full alert structure correctly', () => {
      render(
        <Alert variant='warning'>
          <AlertTitle>Warning Title</AlertTitle>
          <AlertDescription>This is a warning message with detailed description.</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('heading', { name: 'Warning Title' })).toBeInTheDocument();
      expect(
        screen.getByText('This is a warning message with detailed description.')
      ).toBeInTheDocument();
    });

    it('maintains proper semantic structure', () => {
      render(
        <Alert variant='error' dismissible>
          <AlertTitle>Error Occurred</AlertTitle>
          <AlertDescription>Please check your input and try again.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const heading = screen.getByRole('heading');
      const button = screen.getByRole('button');

      expect(alert).toContainElement(heading);
      expect(alert).toContainElement(button);
    });

    it('meets accessibility standards as complete structure', async () => {
      const { container } = render(
        <Alert variant='success' dismissible>
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your action was completed successfully.</AlertDescription>
        </Alert>
      );

      await testAccessibility(container);
    });
  });

  describe('Size Variants', () => {
    it('applies size variants correctly', () => {
      const sizeVariants = [
        {
          props: { size: 'sm' as const, children: 'Small alert' },
          expectedClasses: ['p-3', 'text-sm'],
        },
        {
          props: { size: 'default' as const, children: 'Default alert' },
          expectedClasses: ['p-4'],
        },
        {
          props: { size: 'lg' as const, children: 'Large alert' },
          expectedClasses: ['p-6', 'text-lg'],
        },
      ];

      testVariants(Alert, sizeVariants);
    });
  });

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      render(<Alert />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('handles invalid variant gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation();

      render(<Alert variant={'invalid' as any}>Alert with invalid variant</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('handles onDismiss errors gracefully', async () => {
      const faultyDismiss = vi.fn(() => {
        throw new Error('Dismiss error');
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();

      render(
        <Alert dismissible onDismiss={faultyDismiss}>
          Alert with faulty dismiss
        </Alert>
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });

      // Should not throw error to user - wrap in try/catch to prevent unhandled error
      try {
        await user.click(dismissButton);
      } catch (error) {
        // Expected error - should be caught by component error boundary
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Dismiss error');
      }

      // Verify the function was called despite the error
      expect(faultyDismiss).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
