/**
 * Select - the design-system wrapper around a native `<select>`. Replaces the copy-pasted
 * `sel` className string that was duplicated across the app and gives every dropdown a real,
 * associated `<label>` (or an explicit `aria-label` when the label is shown elsewhere) for a11y.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const selectVariants = cva(
  [
    'rounded-md border border-border-primary bg-background-secondary text-foreground-primary',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-background-primary',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      selectSize: {
        sm: 'px-2 py-1 text-sm',
        default: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base',
      },
      state: {
        default: '',
        error: 'border-semantic-error focus-visible:ring-semantic-error/50',
      },
    },
    defaultVariants: {
      selectSize: 'default',
      state: 'default',
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  /** Visible field label, rendered as an associated `<label>`. */
  label?: string;
  /** Render the label for screen readers only (as an `aria-label`) — use when a visual label exists elsewhere. */
  hideLabel?: boolean;
  /** Error message; also flips the control to the error state. */
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      selectSize,
      label,
      hideLabel,
      error,
      id,
      'aria-label': ariaLabel,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const showLabel = Boolean(label) && !hideLabel;

    const control = (
      <select
        id={selectId}
        ref={ref}
        className={cn(
          selectVariants({ selectSize, state: error ? 'error' : 'default' }),
          className
        )}
        aria-label={showLabel ? undefined : (ariaLabel ?? label)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    );

    if (!showLabel && !error) return control;

    return (
      <div className='space-y-1'>
        {showLabel && (
          <label htmlFor={selectId} className='block text-sm font-medium text-foreground-primary'>
            {label}
          </label>
        )}
        {control}
        {error && <p className='text-sm text-semantic-error'>{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select, selectVariants };
