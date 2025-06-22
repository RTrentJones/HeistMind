import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { type ComponentProps, type IconProps, type MotionSafeProps } from '../lib/types';
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
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
    'select-none',
  ],
  {
    variants: {
      variant: {
        default: ['border-transparent bg-purple-600 text-white', 'hover:bg-purple-500 shadow-sm'],
        secondary: ['border-transparent bg-zinc-700 text-zinc-100', 'hover:bg-zinc-600'],
        destructive: ['border-transparent bg-red-600 text-white', 'hover:bg-red-500 shadow-sm'],
        outline: ['border-zinc-700 text-zinc-100', 'hover:bg-zinc-800 hover:text-zinc-50'],
        // Glass morphism
        glass: [
          'bg-white/10 border-white/20 text-white backdrop-blur-sm',
          'hover:bg-white/20 hover:border-white/30',
        ],
        // Game-themed variants
        ember: [
          'bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent',
          'hover:from-orange-400 hover:to-red-400 hover:shadow-lg hover:shadow-orange-500/20',
        ],
        steel: [
          'bg-gradient-to-r from-blue-500 to-slate-500 text-white border-transparent',
          'hover:from-blue-400 hover:to-slate-400 hover:shadow-lg hover:shadow-blue-500/20',
        ],
        shadow: [
          'bg-gradient-to-r from-slate-800 to-gray-900 text-gray-200 border-gray-700',
          'hover:from-slate-700 hover:to-gray-800',
        ],
        crimson: [
          'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-transparent',
          'hover:from-rose-400 hover:to-pink-500 hover:shadow-lg hover:shadow-rose-500/20',
        ],
        gold: [
          'bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 border-transparent',
          'hover:from-yellow-300 hover:to-orange-300 shadow-lg',
        ],
        // Status variants
        success: [
          'bg-green-100 text-green-800 border-green-200',
          'hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        ],
        warning: [
          'bg-yellow-100 text-yellow-800 border-yellow-200',
          'hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        ],
        info: [
          'bg-blue-100 text-blue-800 border-blue-200',
          'hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        ],
        // Skill level variants
        novice: [
          'bg-gray-100 text-gray-700 border-gray-300',
          'hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
        ],
        trained: [
          'bg-blue-100 text-blue-700 border-blue-300',
          'hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600',
        ],
        expert: [
          'bg-purple-100 text-purple-700 border-purple-300',
          'hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600',
        ],
        master: [
          'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent',
          'hover:from-purple-400 hover:to-pink-400 hover:shadow-lg hover:shadow-purple-500/20',
        ],
        // Stress level variants
        'stress-low': [
          'bg-green-900/20 text-green-400 border-green-500/40',
          'hover:bg-green-900/30',
        ],
        'stress-medium': [
          'bg-yellow-900/20 text-yellow-400 border-yellow-500/40',
          'hover:bg-yellow-900/30',
        ],
        'stress-high': [
          'bg-orange-900/20 text-orange-400 border-orange-500/40',
          'hover:bg-orange-900/30',
        ],
        'stress-critical': [
          'bg-red-900/20 text-red-400 border-red-500/40',
          'hover:bg-red-900/30 animate-pulse',
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
    AriaAttributes {
  /** Badge content */
  children: React.ReactNode;
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

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
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
                transition: { repeat: Infinity, duration: 2 },
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
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
