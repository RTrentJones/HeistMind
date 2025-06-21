import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { MotionButton } from '../lib/motion-safe';

const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
    'transition-all duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'relative overflow-hidden group',
    // Enhanced interaction states
    'active:scale-[0.98] hover:shadow-lg',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800',
          'text-white shadow-lg shadow-purple-500/25',
          'hover:shadow-purple-500/40 hover:shadow-xl',
          'hover:from-purple-500 hover:via-purple-600 hover:to-purple-700',
          'border border-purple-500/20',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
          'before:translate-x-[-100%] before:transition-transform before:duration-700',
          'hover:before:translate-x-[100%]',
        ],
        destructive: [
          'bg-gradient-to-r from-red-600 via-red-700 to-red-800',
          'text-white shadow-lg shadow-red-500/25',
          'hover:shadow-red-500/40 hover:shadow-xl',
          'hover:from-red-500 hover:via-red-600 hover:to-red-700',
          'border border-red-500/20',
        ],
        outline: [
          'border-2 border-purple-500/50 bg-transparent text-purple-300',
          'hover:bg-purple-500/10 hover:border-purple-400',
          'hover:text-purple-200 hover:shadow-lg hover:shadow-purple-500/20',
          'backdrop-blur-sm',
        ],
        secondary: [
          'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900',
          'text-slate-100 border border-slate-600/50',
          'hover:from-slate-600 hover:via-slate-700 hover:to-slate-800',
          'hover:shadow-lg hover:shadow-slate-500/20',
        ],
        ghost: [
          'bg-transparent text-purple-300 hover:bg-purple-500/10',
          'hover:text-purple-200 hover:shadow-md',
        ],
        link: ['text-purple-400 underline-offset-4 hover:underline', 'hover:text-purple-300'],
        // Game-specific variants
        ember: [
          'bg-gradient-to-r from-orange-600 via-orange-700 to-red-600',
          'text-white shadow-lg shadow-orange-500/25',
          'hover:shadow-orange-500/40 hover:shadow-xl',
          'hover:from-orange-500 hover:via-orange-600 hover:to-red-500',
          'border border-orange-500/20',
        ],
        steel: [
          'bg-gradient-to-r from-blue-600 via-blue-700 to-slate-700',
          'text-white shadow-lg shadow-blue-500/25',
          'hover:shadow-blue-500/40 hover:shadow-xl',
          'hover:from-blue-500 hover:via-blue-600 hover:to-slate-600',
          'border border-blue-500/20',
        ],
        shadow: [
          'bg-gradient-to-r from-slate-900 via-gray-900 to-black',
          'text-gray-100 shadow-lg shadow-black/50',
          'hover:shadow-black/60 hover:shadow-xl',
          'border border-gray-700/30',
        ],
        crimson: [
          'bg-gradient-to-r from-rose-600 via-pink-700 to-red-700',
          'text-white shadow-lg shadow-rose-500/25',
          'hover:shadow-rose-500/40 hover:shadow-xl',
          'hover:from-rose-500 hover:via-pink-600 hover:to-red-600',
          'border border-rose-500/20',
        ],
        glass: [
          'bg-white/5 backdrop-blur-md border border-white/10',
          'text-white hover:bg-white/10',
          'shadow-glass hover:shadow-glass-lg',
          'hover:border-white/20',
        ],
        neon: [
          'bg-transparent border-2 border-purple-400',
          'text-purple-400 hover:text-white',
          'hover:bg-purple-400 hover:shadow-glow-purple',
          'hover:animate-pulse-glow transition-all duration-300',
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
      variant: 'default',
      size: 'default',
      loading: false,
    },
  }
);

const LoadingSpinner = () => (
  <motion.div
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
}

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
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonContent = loading ? (
      <>
        <LoadingSpinner />
        {loadingText || 'Loading...'}
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

    return (
      <MotionButton
        ref={ref}
        className={cn(buttonVariants({ variant, size, loading, className }))}
        disabled={isDisabled}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        {...rest}
      >
        {buttonContent}
      </MotionButton>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
