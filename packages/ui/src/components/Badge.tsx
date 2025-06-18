// packages/ui/src/components/Badge.tsx
import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-900 text-primary-200',
        secondary: 'border-transparent bg-neutral-800 text-neutral-200',
        destructive: 'border-transparent bg-error-dark text-error-light',
        outline: 'border border-neutral-700 text-neutral-200',
        success: 'border-transparent bg-success-dark text-success-light',
        warning: 'border-transparent bg-warning-dark text-warning-light',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
