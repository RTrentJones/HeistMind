import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionInput } from '../lib/motion-safe';
import {
  useComponentIds,
  useFormFieldState,
  useFocusState,
  useInteractiveMotion,
  buildFormFieldAria,
} from '../lib/accessibility';

const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-background-primary px-3 py-2 text-sm text-foreground-primary',
    'transition-all duration-200 ease-in-out',
    'placeholder:text-foreground-muted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'group',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-border-primary focus-visible:border-border-secondary',
          'focus-visible:ring-2 focus-visible:ring-brand-primary',
          'hover:border-border-secondary',
        ],
        glass: [
          'bg-background-glass border-border-secondary backdrop-blur-sm',
          'focus-visible:bg-background-glass/80 focus-visible:border-border-primary',
          'focus-visible:ring-brand-primary/50',
        ],
        neon: [
          'bg-transparent border-2 border-brand-primary/30',
          'focus-visible:border-brand-primary focus-visible:shadow-lg focus-visible:shadow-brand-primary/20',
          'focus-visible:ring-2 focus-visible:ring-brand-primary/50 hover:border-brand-primary/50',
        ],
        ember: [
          'border-game-ember/30 focus-visible:border-game-ember',
          'focus-visible:ring-2 focus-visible:ring-game-ember/50 hover:border-game-ember/50',
        ],
        steel: [
          'border-game-steel/30 focus-visible:border-game-steel',
          'focus-visible:ring-2 focus-visible:ring-game-steel/50 hover:border-game-steel/50',
        ],
        ghost: [
          'border-transparent bg-background-secondary',
          'focus-visible:bg-background-tertiary focus-visible:border-border-primary',
          'hover:bg-background-secondary/80',
        ],
      },
      size: {
        sm: 'h-8 px-2 py-1 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 py-3 text-base',
        xl: 'h-14 px-5 py-4 text-lg',
      },
      state: {
        default: '',
        error: 'border-semantic-error focus-visible:ring-2 focus-visible:ring-semantic-error/50',
        success:
          'border-semantic-success focus-visible:ring-2 focus-visible:ring-semantic-success/50',
        warning:
          'border-semantic-warning focus-visible:ring-2 focus-visible:ring-semantic-warning/50',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface InputBaseProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  success?: string;
  warning?: string;
  /** Whether the field is required for accessibility */
  required?: boolean;
  /** Help text to describe the input */
  helpText?: string;
}

const InputBase = React.memo(
  React.forwardRef<HTMLInputElement, InputBaseProps>(
    (
      {
        className,
        variant,
        size,
        state,
        error,
        success,
        warning,
        disabled,
        required,
        helpText,
        id,
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        'aria-labelledby': ariaLabelledBy,
        'aria-invalid': ariaInvalid,
        'aria-required': ariaRequired,
        ...props
      },
      ref
    ) => {
      const { ids } = useComponentIds('input');
      const { isFocused, onFocus, onBlur } = useFocusState();
      const { resolvedState } = useFormFieldState(error, success, warning, state || 'default');
      const { prefersReducedMotion, getInitialAnimation, getTransitionDuration } =
        useInteractiveMotion(disabled);

      const resolvedId = id || ids.component;

      // Build comprehensive ARIA attributes
      const ariaAttributes = buildFormFieldAria({
        label: ariaLabel,
        describedBy:
          [ariaDescribedBy, helpText ? ids.help : null, error ? ids.error : null]
            .filter(Boolean)
            .join(' ') || undefined,
        required: ariaRequired !== undefined ? Boolean(ariaRequired) : required,
        invalid: ariaInvalid !== undefined ? Boolean(ariaInvalid) : resolvedState === 'error',
        errorMessage: error,
      });

      return (
        <MotionInput
          id={resolvedId}
          className={cn(
            inputVariants({
              variant,
              size,
              state: resolvedState as 'default' | 'error' | 'success' | 'warning',
            }),
            className
          )}
          ref={ref}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          animate={{
            scale: isFocused && !prefersReducedMotion ? 1.005 : 1,
          }}
          transition={{ duration: getTransitionDuration(0.15), ease: 'easeOut' }}
          {...ariaAttributes}
          {...props}
        />
      );
    }
  )
);
InputBase.displayName = 'InputBase';

export { InputBase, inputVariants };
