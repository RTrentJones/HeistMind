import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const paragraphVariants = cva(['transition-colors duration-200'], {
  variants: {
    variant: {
      default: 'text-foreground-primary',
      secondary: 'text-foreground-secondary',
      muted: 'text-foreground-muted',
      accent: 'text-brand-accent',
      lead: 'text-foreground-primary text-lg font-medium',
      caption: 'text-foreground-tertiary text-sm',
      description: 'text-foreground-secondary',
    },
    size: {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    spacing: {
      none: 'mb-0',
      tight: 'mb-2',
      normal: 'mb-4',
      relaxed: 'mb-6',
      loose: 'mb-8',
    },
    maxWidth: {
      none: 'max-w-none',
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      prose: 'max-w-prose',
    },
    align: {
      left: 'text-left',
      center: 'text-center mx-auto',
      right: 'text-right ml-auto',
      justify: 'text-justify',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    spacing: 'normal',
    maxWidth: 'none',
    align: 'left',
  },
});

export interface ParagraphProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'color'>,
    VariantProps<typeof paragraphVariants> {
  /** Animate on mount */
  animate?: boolean;
  /** Custom leading text span */
  leadingText?: string;
}

const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  (
    {
      className,
      variant,
      size,
      spacing,
      maxWidth,
      align,
      animate = false,
      leadingText,
      children,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const content = (
      <p
        ref={ref}
        className={cn(paragraphVariants({ variant, size, spacing, maxWidth, align }), className)}
        {...rest}
      >
        {leadingText && <span className='font-semibold text-brand-fg mr-2'>{leadingText}</span>}
        {children}
      </p>
    );

    if (!animate || prefersReducedMotion) {
      return content;
    }

    return (
      <MotionDiv
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      >
        {content}
      </MotionDiv>
    );
  }
);
Paragraph.displayName = 'Paragraph';

export { Paragraph, paragraphVariants };
