/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { render, screen, testAccessibility, testVariants } from '../../lib/test-utils';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-xl', 'border', 'bg-background-secondary');
    });

    it('applies variant styles correctly', () => {
      const variants = [
        {
          props: { variant: 'default' as const, children: 'Default card' },
          expectedClasses: ['bg-background-secondary', 'border-border-primary'],
        },
        {
          props: { variant: 'danger' as const, children: 'Danger card' },
          expectedClasses: ['semantic-error', 'border-semantic-error'],
        },
        {
          props: { variant: 'elevated' as const, children: 'Elevated card' },
          expectedClasses: ['bg-background-elevated', 'border-border-secondary'],
        },
      ];

      testVariants(Card, variants);
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Test</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<Card>Accessible card</Card>);
      await testAccessibility(container);
    });
  });

  describe('CardHeader', () => {
    it('renders with correct structure', () => {
      render(<CardHeader>Header content</CardHeader>);
      const header = screen.getByText('Header content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      await testAccessibility(container);
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Title');
    });

    it('applies correct styling', () => {
      render(<CardTitle>Styled Title</CardTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none');
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<CardTitle>Accessible Title</CardTitle>);
      await testAccessibility(container);
    });
  });

  describe('CardContent', () => {
    it('renders with correct padding', () => {
      render(<CardContent>Content here</CardContent>);
      const content = screen.getByText('Content here');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('space-y-4');
    });

    it('meets accessibility standards', async () => {
      const { container } = render(<CardContent>Content</CardContent>);
      await testAccessibility(container);
    });
  });

  describe('Complete Card Structure', () => {
    it('renders full card structure correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>This is the card content with some text.</CardContent>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
      expect(screen.getByText('This is the card content with some text.')).toBeInTheDocument();
    });

    it('maintains proper heading hierarchy', () => {
      render(
        <div>
          <h1>Main Title</h1>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
            <CardContent>Content</CardContent>
          </Card>
        </div>
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      const cardHeading = screen.getByRole('heading', { level: 3 });

      expect(mainHeading).toBeInTheDocument();
      expect(cardHeading).toBeInTheDocument();
    });

    it('meets accessibility standards as complete structure', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>This card follows accessibility best practices.</CardContent>
        </Card>
      );

      await testAccessibility(container);
    });
  });

  describe('Interactive Card Behaviors', () => {
    it('handles custom onClick events', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <Card onClick={handleClick} className='cursor-pointer' role='button' tabIndex={0}>
          Clickable card
        </Card>
      );

      const card = screen.getByRole('button');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard interaction when interactive', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <Card
          onClick={handleClick}
          role='button'
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick();
            }
          }}
        >
          Interactive card
        </Card>
      );

      const card = screen.getByRole('button');

      // Test Enter key
      card.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      render(<Card />);
      const card = screen.getByTestId('theme-wrapper').firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
    });

    it('handles invalid props gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Card variant={'invalid' as any}>Card with invalid variant</Card>);

      const card = screen.getByText('Card with invalid variant');
      expect(card).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });
});
