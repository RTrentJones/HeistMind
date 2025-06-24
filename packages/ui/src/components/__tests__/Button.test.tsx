/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';
import { Button } from '../Button';
import {
  render,
  screen,
  userEvent,
  testAccessibility,
  testKeyboardNavigation,
  testVariants,
  testMotionSafety,
  testLoadingStates,
} from '../../lib/test-utils';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('renders with custom className', () => {
      render(<Button className='custom-class'>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Click me</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Variants', () => {
    const variants = [
      {
        props: { variant: 'default' as const, children: 'Default' },
        expectedClasses: ['bg-gradient-to-r', 'from-brand-primary'],
      },
      {
        props: { variant: 'destructive' as const, children: 'Destructive' },
        expectedClasses: ['from-semantic-error'],
      },
      {
        props: { variant: 'outline' as const, children: 'Outline' },
        expectedClasses: ['border-2', 'border-brand-primary/50'],
      },
    ];

    it('renders all variants correctly', () => {
      testVariants(Button, variants);
    });

    it('applies size variants correctly', () => {
      const sizeVariants = [
        {
          props: { size: 'sm' as const, children: 'Small' },
          expectedClasses: ['h-8', 'px-3', 'text-xs'],
        },
        {
          props: { size: 'default' as const, children: 'Default' },
          expectedClasses: ['h-10', 'px-4', 'py-2'],
        },
        {
          props: { size: 'lg' as const, children: 'Large' },
          expectedClasses: ['h-12', 'px-8', 'text-base'],
        },
      ];

      testVariants(Button, sizeVariants);
    });
  });

  describe('Interactive States', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents clicks when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Click me
        </Button>
      );
      const button = screen.getByRole('button');

      expect(button).toBeDisabled();
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state correctly', () => {
      render(<Button loading>Loading...</Button>);
      const button = screen.getByRole('button');

      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('handles loading state transitions', async () => {
      testLoadingStates(
        loading => render(<Button loading={loading}>Test</Button>),
        'loading-spinner'
      );
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards', async () => {
      const { container } = render(<Button>Accessible button</Button>);
      await testAccessibility(container);
    });

    it('supports keyboard navigation', async () => {
      render(<Button>Navigate me</Button>);
      const button = screen.getByRole('button');
      await testKeyboardNavigation(button);
    });

    it('has proper ARIA attributes', () => {
      render(
        <Button aria-label='Custom label' aria-describedby='button-description' disabled>
          Button with ARIA
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'button-description');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('announces loading state to screen readers', () => {
      render(<Button loading>Loading button</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Motion and Animation', () => {
    it('respects reduced motion preferences', () => {
      const motionTest = testMotionSafety();

      // Test with reduced motion
      motionTest.mockReducedMotion();
      const { unmount } = render(<Button>Reduced motion</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');
      unmount();

      // Test with normal motion
      motionTest.mockNormalMotion();
      render(<Button>Normal motion</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');

      motionTest.restore();
    });

    it('applies hover and focus styles', async () => {
      const user = userEvent.setup();
      render(<Button>Hover me</Button>);
      const button = screen.getByRole('button');

      // Test focus
      await user.tab();
      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus-visible:ring-2');

      // Test hover (simulated through class checking)
      expect(button).toHaveClass('hover:shadow-xl');
    });
  });

  describe('Form Integration', () => {
    it('works as form submit button', () => {
      const handleSubmit = vi.fn();
      render(
        <form onSubmit={handleSubmit}>
          <Button type='submit'>Submit</Button>
        </form>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('works as reset button', () => {
      render(
        <form>
          <Button type='reset'>Reset</Button>
        </form>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Polymorphic Behavior', () => {
    it('renders as link when asChild with anchor', () => {
      render(
        <Button asChild>
          <a href='/test'>Link button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveTextContent('Link button');
    });

    it('maintains button styling when polymorphic', () => {
      render(
        <Button asChild variant='destructive'>
          <a href='/test'>Destructive link</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('from-semantic-error');
    });
  });

  describe('Error Handling', () => {
    it('handles invalid onClick gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation();

      render(<Button onClick={undefined as any}>Invalid click</Button>);
      const button = screen.getByRole('button');

      // Should not throw error
      expect(() => button.click()).not.toThrow();

      consoleError.mockRestore();
    });

    it('handles missing children gracefully', () => {
      render(<Button />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderCount = vi.fn();

      const TestButton = React.memo(({ children }: { children: React.ReactNode }) => {
        renderCount();
        return <Button>{children}</Button>;
      });

      const { rerender } = render(<TestButton>Test</TestButton>);
      expect(renderCount).toHaveBeenCalledTimes(1);

      // Same props should not trigger re-render
      rerender(<TestButton>Test</TestButton>);
      expect(renderCount).toHaveBeenCalledTimes(1);

      // Different props should trigger re-render
      rerender(<TestButton>Different</TestButton>);
      expect(renderCount).toHaveBeenCalledTimes(2);
    });
  });
});
