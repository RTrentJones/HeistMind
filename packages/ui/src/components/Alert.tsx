/**
 * Alert Component
 * Displays important messages to users with appropriate visual styling and accessibility
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'flex items-start gap-3',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: ['bg-background-secondary border-border-primary', 'text-foreground-primary'],
        destructive: [
          'bg-semantic-error/10 border-semantic-error/20',
          'text-semantic-error-fg',
          '[&>svg]:text-semantic-error-fg',
        ],
        warning: [
          'bg-semantic-warning/10 border-semantic-warning/20',
          'text-semantic-warning-fg',
          '[&>svg]:text-semantic-warning-fg',
        ],
        success: [
          'bg-semantic-success/10 border-semantic-success/20',
          'text-semantic-success-fg',
          '[&>svg]:text-semantic-success-fg',
        ],
        info: [
          'bg-semantic-info/10 border-semantic-info/20',
          'text-semantic-info-fg',
          '[&>svg]:text-semantic-info-fg',
        ],
      },
      size: {
        sm: 'p-3 text-sm',
        default: 'p-4',
        lg: 'p-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const getIcon = (variant: string) => {
  switch (variant) {
    case 'destructive':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle;
    case 'info':
      return Info;
    default:
      return AlertCircle;
  }
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Whether to show the default icon */
  showIcon?: boolean;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      dismissible = false,
      onDismiss,
      icon,
      showIcon = true,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);
    const IconComponent = getIcon(variant || 'default');

    const handleDismiss = () => {
      setIsVisible(false);
      try {
        onDismiss?.();
      } catch (error) {
        console.error('Error in onDismiss handler:', error);
      }
    };

    if (!isVisible) {
      return null;
    }

    return (
      <div
        ref={ref}
        role='alert'
        aria-live='polite'
        className={cn(alertVariants({ variant, size }), className)}
        {...props}
      >
        {showIcon && (
          <div className='flex-shrink-0'>{icon || <IconComponent className='h-4 w-4' />}</div>
        )}

        <div className='flex-1 min-w-0'>{children}</div>

        {dismissible && (
          <button
            type='button'
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 rounded-sm opacity-70 transition-opacity',
              'hover:opacity-100 focus:outline-none focus:ring-2',
              'focus:ring-brand-primary focus:ring-offset-2',
              'focus:ring-offset-background-primary'
            )}
            aria-label='Dismiss alert'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  )
);

AlertTitle.displayName = 'AlertTitle';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props}>
      {children}
    </div>
  )
);

AlertDescription.displayName = 'AlertDescription';
