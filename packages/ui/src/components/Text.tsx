import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const textVariants = cva(['transition-colors duration-200'], {
  variants: {
    variant: {
      default: 'text-foreground-primary',
      primary: 'text-brand-primary',
      secondary: 'text-foreground-secondary',
      muted: 'text-foreground-muted',
      accent: 'text-brand-accent',
      success: 'text-semantic-success',
      warning: 'text-semantic-warning',
      error: 'text-semantic-error',
      info: 'text-semantic-info',
      game: 'text-game-ember',
      subtle: 'text-foreground-tertiary',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    spacing: {
      tight: 'leading-tight',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose',
    },
    decoration: {
      none: 'no-underline',
      underline: 'underline underline-offset-4',
      overline: 'overline',
      'line-through': 'line-through',
    },
    transform: {
      none: 'normal-case',
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      capitalize: 'capitalize',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
    align: 'left',
    spacing: 'normal',
    decoration: 'none',
    transform: 'none',
  },
});

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof textVariants> {
  /** HTML element to render */
  as?: 'p' | 'span' | 'div' | 'label' | 'caption' | 'strong' | 'em' | 'small';
  /** Animate on mount */
  animate?: boolean;
  /** Truncate text with ellipsis */
  truncate?: boolean;
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      className,
      variant,
      size,
      weight,
      align,
      spacing,
      decoration,
      transform,
      as = 'p',
      animate = false,
      truncate = false,
      children,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Element = as;

    const textClasses = cn(
      textVariants({ variant, size, weight, align, spacing, decoration, transform }),
      truncate && 'truncate',
      className
    );

    const content = (
      <Element ref={ref as React.Ref<any>} className={textClasses} {...rest}>
        {children}
      </Element>
    );

    if (!animate || prefersReducedMotion) {
      return content;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {content}
      </MotionDiv>
    );
  }
);
Text.displayName = 'Text';

export { Text, textVariants };
