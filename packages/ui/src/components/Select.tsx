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
    // F102 — never wider than its container: a native <select> sizes to its LONGEST option, so a
    // long contact/ability label blew the BitD wizard out to 438px at 360 and pushed the fixed
    // footer off-screen. Capped (and allowed to shrink in a flex row), the trigger truncates the
    // chosen label with an ellipsis; the option list itself is the platform picker, which wraps.
    'min-w-0 max-w-full truncate',
    'rounded-md border border-border-primary bg-background-secondary text-foreground-primary',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-background-primary',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      selectSize: {
        // Native selects were ~29px tall on phones; every size is a 44px tap target there.
        sm: 'px-2 py-1 text-sm max-sm:min-h-11',
        default: 'px-2 py-1.5 text-sm max-sm:min-h-11',
        lg: 'px-3 py-2 text-base max-sm:min-h-11',
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
  /** Classes for the label/error wrapper (rendered only with a visible label or an error). */
  wrapperClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      selectSize,
      label,
      hideLabel,
      error,
      wrapperClassName,
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
          // Labelled: the control takes its own line under the (inline) label, like Input's.
          showLabel && 'block',
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
      // Same label box + gap as Input (inline, leading-none, space-y-2) so a Select beside an Input
      // lines up label-to-label and control-to-control (F99 — they sat ~4px apart).
      // min-w-0/max-w-full: the wrapper is often the flex item, so it must not take the select's
      // intrinsic (longest-option) width either (F102).
      <div className={cn('min-w-0 max-w-full space-y-2', wrapperClassName)}>
        {showLabel && (
          <label
            htmlFor={selectId}
            className='text-sm font-medium leading-none text-foreground-primary'
          >
            {label}
          </label>
        )}
        {control}
        {error && <p className='text-sm text-semantic-error-fg'>{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select, selectVariants };
