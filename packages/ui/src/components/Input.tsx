import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { MotionDiv, MotionInput, MotionTextarea } from '../lib/motion-safe';
import {
  useId,
  useReducedMotion,
  buildFormFieldAria,
  type AriaAttributes,
} from '../lib/accessibility';

const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-background px-3 py-2 text-sm',
    'transition-all duration-200 ease-in-out',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'group',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-zinc-700 focus-visible:border-zinc-600',
          'focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
          'hover:border-zinc-600',
        ],
        glass: [
          'bg-white/5 border-white/10 backdrop-blur-sm',
          'focus-visible:bg-white/10 focus-visible:border-white/20',
          'focus-visible:ring-purple-500/50',
        ],
        neon: [
          'bg-transparent border-2 border-purple-500/30',
          'focus-visible:border-purple-400 focus-visible:shadow-lg focus-visible:shadow-purple-500/20',
          'focus-visible:ring-2 focus-visible:ring-purple-500/50 hover:border-purple-400/50',
        ],
        ember: [
          'border-orange-500/30 focus-visible:border-orange-400',
          'focus-visible:ring-2 focus-visible:ring-orange-500/50 hover:border-orange-400/50',
        ],
        steel: [
          'border-blue-500/30 focus-visible:border-blue-400',
          'focus-visible:ring-2 focus-visible:ring-blue-500/50 hover:border-blue-400/50',
        ],
        ghost: [
          'border-transparent bg-zinc-800/50',
          'focus-visible:bg-zinc-900 focus-visible:border-zinc-700',
          'hover:bg-zinc-800/70',
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
        error: 'border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/50',
        success: 'border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/50',
        warning: 'border-yellow-500 focus-visible:ring-2 focus-visible:ring-yellow-500/50',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants>,
    AriaAttributes {
  label?: string;
  error?: string;
  success?: string;
  warning?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showPasswordToggle?: boolean;
  /** Whether the field is required for accessibility */
  required?: boolean;
  /** Help text to describe the input */
  helpText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      error,
      success,
      warning,
      icon,
      iconPosition = 'left',
      showPasswordToggle = false,
      type,
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
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const prefersReducedMotion = useReducedMotion();

    const inputId = useId('input');
    const labelId = useId('input-label');
    const helpId = useId('input-help');
    const messageId = useId('input-message');

    const resolvedId = id || inputId;

    // Auto-detect state from props
    const resolvedState =
      state !== 'default'
        ? state
        : error
          ? 'error'
          : success
            ? 'success'
            : warning
              ? 'warning'
              : 'default';

    const inputType =
      showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

    const hasIcon = icon || showPasswordToggle;
    const hasLeftIcon = icon && iconPosition === 'left';
    const hasRightIcon = (icon && iconPosition === 'right') || showPasswordToggle;

    const message = error || success || warning;

    // Build comprehensive ARIA attributes
    const ariaAttributes = buildFormFieldAria({
      label: ariaLabel || label,
      describedBy:
        [ariaDescribedBy, helpText ? helpId : null, message ? messageId : null]
          .filter(Boolean)
          .join(' ') || undefined,
      required: ariaRequired ?? required,
      invalid: ariaInvalid ?? resolvedState === 'error',
      errorMessage: error,
    });

    return (
      <div className='space-y-2'>
        {label && (
          <label
            id={labelId}
            htmlFor={resolvedId}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              resolvedState === 'error' && 'text-destructive',
              resolvedState === 'success' && 'text-green-500',
              resolvedState === 'warning' && 'text-yellow-500',
              required && 'after:content-["*"] after:ml-1 after:text-red-500'
            )}
          >
            {label}
          </label>
        )}

        {helpText && (
          <div id={helpId} className='text-sm text-zinc-400'>
            {helpText}
          </div>
        )}

        <MotionDiv
          className='relative'
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          {hasLeftIcon && (
            <div
              className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400'
              aria-hidden='true'
            >
              {icon}
            </div>
          )}

          <MotionInput
            id={resolvedId}
            className={cn(
              inputVariants({ variant, size, state: resolvedState }),
              hasLeftIcon && 'pl-10',
              hasRightIcon && 'pr-10',
              className
            )}
            type={inputType}
            ref={ref}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            animate={{
              scale: isFocused && !prefersReducedMotion ? 1.005 : 1,
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            {...ariaAttributes}
            {...props}
          />

          {hasRightIcon && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2'>
              {showPasswordToggle && type === 'password' ? (
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='text-zinc-400 hover:text-zinc-100 transition-colors'
                  disabled={disabled}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              ) : iconPosition === 'right' ? (
                <div className='text-zinc-400' aria-hidden='true'>
                  {icon}
                </div>
              ) : null}
            </div>
          )}
        </MotionDiv>

        {message && (
          <MotionDiv
            id={messageId}
            className={cn(
              'text-sm',
              resolvedState === 'error' && 'text-destructive',
              resolvedState === 'success' && 'text-green-500',
              resolvedState === 'warning' && 'text-yellow-500'
            )}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            role={resolvedState === 'error' ? 'alert' : 'status'}
            aria-live={resolvedState === 'error' ? 'assertive' : 'polite'}
          >
            {message}
          </MotionDiv>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> &
    VariantProps<typeof inputVariants> & {
      label?: string;
      error?: string;
      success?: string;
      warning?: string;
      resizable?: boolean;
    }
>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      error,
      success,
      warning,
      resizable = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const resolvedState =
      state !== 'default'
        ? state
        : error
          ? 'error'
          : success
            ? 'success'
            : warning
              ? 'warning'
              : 'default';

    const message = error || success || warning;

    return (
      <div className='space-y-2'>
        {label && (
          <label
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              resolvedState === 'error' && 'text-destructive',
              resolvedState === 'success' && 'text-green-500',
              resolvedState === 'warning' && 'text-yellow-500'
            )}
          >
            {label}
          </label>
        )}

        <MotionTextarea
          className={cn(
            inputVariants({ variant, size, state: resolvedState }),
            'min-h-[80px]',
            resizable ? 'resize-y' : 'resize-none',
            className
          )}
          ref={ref}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
          {...props}
        />

        {message && (
          <MotionDiv
            className={cn(
              'text-sm',
              resolvedState === 'error' && 'text-destructive',
              resolvedState === 'success' && 'text-green-500',
              resolvedState === 'warning' && 'text-yellow-500'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {message}
          </MotionDiv>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, inputVariants };
