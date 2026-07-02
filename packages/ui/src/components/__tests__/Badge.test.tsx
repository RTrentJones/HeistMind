/**
 * @vitest-environment jsdom
 */

import { render, screen } from '../../lib/test-utils';
import { Badge } from '../Badge';

describe('Badge Component', () => {
  describe('Basic Rendering', () => {
    it('renders badge with text content', () => {
      render(<Badge>Test Badge</Badge>);

      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('renders badge as div element by default', () => {
      render(<Badge data-testid='badge'>Badge</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('DIV');
    });

    it('applies custom className', () => {
      render(
        <Badge className='custom-class' data-testid='badge'>
          Badge
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies default variant styling', () => {
      render(<Badge data-testid='badge'>Default</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-brand-primary');
      expect(badge).toHaveClass('text-white');
    });

    it('applies secondary variant styling', () => {
      render(
        <Badge variant='secondary' data-testid='badge'>
          Secondary
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-background-secondary');
      expect(badge).toHaveClass('text-foreground-primary');
    });

    it('applies destructive variant styling', () => {
      render(
        <Badge variant='destructive' data-testid='badge'>
          Destructive
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-semantic-error');
      expect(badge).toHaveClass('text-white');
    });

    it('applies outline variant styling', () => {
      render(
        <Badge variant='outline' data-testid='badge'>
          Outline
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('text-foreground-primary');
      expect(badge).toHaveClass('border-border-primary');
    });

    it('applies success variant styling', () => {
      render(
        <Badge variant='success' data-testid='badge'>
          Success
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-semantic-success/20');
      expect(badge).toHaveClass('text-semantic-success');
    });

    it('applies warning variant styling', () => {
      render(
        <Badge variant='warning' data-testid='badge'>
          Warning
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-semantic-warning/20');
      expect(badge).toHaveClass('text-semantic-warning');
    });

    it('applies info variant styling', () => {
      render(
        <Badge variant='info' data-testid='badge'>
          Info
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-semantic-info/20');
      expect(badge).toHaveClass('text-semantic-info');
    });
  });

  describe('Sizes', () => {
    it('applies default size styling', () => {
      render(<Badge data-testid='badge'>Default Size</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
    });

    it('applies small size styling', () => {
      render(
        <Badge size='sm' data-testid='badge'>
          Small
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-2xs');
    });

    it('applies large size styling', () => {
      render(
        <Badge size='lg' data-testid='badge'>
          Large
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Content Handling', () => {
    it('renders text content correctly', () => {
      render(<Badge>Simple text</Badge>);

      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('renders numeric content correctly', () => {
      render(<Badge>{42}</Badge>);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders JSX content correctly', () => {
      render(
        <Badge>
          <span>Icon</span> Text
        </Badge>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('handles empty content gracefully', () => {
      render(<Badge data-testid='badge'></Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      // Badge always contains a span.truncate element even when empty
      const textSpan = badge.querySelector('span.truncate');
      expect(textSpan).toBeInTheDocument();
      expect(textSpan).toBeEmptyDOMElement();
    });

    it('handles whitespace-only content', () => {
      render(<Badge data-testid='badge'> </Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent?.trim()).toBe('');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards HTML attributes correctly', () => {
      render(
        <Badge data-testid='badge' id='test-badge' title='Badge tooltip' role='status'>
          Badge
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('id', 'test-badge');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
      expect(badge).toHaveAttribute('role', 'status');
    });

    it('supports custom data attributes', () => {
      render(
        <Badge data-testid='badge' data-value='123' data-category='ui'>
          Badge
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-value', '123');
      expect(badge).toHaveAttribute('data-category', 'ui');
    });
  });

  describe('Accessibility', () => {
    it('has appropriate role for status badges', () => {
      render(<Badge role='status'>Online</Badge>);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria-label for screen readers', () => {
      render(<Badge aria-label='3 unread messages'>3</Badge>);

      const badge = screen.getByLabelText('3 unread messages');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria-describedby for additional context', () => {
      render(
        <div>
          <Badge aria-describedby='badge-description'>New</Badge>
          <div id='badge-description'>Indicates a new item</div>
        </div>
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-describedby', 'badge-description');
    });

    it('has sufficient color contrast with default styling', () => {
      render(<Badge data-testid='badge'>Default</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-brand-primary');
      expect(badge).toHaveClass('text-white');
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains size on different screen sizes', () => {
      render(<Badge data-testid='badge'>Responsive</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('text-xs'); // Should maintain text size
    });

    it('works with responsive utilities', () => {
      render(
        <Badge className='sm:text-sm md:text-base' data-testid='badge'>
          Responsive Text
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('sm:text-sm');
      expect(badge).toHaveClass('md:text-base');
    });
  });

  describe('Interactive States', () => {
    it('supports hover effects when interactive', () => {
      render(
        <Badge className='hover:bg-primary/80 cursor-pointer' data-testid='badge'>
          Clickable
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('hover:bg-primary/80');
      expect(badge).toHaveClass('cursor-pointer');
    });

    it('can be made focusable for keyboard navigation', () => {
      render(
        <Badge tabIndex={0} role='button' data-testid='badge'>
          Focusable
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('tabIndex', '0');
      expect(badge).toHaveAttribute('role', 'button');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long text content', () => {
      const longText = 'This is a very long badge text that might overflow';
      render(<Badge data-testid='badge'>{longText}</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent(longText);
    });

    it('handles special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<Badge>{specialText}</Badge>);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('handles unicode characters', () => {
      const unicodeText = '🚀 Space 中文 العربية';
      render(<Badge>{unicodeText}</Badge>);

      expect(screen.getByText(unicodeText)).toBeInTheDocument();
    });

    it('handles multiple badges in a container', () => {
      render(
        <div>
          <Badge>First</Badge>
          <Badge>Second</Badge>
          <Badge>Third</Badge>
        </div>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Styling Combinations', () => {
    it('combines variant and size correctly', () => {
      render(
        <Badge variant='destructive' size='lg' data-testid='badge'>
          Large Destructive
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-semantic-error');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
    });

    it('allows custom className to extend defaults', () => {
      render(
        <Badge className='bg-custom text-custom px-10' data-testid='badge'>
          Custom
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-custom');
      expect(badge).toHaveClass('text-custom');
      expect(badge).toHaveClass('px-10');
    });
  });
});
