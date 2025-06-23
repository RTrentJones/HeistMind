import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const headingVariants = cva(
  ['font-semibold tracking-tight', 'text-foreground-primary', 'transition-colors duration-200'],
  {
    variants: {
      level: {
        h1: 'text-4xl md:text-6xl font-bold',
        h2: 'text-3xl md:text-4xl font-bold',
        h3: 'text-2xl md:text-3xl font-semibold',
        h4: 'text-xl md:text-2xl font-semibold',
        h5: 'text-lg md:text-xl font-medium',
        h6: 'text-base md:text-lg font-medium',
      },
      variant: {
        default: 'text-foreground-primary',
        primary: 'text-brand-primary',
        secondary: 'text-foreground-secondary',
        muted: 'text-foreground-muted',
        accent: 'text-brand-accent',
        gradient:
          'bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent',
        hero: 'bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary bg-clip-text text-transparent',
        game: 'text-game-ember',
        danger: 'text-semantic-error',
        success: 'text-semantic-success',
        warning: 'text-semantic-warning',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      spacing: {
        tight: 'leading-tight',
        normal: 'leading-normal',
        relaxed: 'leading-relaxed',
      },
    },
    defaultVariants: {
      level: 'h2',
      variant: 'default',
      align: 'left',
      spacing: 'tight',
    },
  }
);

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'color'>,
    VariantProps<typeof headingVariants> {
  /** Semantic heading level */
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Custom element override */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span';
  /** Animate on mount */
  animate?: boolean;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    { className, level = 'h2', variant, align, spacing, as, animate = false, children, ...rest },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Element = as || level;

    const content = (
      <Element
        ref={ref}
        className={cn(headingVariants({ level, variant, align, spacing }), className)}
        {...rest}
      >
        {children}
      </Element>
    );

    if (!animate || prefersReducedMotion) {
      return content;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {content}
      </MotionDiv>
    );
  }
);
Heading.displayName = 'Heading';

export { Heading, headingVariants };
