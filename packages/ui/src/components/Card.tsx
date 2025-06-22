import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useId, useReducedMotion, type AriaAttributes } from '../lib/accessibility';

const cardVariants = cva(
  [
    'rounded-xl border text-card-foreground shadow-lg',
    'transition-all duration-300 ease-out',
    'relative overflow-hidden group',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-zinc-900 border-zinc-800',
          'hover:shadow-xl hover:shadow-zinc-900/50 hover:border-zinc-700',
          'hover:bg-zinc-800/90 hover:-translate-y-0.5',
        ],
        glass: [
          'bg-white/5 backdrop-blur-md border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'shadow-glass hover:shadow-glass-lg',
        ],
        elevated: [
          'bg-zinc-900 border-zinc-800/50',
          'shadow-2xl hover:shadow-zinc-900/50',
          'hover:border-zinc-700 hover:-translate-y-1',
        ],
        outline: [
          'bg-transparent border-2 border-purple-500/30',
          'hover:border-purple-400/50 hover:bg-purple-500/5',
          'hover:shadow-glow-purple-sm',
        ],
        gradient: [
          'bg-gradient-to-br from-purple-900/20 via-zinc-900 to-blue-900/20',
          'border border-purple-500/30',
          'hover:from-purple-800/30 hover:to-blue-800/30',
        ],
        neumorphic: [
          'bg-gradient-to-br from-slate-800 to-slate-900',
          'shadow-neu-raised hover:shadow-neu-flat',
          'border-0',
        ],
        character: [
          'bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95',
          'border border-purple-500/20 backdrop-blur-sm',
          'hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/20',
          'before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/5 before:to-transparent before:opacity-0',
          'hover:before:opacity-100 before:transition-opacity before:duration-300',
        ],
        danger: [
          'bg-gradient-to-br from-red-900/20 via-zinc-900 to-red-900/20',
          'border-red-500/30 hover:border-red-400/50',
          'hover:shadow-lg hover:shadow-red-500/20',
        ],
        success: [
          'bg-gradient-to-br from-green-900/20 via-zinc-900 to-green-900/20',
          'border-green-500/30 hover:border-green-400/50',
          'hover:shadow-lg hover:shadow-green-500/20',
        ],
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
    },
  }
);

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'>,
    VariantProps<typeof cardVariants>,
    AriaAttributes {
  asChild?: boolean;
  /** Card semantic role for screen readers */
  cardRole?: 'article' | 'section' | 'region' | 'banner' | 'complementary' | 'contentinfo';
  /** Accessible heading for the card */
  accessibleTitle?: string;
  /** Whether the card represents important content */
  landmark?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      size,
      interactive,
      asChild,
      children,
      cardRole,
      accessibleTitle,
      landmark,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const titleId = useId('card-title');

    // Build comprehensive ARIA attributes
    const ariaAttributes: AriaAttributes = {
      'aria-label': ariaLabel || accessibleTitle,
      'aria-labelledby': ariaLabelledBy || (accessibleTitle ? titleId : undefined),
      'aria-describedby': ariaDescribedBy,
      role: role || cardRole || (landmark ? 'region' : undefined),
    };

    if (asChild) {
      return (
        <MotionDiv
          className={cn(cardVariants({ variant, size, interactive, className }))}
          ref={ref}
          {...ariaAttributes}
          {...rest}
        >
          {children}
        </MotionDiv>
      );
    }

    return (
      <>
        <MotionDiv
          className={cn(cardVariants({ variant, size, interactive, className }))}
          ref={ref}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
          whileHover={interactive && !prefersReducedMotion ? { scale: 1.02, y: -2 } : undefined}
          whileTap={interactive && !prefersReducedMotion ? { scale: 0.98 } : undefined}
          {...ariaAttributes}
          {...rest}
        >
          {children}
        </MotionDiv>

        {accessibleTitle && !ariaLabel && !ariaLabelledBy && (
          <h2 id={titleId} className='sr-only'>
            {accessibleTitle}
          </h2>
        )}
      </>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    variant?: 'default' | 'gradient' | 'ember' | 'steel' | 'crimson';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const titleClasses = cn(
    'text-2xl font-semibold leading-none tracking-tight',
    {
      'text-gradient': variant === 'gradient',
      'text-gradient-ember': variant === 'ember',
      'text-blue-400': variant === 'steel',
      'text-red-400': variant === 'crimson',
    },
    className
  );

  return <h3 ref={ref} className={titleClasses} {...props} />;
});
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 border-t border-border/50', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
