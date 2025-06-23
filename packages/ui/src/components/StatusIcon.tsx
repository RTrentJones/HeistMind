import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const statusIconVariants = cva(
  ['rounded-full flex items-center justify-center', 'transition-all duration-200 ease-in-out'],
  {
    variants: {
      status: {
        success: 'bg-semantic-success/20 border border-semantic-success text-semantic-success',
        error: 'bg-semantic-error/20 border border-semantic-error text-semantic-error',
        warning: 'bg-semantic-warning/20 border border-semantic-warning text-semantic-warning',
        info: 'bg-semantic-info/20 border border-semantic-info text-semantic-info',
        loading: 'bg-brand-primary/20 border border-brand-primary text-brand-primary',
        neutral: 'bg-background-tertiary border border-border-primary text-foreground-secondary',
      },
      size: {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
        spin: 'animate-spin',
      },
    },
    defaultVariants: {
      status: 'neutral',
      size: 'md',
      animation: 'none',
    },
  }
);

// Default icons for each status
const DEFAULT_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ⓘ',
  loading: '◯',
  neutral: '◯',
} as const;

export interface StatusIconProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof statusIconVariants> {
  /** Custom icon content (overrides default) */
  icon?: React.ReactNode;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** Animate on mount */
  animate?: boolean;
}

const StatusIcon = React.forwardRef<HTMLDivElement, StatusIconProps>(
  (
    {
      className,
      status = 'neutral',
      size,
      animation,
      icon,
      animate = false,
      'aria-label': ariaLabel,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    // Use reduced motion override for animations
    const effectiveAnimation = prefersReducedMotion ? 'none' : animation;

    // Default ARIA labels based on status
    const defaultAriaLabel = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      loading: 'Loading',
      neutral: 'Status',
    }[status || 'neutral'];

    const iconContent = icon || DEFAULT_ICONS[status || 'neutral'];

    const statusIconElement = (
      <div
        ref={ref}
        className={cn(
          statusIconVariants({ status, size, animation: effectiveAnimation }),
          className
        )}
        role='img'
        aria-label={ariaLabel || defaultAriaLabel}
        {...rest}
      >
        {iconContent}
      </div>
    );

    if (!animate || prefersReducedMotion) {
      return statusIconElement;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {statusIconElement}
      </MotionDiv>
    );
  }
);
StatusIcon.displayName = 'StatusIcon';

export { StatusIcon, statusIconVariants };
