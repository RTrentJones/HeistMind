import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const stackVariants = cva(['flex'], {
  variants: {
    direction: {
      column: 'flex-col',
      row: 'flex-row',
      'column-reverse': 'flex-col-reverse',
      'row-reverse': 'flex-row-reverse',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
      '3xl': 'gap-16',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    direction: 'column',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
  },
});

export interface StackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof stackVariants> {
  /** Semantic HTML element */
  as?: 'div' | 'section' | 'article' | 'nav' | 'header' | 'footer' | 'main';
  /** Animate children on mount */
  animateChildren?: boolean;
  /** Stagger delay for child animations */
  staggerDelay?: number;
  /** Responsive direction changes */
  responsive?: {
    sm?: VariantProps<typeof stackVariants>['direction'];
    md?: VariantProps<typeof stackVariants>['direction'];
    lg?: VariantProps<typeof stackVariants>['direction'];
    xl?: VariantProps<typeof stackVariants>['direction'];
  };
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction,
      gap,
      align,
      justify,
      wrap,
      as = 'div',
      animateChildren = false,
      staggerDelay = 0.05,
      responsive,
      children,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Element = as;

    // Build responsive direction classes
    const responsiveClasses = responsive
      ? Object.entries(responsive)
          .map(([breakpoint, dir]) => {
            const directionMap = {
              column: 'flex-col',
              row: 'flex-row',
              'column-reverse': 'flex-col-reverse',
              'row-reverse': 'flex-row-reverse',
            };
            return `${breakpoint}:${directionMap[dir as keyof typeof directionMap]}`;
          })
          .join(' ')
      : '';

    const stackClasses = cn(
      stackVariants({ direction, gap, align, justify, wrap }),
      responsiveClasses,
      className
    );

    if (!animateChildren || prefersReducedMotion) {
      return (
        <Element ref={ref as React.Ref<any>} className={stackClasses} {...rest}>
          {children}
        </Element>
      );
    }

    // Animate children with stagger effect
    return (
      <Element ref={ref as React.Ref<any>} className={stackClasses} {...rest}>
        {React.Children.map(children, (child, index) => (
          <MotionDiv
            key={index}
            initial={{
              opacity: 0,
              y: direction && direction.includes('row') ? 0 : 10,
              x: direction && direction.includes('row') ? 10 : 0,
            }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{
              duration: 0.2,
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
Stack.displayName = 'Stack';

export { Stack, stackVariants };
