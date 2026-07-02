import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { MotionButton } from '../lib/motion-safe';
import {
  useComponentIds,
  useLoadingState,
  useInteractiveMotion,
} from '../lib/accessibility';
import { componentDefaults } from '../lib/design-tokens';
import {
  useComponentValidation,
  validateButtonProps,
} from '../lib/validation';

const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
    'transition-all duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary',
    'disabled:pointer-events-none disabled:opacity-50',
    'relative overflow-hidden group',
    // Enhanced interaction states
    'active:scale-[0.98] hover:shadow-lg',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary',
          'text-white shadow-lg shadow-brand-primary/25',
          'hover:shadow-brand-primary/40 hover:shadow-xl',
          'hover:from-brand-secondary hover:via-brand-accent hover:to-brand-secondary',
          'border border-brand-primary/20',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
          'before:translate-x-[-100%] before:transition-transform before:duration-700',
          'hover:before:translate-x-[100%]',
        ],
        destructive: [
          'bg-gradient-to-r from-semantic-error via-semantic-error/80 to-semantic-error',
          'text-white shadow-lg shadow-semantic-error/25',
          'hover:shadow-semantic-error/40 hover:shadow-xl',
          'hover:from-semantic-error/80 hover:via-semantic-error/60 hover:to-semantic-error/80',
          'border border-semantic-error/20',
        ],
        outline: [
          'border-2 border-brand-primary/50 bg-transparent text-brand-primary',
          'hover:bg-brand-primary/10 hover:border-brand-primary',
          'hover:text-brand-accent hover:shadow-lg hover:shadow-brand-primary/20',
          'backdrop-blur-sm',
        ],
        secondary: [
          'bg-gradient-to-r from-background-tertiary via-background-secondary to-background-tertiary',
          'text-foreground-primary border border-border-primary',
          'hover:from-background-secondary hover:via-background-elevated hover:to-background-secondary',
          'hover:shadow-lg hover:shadow-black/20',
        ],
        ghost: [
          'bg-transparent text-brand-primary hover:bg-brand-primary/10',
          'hover:text-brand-accent hover:shadow-md',
        ],
        link: ['text-brand-primary underline-offset-4 hover:underline', 'hover:text-brand-accent'],
        // Game-specific variants
        ember: [
          'bg-gradient-to-r from-game-ember via-game-ember/80 to-game-crimson',
          'text-white shadow-lg shadow-game-ember/25',
          'hover:shadow-game-ember/40 hover:shadow-xl',
          'hover:from-game-ember/80 hover:via-game-ember/60 hover:to-game-crimson/80',
          'border border-game-ember/20',
        ],
        steel: [
          'bg-gradient-to-r from-game-steel via-game-steel/80 to-game-shadow',
          'text-white shadow-lg shadow-game-steel/25',
          'hover:shadow-game-steel/40 hover:shadow-xl',
          'hover:from-game-steel/80 hover:via-game-steel/60 hover:to-game-shadow/80',
          'border border-game-steel/20',
        ],
        shadow: [
          'bg-gradient-to-r from-game-shadow via-background-tertiary to-background-secondary',
          'text-foreground-primary shadow-lg shadow-game-shadow/50',
          'hover:shadow-game-shadow/60 hover:shadow-xl',
          'border border-border-muted',
        ],
        crimson: [
          'bg-gradient-to-r from-game-crimson via-game-crimson/80 to-semantic-error',
          'text-white shadow-lg shadow-game-crimson/25',
          'hover:shadow-game-crimson/40 hover:shadow-xl',
          'hover:from-game-crimson/80 hover:via-game-crimson/60 hover:to-semantic-error/80',
          'border border-game-crimson/20',
        ],
        glass: [
          'bg-background-glass backdrop-blur-md border border-border-secondary',
          'text-foreground-primary hover:bg-background-glass/80',
          'shadow-lg hover:shadow-xl hover:shadow-black/10',
          'hover:border-border-primary',
        ],
        neon: [
          'bg-transparent border-2 border-brand-accent',
          'text-brand-accent hover:text-white',
          'hover:bg-brand-accent hover:shadow-lg hover:shadow-brand-accent/50',
          'transition-all duration-300',
        ],
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      loading: {
        true: 'cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      variant: componentDefaults.button.variant,
      size: componentDefaults.button.size,
      loading: false,
    },
  }
);

const LoadingSpinner = () => (
  <motion.div
    data-testid='loading-spinner'
    className='w-4 h-4 border-2 border-current border-t-transparent rounded-full'
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  />
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** Announce loading state changes to screen readers */
  announceStateChanges?: boolean;
  /** Custom accessible description for the button action */
  accessibleDescription?: string;
}

// Strict type constraints for button variants
export type SafeButtonProps = ButtonProps &
  (
    | { variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link'; asChild?: false }
    | { variant: 'destructive'; asChild?: false; 'aria-label': string }
    | { variant: 'ember' | 'steel' | 'crimson' | 'glass' | 'neon'; asChild?: false }
    | { asChild: true; children: React.ReactElement }
  );

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      children,
      disabled,
      announceStateChanges = true,
      accessibleDescription,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHaspopup,
      'aria-controls': ariaControls,
      'aria-pressed': ariaPressed,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { ids } = useComponentIds('btn');
    const { loadingContent } = useLoadingState(loading, loadingText, announceStateChanges);
    const { motionProps, getInitialAnimation, getTransitionDuration } =
      useInteractiveMotion(isDisabled, loading);

    // Validate button props in development
    useComponentValidation('Button', { variant, size, loading, disabled, asChild, ...rest }, [
      validateButtonProps,
    ]);

    const buttonContent = loading ? (
      <>
        <LoadingSpinner />
        {loadingContent && (
          <>
            <span {...loadingContent.srOnlySpan} />
            <span {...loadingContent.hiddenSpan} />
          </>
        )}
      </>
    ) : (
      children
    );

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, loading, className }))}
          ref={ref}
          {...rest}
        >
          {buttonContent}
        </Slot>
      );
    }

    // Build comprehensive ARIA attributes
    const ariaAttributes = {
      'aria-label': ariaLabel,
      'aria-describedby': accessibleDescription ? ids.description : ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHaspopup,
      'aria-controls': ariaControls,
      'aria-pressed': ariaPressed,
      'aria-disabled': isDisabled,
      'aria-busy': loading,
    };

    return (
      <>
        <MotionButton
          ref={ref}
          className={cn(buttonVariants({ variant, size, loading, className }))}
          disabled={isDisabled}
          initial={getInitialAnimation()}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: getTransitionDuration(), ease: 'easeOut' }}
          {...motionProps}
          {...ariaAttributes}
          {...rest}
        >
          {buttonContent}
        </MotionButton>

        {accessibleDescription && (
          <div id={ids.description} className='sr-only'>
            {accessibleDescription}
          </div>
        )}
      </>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
