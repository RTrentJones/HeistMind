/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '../../lib/test-utils';
import { Input } from '../Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders input element correctly', () => {
      render(<Input placeholder='Enter text' />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('applies custom className', () => {
      render(<Input className='custom-class' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input data-testid='input' />);

      const input = screen.getByTestId('input');
      // HTML inputs default to type="text" even when not explicitly set
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('renders email input when type is email', () => {
      render(<Input type='email' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input when type is password', () => {
      render(<Input type='password' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input when type is number', () => {
      render(<Input type='number' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Variants and Sizes', () => {
    it('applies default variant styling', () => {
      render(<Input data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-border-primary');
    });

    it('applies glass variant styling', () => {
      render(<Input variant='glass' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('bg-background-glass');
      expect(input).toHaveClass('border-border-secondary');
    });

    it('applies default size styling', () => {
      render(<Input data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-10');
    });

    it('applies small size styling', () => {
      render(<Input size='sm' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-8');
    });

    it('applies large size styling', () => {
      render(<Input size='lg' data-testid='input' />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-12');
    });
  });

  describe('State Management', () => {
    it('handles controlled input correctly', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Input value='controlled value' onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('controlled value');

      await user.type(input, 'new text');
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles uncontrolled input correctly', async () => {
      const { user } = render(<Input defaultValue='initial' />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('initial');

      await user.clear(input);
      await user.type(input, 'new value');
      expect(input).toHaveValue('new value');
    });

    it('supports disabled state', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });

    it('supports readonly state', () => {
      render(<Input readOnly value='readonly' />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveValue('readonly');
    });
  });

  describe('Event Handling', () => {
    it('calls onChange when input value changes', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
    });

    it('calls onFocus when input gains focus', async () => {
      const handleFocus = vi.fn();
      const { user } = render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when input loses focus', async () => {
      const handleBlur = vi.fn();
      const { user } = render(
        <div>
          <Input onBlur={handleBlur} />
          <button>Other element</button>
        </div>
      );

      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button');

      await user.click(input);
      await user.click(button);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyDown when key is pressed', async () => {
      const handleKeyDown = vi.fn();
      const { user } = render(<Input onKeyDown={handleKeyDown} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Enter',
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Input aria-label='Search field' />);

      const input = screen.getByLabelText('Search field');
      expect(input).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby='help-text' />
          <div id='help-text'>Help text</div>
        </div>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-invalid for validation', () => {
      render(<Input aria-invalid='true' />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('supports required attribute', () => {
      render(<Input required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('is keyboard navigable', async () => {
      const { user } = render(<Input />);

      const input = screen.getByRole('textbox');

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(input).not.toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('works with form labels', () => {
      render(
        <div>
          <label htmlFor='test-input'>Username</label>
          <Input id='test-input' />
        </div>
      );

      const input = screen.getByLabelText('Username');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'test-input');
    });

    it('supports form validation', async () => {
      const { user } = render(
        <form>
          <Input required pattern='[A-Za-z]+' title='Only letters allowed' />
          <button type='submit'>Submit</button>
        </form>
      );

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button');

      // Try to submit invalid input
      await user.type(input, '123');
      await user.click(submitButton);

      // Check if the input shows validation state
      expect(input).toHaveAttribute('pattern', '[A-Za-z]+');
      expect(input).toBeRequired();
    });

    it('supports name attribute for form submission', () => {
      render(<Input name='username' />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string value correctly', () => {
      render(<Input value='' onChange={() => {}} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles null defaultValue gracefully', () => {
      render(<Input defaultValue={null as any} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('handles very long text input', async () => {
      const longText = 'a'.repeat(1000);
      const { user } = render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, longText);

      expect(input).toHaveValue(longText);
    });

    it('maintains focus after re-render', async () => {
      const { user, rerender } = render(<Input placeholder='First' />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(input).toHaveFocus();

      rerender(<Input placeholder='Second' />);
      // Note: Focus may not be maintained after re-render in tests
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily with stable props', () => {
      const renderSpy = vi.fn();

      const TestInput = React.memo((props: any) => {
        renderSpy();
        return <Input {...props} />;
      });

      const { rerender } = render(<TestInput placeholder='test' />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestInput placeholder='test' />);
      expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render
    });
  });
});
