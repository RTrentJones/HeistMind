import * as React from 'react';
import { cn } from '../lib/utils';
import { MotionDiv, MotionTextarea } from '../lib/motion-safe';
import { useFormFieldState, useInteractiveMotion } from '../lib/accessibility';
import { inputVariants } from './InputBase';
import { type VariantProps } from 'class-variance-authority';

export interface TextareaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  warning?: string;
  resizable?: boolean;
}

const TextareaField = React.memo(
  React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
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
      const { resolvedState, message } = useFormFieldState(
        error,
        success,
        warning,
        state || 'default'
      );
      const { prefersReducedMotion, getInitialAnimation, getTransitionDuration } =
        useInteractiveMotion(disabled);

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
              inputVariants({
                variant,
                size,
                state: resolvedState as 'default' | 'error' | 'success' | 'warning',
              }),
              'min-h-[80px]',
              resizable ? 'resize-y' : 'resize-none',
              className
            )}
            ref={ref}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            initial={getInitialAnimation()}
            animate={{
              opacity: 1,
              y: 0,
              scale: isFocused && !prefersReducedMotion ? 1.01 : 1,
            }}
            transition={{ duration: getTransitionDuration() }}
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
              initial={getInitialAnimation({ opacity: 0, height: 0 })}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: getTransitionDuration() }}
            >
              {message}
            </MotionDiv>
          )}
        </div>
      );
    }
  )
);
TextareaField.displayName = 'TextareaField';

export { TextareaField };
