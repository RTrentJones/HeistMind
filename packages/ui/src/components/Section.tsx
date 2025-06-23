import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const sectionVariants = cva(['w-full'], {
  variants: {
    variant: {
      default: 'bg-background-primary',
      secondary: 'bg-background-secondary',
      tertiary: 'bg-background-tertiary',
      elevated: 'bg-background-elevated',
      glass: 'bg-background-glass backdrop-blur-md',
      hero: 'bg-gradient-to-br from-background-primary via-background-secondary to-background-tertiary',
      feature: 'bg-background-secondary border-y border-border-primary',
    },
    padding: {
      none: 'py-0',
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
      xl: 'py-20',
      '2xl': 'py-24',
    },
    spacing: {
      none: 'space-y-0',
      sm: 'space-y-4',
      md: 'space-y-6',
      lg: 'space-y-8',
      xl: 'space-y-12',
    },
    width: {
      full: 'w-full',
      container: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
      narrow: 'w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
      wide: 'w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
    },
    position: {
      relative: 'relative',
      sticky: 'sticky top-0 z-10',
      fixed: 'fixed top-0 left-0 right-0 z-50',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    spacing: 'md',
    width: 'container',
    position: 'relative',
  },
});

export interface SectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof sectionVariants> {
  /** Semantic HTML element */
  as?: 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav' | 'div';
  /** Section heading */
  heading?: string;
  /** Section subheading */
  subheading?: string;
  /** Animate on mount */
  animate?: boolean;
  /** Custom background pattern or decoration */
  background?: React.ReactNode;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA labelledby reference */
  'aria-labelledby'?: string;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    {
      className,
      variant,
      padding,
      spacing,
      width,
      position,
      as = 'section',
      heading,
      subheading,
      animate = false,
      background,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Element = as;

    const sectionContent = (
      <Element
        ref={ref as React.Ref<any>}
        className={cn(sectionVariants({ variant, padding, spacing, width, position }), className)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...rest}
      >
        {background && (
          <div className='absolute inset-0 pointer-events-none overflow-hidden'>{background}</div>
        )}

        <div className='relative z-10'>
          {(heading || subheading) && (
            <div className='text-center mb-8'>
              {heading && (
                <h2 className='text-3xl md:text-4xl font-bold text-foreground-primary mb-4'>
                  {heading}
                </h2>
              )}
              {subheading && (
                <p className='text-lg text-foreground-secondary max-w-2xl mx-auto'>{subheading}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </Element>
    );

    if (!animate || prefersReducedMotion) {
      return sectionContent;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {sectionContent}
      </MotionDiv>
    );
  }
);
Section.displayName = 'Section';

export { Section, sectionVariants };
