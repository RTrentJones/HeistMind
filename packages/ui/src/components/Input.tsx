import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { MotionDiv, MotionInput, MotionTextarea } from '../lib/motion-safe';
import {
  useComponentIds,
  useFormFieldState,
  useFocusState,
  useInteractiveMotion,
  buildFormFieldAria,
  type AriaAttributes,
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
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

const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(
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
      const { ids } = useComponentIds('input');
      const { isFocused, onFocus, onBlur } = useFocusState();
      const { resolvedState, message, messageRole, ariaLive } = useFormFieldState(
        error,
        success,
        warning,
        state || 'default'
      );
      const { prefersReducedMotion, getInitialAnimation, getTransitionDuration } =
        useInteractiveMotion(disabled);

      const resolvedId = id || ids.component;

      const inputType =
        showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

      const hasIcon = icon || showPasswordToggle;
      const hasLeftIcon = icon && iconPosition === 'left';
      const hasRightIcon = (icon && iconPosition === 'right') || showPasswordToggle;

      // Build comprehensive ARIA attributes
      const ariaAttributes = buildFormFieldAria({
        label: ariaLabel || label,
        describedBy:
          [ariaDescribedBy, helpText ? ids.help : null, message ? ids.error : null]
            .filter(Boolean)
            .join(' ') || undefined,
        required: ariaRequired !== undefined ? Boolean(ariaRequired) : required,
        invalid: ariaInvalid !== undefined ? Boolean(ariaInvalid) : resolvedState === 'error',
        errorMessage: error,
      });

      return (
        <div className='space-y-2'>
          {label && (
            <label
              id={ids.label}
              htmlFor={resolvedId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground-primary',
                resolvedState === 'error' && 'text-semantic-error',
                resolvedState === 'success' && 'text-semantic-success',
                resolvedState === 'warning' && 'text-semantic-warning',
                required && 'after:content-["*"] after:ml-1 after:text-semantic-error'
              )}
            >
              {label}
            </label>
          )}

          {helpText && (
            <div id={ids.help} className='text-sm text-foreground-muted'>
              {helpText}
            </div>
          )}

          <MotionDiv
            className='relative'
            initial={getInitialAnimation()}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: getTransitionDuration() }}
          >
            {hasLeftIcon && (
              <div
                className='absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted'
                aria-hidden='true'
              >
                {icon}
              </div>
            )}

            <MotionInput
              id={resolvedId}
              className={cn(
                inputVariants({
                  variant,
                  size,
                  state: resolvedState as 'default' | 'error' | 'success' | 'warning',
                }),
                hasLeftIcon && 'pl-10',
                hasRightIcon && 'pr-10',
                className
              )}
              type={inputType}
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

            {hasRightIcon && (
              <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                {showPasswordToggle && type === 'password' ? (
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='text-foreground-muted hover:text-foreground-primary transition-colors'
                    disabled={disabled}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                ) : iconPosition === 'right' ? (
                  <div className='text-foreground-muted' aria-hidden='true'>
                    {icon}
                  </div>
                ) : null}
              </div>
            )}
          </MotionDiv>

          {message && (
            <MotionDiv
              id={ids.error}
              className={cn(
                'text-sm',
                resolvedState === 'error' && 'text-semantic-error',
                resolvedState === 'success' && 'text-semantic-success',
                resolvedState === 'warning' && 'text-semantic-warning'
              )}
              initial={getInitialAnimation({ opacity: 0, height: 0 })}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: getTransitionDuration() }}
              role={messageRole}
              aria-live={ariaLive as 'polite' | 'assertive' | 'off'}
            >
              {message}
            </MotionDiv>
          )}
        </div>
      );
    }
  )
);
Input.displayName = 'Input';

const Textarea = React.memo(
  React.forwardRef<
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
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground-primary',
                resolvedState === 'error' && 'text-semantic-error',
                resolvedState === 'success' && 'text-semantic-success',
                resolvedState === 'warning' && 'text-semantic-warning'
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
                resolvedState === 'error' && 'text-semantic-error',
                resolvedState === 'success' && 'text-semantic-success',
                resolvedState === 'warning' && 'text-semantic-warning'
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
  )
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, inputVariants };
