import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';
import { StatusIcon } from './StatusIcon';
import { Button } from './Button';

const errorDisplayVariants = cva(['rounded-lg border p-4', 'transition-all duration-200'], {
  variants: {
    variant: {
      // text-semantic-error-fg, not -error: the fill color is below AA as small TEXT (F87).
      default: 'bg-semantic-error/10 border-semantic-error/20 text-semantic-error-fg',
      subtle: 'bg-background-secondary border-border-primary text-foreground-primary',
      solid: 'bg-semantic-error text-white border-semantic-error',
      outline: 'bg-transparent border-semantic-error text-semantic-error-fg',
    },
    size: {
      sm: 'p-3 text-sm',
      md: 'p-4 text-base',
      lg: 'p-6 text-lg',
    },
    layout: {
      inline: 'flex items-center gap-3',
      stacked: 'space-y-3',
      centered: 'text-center space-y-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    layout: 'stacked',
  },
});

const errorContentVariants = cva('', {
  variants: {
    layout: {
      inline: 'flex-1',
      stacked: '',
      centered: '',
    },
  },
});

export interface ErrorDisplayProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof errorDisplayVariants> {
  /** Error title/heading */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Custom error icon */
  icon?: React.ReactNode;
  /** Hide default error icon */
  hideIcon?: boolean;
  /** Retry action */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Dismiss action */
  onDismiss?: () => void;
  /** Additional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'outline' | 'ghost' | 'secondary';
  };
  /** Animate on mount */
  animate?: boolean;
}

const ErrorDisplay = React.forwardRef<HTMLDivElement, ErrorDisplayProps>(
  (
    {
      className,
      variant,
      size,
      layout = 'stacked',
      title,
      message,
      icon,
      hideIcon = false,
      onRetry,
      retryText = 'Try Again',
      onDismiss,
      action,
      animate = false,
      children,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const errorIcon = !hideIcon && (
      <StatusIcon
        status='error'
        size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
        icon={icon}
        className={layout === 'centered' ? 'mx-auto' : ''}
      />
    );

    const errorContent = (
      <div className={cn(errorContentVariants({ layout }))}>
        {title && (
          <h4
            className={cn(
              'font-semibold',
              size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
            )}
          >
            {title}
          </h4>
        )}
        {/* Full-strength text: the old /80 and /70 opacities composited the already-borderline
            error color into the tinted background and failed AA outright (F87). */}
        {message && (
          <p
            className={cn(
              size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm',
              title && 'mt-1'
            )}
          >
            {message}
          </p>
        )}
        {children && <div className={cn((title || message) && 'mt-2')}>{children}</div>}
      </div>
    );

    const actions = (onRetry || onDismiss || action) && (
      <div
        className={cn(
          'flex gap-2',
          layout === 'centered' ? 'justify-center' : layout === 'inline' ? 'ml-auto' : 'mt-3'
        )}
      >
        {onRetry && (
          <Button
            variant='outline'
            size={size === 'lg' ? 'default' : 'sm'}
            onClick={onRetry}
            className='border-current text-current hover:bg-current/10'
          >
            {retryText}
          </Button>
        )}
        {action && (
          <Button
            variant={action.variant || 'ghost'}
            size={size === 'lg' ? 'default' : 'sm'}
            onClick={action.onClick}
            className='text-current hover:bg-current/10'
          >
            {action.label}
          </Button>
        )}
        {onDismiss && (
          <Button
            variant='ghost'
            size={size === 'lg' ? 'icon' : 'icon-sm'}
            onClick={onDismiss}
            className='text-current hover:bg-current/10'
            aria-label='Dismiss error'
          >
            ✕
          </Button>
        )}
      </div>
    );

    const errorElement = (
      <div
        ref={ref}
        className={cn(errorDisplayVariants({ variant, size, layout }), className)}
        role='alert'
        aria-live='polite'
        {...rest}
      >
        {layout === 'inline' ? (
          <>
            {errorIcon}
            {errorContent}
            {actions}
          </>
        ) : (
          <>
            {errorIcon}
            {errorContent}
            {actions}
          </>
        )}
      </div>
    );

    if (!animate || prefersReducedMotion) {
      return errorElement;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {errorElement}
      </MotionDiv>
    );
  }
);
ErrorDisplay.displayName = 'ErrorDisplay';

export { ErrorDisplay, errorDisplayVariants };
