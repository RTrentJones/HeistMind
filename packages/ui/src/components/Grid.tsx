import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const gridVariants = cva(['grid w-full'], {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
      12: 'grid-cols-12',
      auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
      'auto-sm': 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
      'auto-lg': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-items-start',
      center: 'justify-items-center',
      end: 'justify-items-end',
      stretch: 'justify-items-stretch',
    },
  },
  defaultVariants: {
    cols: 'auto',
    gap: 'md',
    align: 'stretch',
    justify: 'stretch',
  },
});

export interface GridProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof gridVariants> {
  /** Semantic HTML element */
  as?: 'div' | 'section' | 'article';
  /** Animate children on mount */
  animateChildren?: boolean;
  /** Stagger delay for child animations */
  staggerDelay?: number;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols,
      gap,
      align,
      justify,
      as = 'div',
      animateChildren = false,
      staggerDelay = 0.1,
      children,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Element = as;

    if (!animateChildren || prefersReducedMotion) {
      return (
        <Element
          ref={ref as React.Ref<never>}
          className={cn(gridVariants({ cols, gap, align, justify }), className)}
          {...rest}
        >
          {children}
        </Element>
      );
    }

    // Animate children with stagger effect
    return (
      <Element
        ref={ref as React.Ref<never>}
        className={cn(gridVariants({ cols, gap, align, justify }), className)}
        {...rest}
      >
        {React.Children.map(children, (child, index) => (
          <MotionDiv
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * staggerDelay,
              ease: 'easeOut',
            }}
          >
            {child}
          </MotionDiv>
        ))}
      </Element>
    );
  }
);
Grid.displayName = 'Grid';

export { Grid, gridVariants };
