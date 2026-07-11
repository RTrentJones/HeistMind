import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { type IconProps, type MotionSafeProps } from '../lib/types';
import { MotionDiv } from '../lib/motion-safe';
import {
  useReducedMotion,
  buildGameComponentAria,
  type AriaAttributes,
} from '../lib/accessibility';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-primary',
    'select-none',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-transparent bg-brand-primary text-white',
          'hover:bg-brand-secondary shadow-sm',
        ],
        secondary: [
          'border-transparent bg-background-secondary text-foreground-primary',
          'hover:bg-background-tertiary',
        ],
        destructive: [
          'border-transparent bg-semantic-error text-white',
          'hover:bg-semantic-error/80 shadow-sm',
        ],
        outline: [
          'border-border-primary text-foreground-primary',
          'hover:bg-background-secondary hover:text-foreground-primary',
        ],
        // Glass morphism
        glass: [
          'bg-background-glass border-border-secondary text-foreground-primary backdrop-blur-sm',
          'hover:bg-background-glass/80 hover:border-border-primary',
        ],
        // Game-themed variants
        ember: [
          'bg-gradient-to-r from-game-ember to-game-crimson text-white border-transparent',
          'hover:from-game-ember/80 hover:to-game-crimson/80 hover:shadow-lg hover:shadow-game-ember/20',
        ],
        steel: [
          'bg-gradient-to-r from-game-steel to-game-shadow text-white border-transparent',
          'hover:from-game-steel/80 hover:to-game-shadow/80 hover:shadow-lg hover:shadow-game-steel/20',
        ],
        shadow: [
          'bg-gradient-to-r from-game-shadow to-background-tertiary text-foreground-primary border-border-primary',
          'hover:from-game-shadow/80 hover:to-background-tertiary/80',
        ],
        crimson: [
          'bg-gradient-to-r from-game-crimson to-semantic-error text-white border-transparent',
          'hover:from-game-crimson/80 hover:to-semantic-error/80 hover:shadow-lg hover:shadow-game-crimson/20',
        ],
        gold: [
          'bg-gradient-to-r from-game-gold to-semantic-warning text-black border-transparent',
          'hover:from-game-gold/80 hover:to-semantic-warning/80 shadow-lg',
        ],
        // Status variants — tinted fills take the `-fg` TEXT tokens (F87: the fill colors are
        // below AA as small text on the tinted dark backgrounds).
        success: [
          'bg-semantic-success/20 text-semantic-success-fg border-semantic-success/30',
          'hover:bg-semantic-success/30',
        ],
        warning: [
          'bg-semantic-warning/20 text-semantic-warning-fg border-semantic-warning/30',
          'hover:bg-semantic-warning/30',
        ],
        info: [
          'bg-semantic-info/20 text-semantic-info-fg border-semantic-info/30',
          'hover:bg-semantic-info/30',
        ],
        // Skill level variants
        novice: [
          'bg-foreground-muted/20 text-foreground-secondary border-foreground-muted/30',
          'hover:bg-foreground-muted/30',
        ],
        trained: [
          'bg-semantic-info/20 text-semantic-info-fg border-semantic-info/30',
          'hover:bg-semantic-info/30',
        ],
        expert: [
          'bg-brand-primary/20 text-brand-fg border-brand-primary/30',
          'hover:bg-brand-primary/30',
        ],
        master: [
          'bg-gradient-to-r from-brand-primary to-brand-accent text-white border-transparent',
          'hover:from-brand-primary/80 hover:to-brand-accent/80 hover:shadow-lg hover:shadow-brand-primary/20',
        ],
        // Stress level variants
        'stress-low': [
          'bg-semantic-success/20 text-semantic-success-fg border-semantic-success/40',
          'hover:bg-semantic-success/30',
        ],
        'stress-medium': [
          'bg-semantic-warning/20 text-semantic-warning-fg border-semantic-warning/40',
          'hover:bg-semantic-warning/30',
        ],
        'stress-high': [
          'bg-game-ember/20 text-game-ember-fg border-game-ember/40',
          'hover:bg-game-ember/30',
        ],
        'stress-critical': [
          // pulse-glow, not animate-pulse: the opacity pulse dimmed the text through the
          // background mid-frame and failed AA (F87) — the glow keeps text contrast constant.
          'bg-semantic-error/20 text-semantic-error-fg border-semantic-error/40',
          'hover:bg-semantic-error/30 animate-pulse-glow motion-reduce:animate-none',
        ],
      },
      size: {
        sm: 'px-2 py-0.5 text-2xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-base',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-105 active:scale-95',
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

export interface BadgeProps
  extends MotionSafeProps,
    IconProps,
    VariantProps<typeof badgeVariants>,
    // MotionSafeProps re-declares a few handlers with HTMLElement targets, so omit the overlap.
    Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionSafeProps> {
  /** Badge content */
  children?: React.ReactNode;
  /** Callback when remove button is clicked. Shows a remove button when provided. */
  onRemove?: () => void;
  /** Whether the badge should pulse with animation */
  pulse?: boolean;
  /** Component size variant */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  /** Badge semantic role for accessibility */
  badgeRole?: 'status' | 'skill' | 'action' | 'inventory' | 'character';
  /** Accessible description for complex badges */
  accessibleDescription?: string;
}

const Badge = React.memo(
  React.forwardRef<HTMLDivElement, BadgeProps>(
    (
      {
        className,
        variant,
        size,
        interactive,
        icon,
        onRemove,
        pulse = false,
        children,
        onClick,
        badgeRole,
        accessibleDescription,
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        role,
        ...rest
      },
      ref
    ) => {
      const prefersReducedMotion = useReducedMotion();
      const isClickable = interactive || onClick || onRemove;

      // Build game-specific ARIA attributes
      const gameAriaAttributes = buildGameComponentAria({
        gameRole: badgeRole,
        description: accessibleDescription,
      });

      const ariaAttributes: AriaAttributes = {
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy || gameAriaAttributes['aria-describedby'],
        role: role || 'status',
        ...(isClickable && { tabIndex: 0 }),
      };

      return (
        <MotionDiv
          ref={ref}
          className={cn(badgeVariants({ variant, size, interactive: !!isClickable, className }))}
          onClick={onClick}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
          animate={
            pulse && !prefersReducedMotion
              ? {
                  opacity: 1,
                  scale: [1, 1.05, 1],
                  // Repeat SCALE only — a blanket repeat also looped the mount fade, cycling
                  // opacity 0→1 forever and dimming the text below AA mid-frame (F87).
                  transition: {
                    opacity: { duration: 0.2, ease: 'easeOut' },
                    scale: { repeat: Infinity, duration: 2 },
                  },
                }
              : {
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
          {...(isClickable &&
            !prefersReducedMotion && {
              whileHover: { scale: 1.05 },
              whileTap: { scale: 0.95 },
            })}
          {...ariaAttributes}
          {...rest}
        >
          {icon && (
            <span className='flex-shrink-0' aria-hidden='true'>
              {icon}
            </span>
          )}
          <span className='truncate'>{children}</span>
          {onRemove && (
            <button
              type='button'
              onClick={e => {
                e.stopPropagation();
                onRemove();
              }}
              className='flex-shrink-0 ml-1 rounded-full hover:bg-white/20 p-0.5 transition-colors'
              aria-label='Remove badge'
              tabIndex={-1}
            >
              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20' aria-hidden='true'>
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          )}

          {accessibleDescription && !ariaDescribedBy && (
            <span className='sr-only'>{accessibleDescription}</span>
          )}
        </MotionDiv>
      );
    }
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
