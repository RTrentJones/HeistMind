import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useId, useReducedMotion } from '../lib/accessibility';
import { componentDefaults } from '../lib/design-tokens';

const cardVariants = cva(
  [
    'rounded-xl border text-foreground-primary shadow-lg',
    'transition-all duration-300 ease-out',
    'relative overflow-hidden group',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-background-secondary border-border-primary',
          'hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:border-border-secondary',
          // Hover lifts to `background-elevated`, not `background-tertiary` — the latter is the
          // empty-pip fill, so the old value made empty pips vanish on hover (see StressTracker).
          'hover:bg-background-elevated hover:-translate-y-0.5',
        ],
        glass: [
          'bg-background-glass backdrop-blur-md border-border-secondary',
          'hover:bg-background-glass/80 hover:border-border-primary',
          'shadow-lg hover:shadow-xl hover:shadow-brand-primary/10 hover:-translate-y-0.5',
        ],
        elevated: [
          'bg-background-elevated border-border-secondary',
          'shadow-2xl hover:shadow-black/20 dark:hover:shadow-black/50',
          'hover:border-border-primary hover:-translate-y-1',
        ],
        outline: [
          'bg-transparent border-2 border-brand-primary/30',
          'hover:border-brand-primary hover:bg-brand-primary/5',
          'hover:shadow-lg hover:shadow-brand-primary/25 hover:-translate-y-0.5',
        ],
        gradient: [
          'bg-gradient-to-br from-brand-primary/20 via-background-secondary to-game-steel/20',
          'border border-brand-primary/30',
          'hover:from-brand-primary/30 hover:to-game-steel/30 hover:border-brand-primary/50',
          'hover:shadow-lg hover:shadow-brand-primary/15 hover:-translate-y-0.5',
        ],
        neumorphic: [
          'bg-gradient-to-br from-background-tertiary to-background-secondary',
          'shadow-neu-raised hover:shadow-neu-pressed border-0',
          'hover:scale-[0.995] transition-all duration-200',
        ],
        character: [
          'bg-gradient-to-br from-background-secondary/95 via-background-tertiary/90 to-background-secondary/95',
          'border border-brand-primary/20 backdrop-blur-sm',
          'hover:border-brand-primary/40 hover:shadow-lg hover:shadow-brand-primary/20',
          'before:absolute before:inset-0 before:bg-gradient-to-br before:from-brand-primary/5 before:to-transparent before:opacity-0',
          'hover:before:opacity-100 before:transition-opacity before:duration-300',
        ],
        danger: [
          'bg-gradient-to-br from-semantic-error/20 via-background-secondary to-semantic-error/20',
          'border-semantic-error/30 hover:border-semantic-error/50',
          'hover:shadow-lg hover:shadow-semantic-error/20',
        ],
        success: [
          'bg-gradient-to-br from-semantic-success/20 via-background-secondary to-semantic-success/20',
          'border-semantic-success/30 hover:border-semantic-success/50',
          'hover:shadow-lg hover:shadow-semantic-success/20',
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
      variant: componentDefaults.card.variant,
      size: componentDefaults.card.size,
      interactive: false,
    },
  }
);

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'>,
    VariantProps<typeof cardVariants> {
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
    const ariaAttributes = {
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
      'text-game-steel': variant === 'steel',
      'text-semantic-error': variant === 'crimson',
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
    className={cn('text-sm text-foreground-secondary leading-relaxed', className)}
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
      className={cn('flex items-center pt-4 border-t border-border-secondary', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
