import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useComponentIds, useFormFieldState, useInteractiveMotion } from '../lib/accessibility';
import { InputBase, type InputBaseProps } from './InputBase';

export interface InputFieldProps extends InputBaseProps {
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showPasswordToggle?: boolean;
}

const InputField = React.memo(
  React.forwardRef<HTMLInputElement, InputFieldProps>(
    (
      {
        className,
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
        ...props
      },
      ref
    ) => {
      const [showPassword, setShowPassword] = React.useState(false);
      const { ids } = useComponentIds('input');
      const { resolvedState, message, messageRole, ariaLive } = useFormFieldState(
        error,
        success,
        warning,
        props.state || 'default'
      );
      const { prefersReducedMotion, getInitialAnimation, getTransitionDuration } =
        useInteractiveMotion(disabled);

      const resolvedId = id || ids.component;
      const inputType =
        showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

      const hasIcon = icon || showPasswordToggle;
      const hasLeftIcon = icon && iconPosition === 'left';
      const hasRightIcon = (icon && iconPosition === 'right') || showPasswordToggle;

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

            <InputBase
              id={resolvedId}
              className={cn(hasLeftIcon && 'pl-10', hasRightIcon && 'pr-10', className)}
              type={inputType}
              ref={ref}
              disabled={disabled}
              required={required}
              helpText={helpText}
              error={error}
              success={success}
              warning={warning}
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
InputField.displayName = 'InputField';

export { InputField };
