import * as React from 'react';
import { cn } from '../lib/utils';
import { MotionDiv, MotionTextarea } from '../lib/motion-safe';
import {
  useComponentIds,
  useFormFieldState,
  useInteractiveMotion,
  buildFormFieldAria,
} from '../lib/accessibility';
import { inputVariants } from './Input';
import { type VariantProps } from 'class-variance-authority';

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  warning?: string;
  helpText?: string;
  resizable?: boolean;
}

const Textarea = React.memo(
  React.forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        helpText,
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

      const { ids } = useComponentIds('textarea');
      const resolvedId = props.id || ids.component;

      const ariaAttributes = buildFormFieldAria({
        label: props['aria-label'] || label,
        describedBy:
          [
            props['aria-describedby'],
            helpText ? ids.help : null,
            message ? ids.error : null,
            label ? ids.label : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        required: props.required,
        invalid: resolvedState === 'error',
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
                props.required && 'after:content-["*"] after:ml-1 after:text-semantic-error'
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

          <MotionTextarea
            id={resolvedId}
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
            {...ariaAttributes}
            {...props}
          />

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
              role='alert'
              aria-live='polite'
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

export { Textarea };
