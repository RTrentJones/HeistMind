import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../lib/accessibility';

const loadingSpinnerVariants = cva(
  ['border-2 border-current border-t-transparent rounded-full', 'transition-all duration-200'],
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
      },
      variant: {
        default: 'text-brand-primary',
        primary: 'text-brand-primary',
        secondary: 'text-foreground-secondary',
        muted: 'text-foreground-muted',
        accent: 'text-brand-accent',
        success: 'text-semantic-success',
        warning: 'text-semantic-warning',
        error: 'text-semantic-error',
        white: 'text-white',
      },
      speed: {
        slow: '', // 2s duration
        normal: '', // 1s duration
        fast: '', // 0.5s duration
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      speed: 'normal',
    },
  }
);

const containerVariants = cva('flex items-center justify-center', {
  variants: {
    spacing: {
      none: '',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    },
  },
  defaultVariants: {
    spacing: 'md',
  },
});

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof loadingSpinnerVariants> {
  /** Loading text to display alongside spinner */
  text?: string;
  /** Text variant styling */
  textVariant?: 'default' | 'muted' | 'secondary';
  /** Spacing between spinner and text */
  spacing?: VariantProps<typeof containerVariants>['spacing'];
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      className,
      size,
      variant,
      speed = 'normal',
      text,
      textVariant = 'default',
      spacing = 'md',
      'aria-label': ariaLabel,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    // Animation durations based on speed
    const getDuration = () => {
      if (prefersReducedMotion) return 0;
      switch (speed) {
        case 'fast':
          return 0.5;
        case 'slow':
          return 2;
        default:
          return 1;
      }
    };

    const spinner = (
      <motion.div
        className={cn(loadingSpinnerVariants({ size, variant }), className)}
        animate={prefersReducedMotion ? {} : { rotate: 360 }}
        transition={{
          duration: getDuration(),
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: 'linear',
        }}
        role='status'
        aria-label={ariaLabel || (text ? `Loading: ${text}` : 'Loading')}
      />
    );

    if (!text) {
      return (
        <div ref={ref} {...rest}>
          {spinner}
        </div>
      );
    }

    const textColorClass = {
      default: 'text-foreground-primary',
      muted: 'text-foreground-muted',
      secondary: 'text-foreground-secondary',
    }[textVariant];

    return (
      <div ref={ref} className={cn(containerVariants({ spacing }))} {...rest}>
        {spinner}
        <span className={cn('text-sm font-medium', textColorClass)}>{text}</span>
      </div>
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, loadingSpinnerVariants };
