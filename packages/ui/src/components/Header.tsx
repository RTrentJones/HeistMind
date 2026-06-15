import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion, type AriaAttributes } from '../lib/accessibility';

const headerVariants = cva(
  [
    'w-full border-b border-border-primary',
    'transition-all duration-200 ease-in-out',
    'backdrop-blur-sm',
  ],
  {
    variants: {
      variant: {
        default: 'bg-background-primary/95',
        glass: 'bg-background-glass backdrop-blur-md',
        solid: 'bg-background-primary',
        floating:
          'bg-background-glass backdrop-blur-md border border-border-secondary rounded-lg mx-4 mt-4',
      },
      size: {
        sm: 'py-2',
        default: 'py-4',
        lg: 'py-6',
      },
      sticky: {
        true: 'sticky top-0 z-50',
        false: 'relative',
      },
      shadow: {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      sticky: true,
      shadow: 'sm',
    },
  }
);

const headerContentVariants = cva(
  ['mx-auto flex items-center justify-between w-full', 'px-4 sm:px-6 lg:px-8'],
  {
    variants: {
      maxWidth: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full',
        none: 'max-w-none',
      },
    },
    defaultVariants: {
      maxWidth: '7xl',
    },
  }
);

const headerBrandVariants = cva([
  'flex items-center gap-3',
  'text-foreground-primary font-semibold',
  'transition-colors duration-200',
]);

const headerActionsVariants = cva(['flex items-center gap-3', 'ml-auto']);

export interface HeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color' | 'role'>,
    VariantProps<typeof headerVariants> {
  /** Max width constraint for header content */
  maxWidth?: VariantProps<typeof headerContentVariants>['maxWidth'];
  /** ARIA role override */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA labelledby */
  'aria-labelledby'?: string;
  /** ARIA describedby */
  'aria-describedby'?: string;
}

export interface HeaderBrandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Brand logo element */
  logo?: React.ReactNode;
  /** Whether to make the brand clickable */
  href?: string;
  /** Click handler for brand */
  onClick?: () => void;
  /** ARIA role override */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA labelledby */
  'aria-labelledby'?: string;
  /** ARIA describedby */
  'aria-describedby'?: string;
}

export interface HeaderActionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** ARIA role override */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA labelledby */
  'aria-labelledby'?: string;
  /** ARIA describedby */
  'aria-describedby'?: string;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      className,
      variant,
      size,
      sticky,
      shadow,
      maxWidth,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const ariaAttributes = {
      'aria-label': ariaLabel || 'Main navigation',
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role: role || 'banner',
    };

    return (
      <MotionDiv
        ref={ref}
        className={cn(headerVariants({ variant, size, sticky, shadow }), className)}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
        {...ariaAttributes}
        {...rest}
      >
        <div className={cn(headerContentVariants({ maxWidth }))}>{children}</div>
      </MotionDiv>
    );
  }
);
Header.displayName = 'Header';

const HeaderBrand = React.forwardRef<HTMLDivElement, HeaderBrandProps>(
  (
    {
      className,
      logo,
      href,
      onClick,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role,
      ...rest
    },
    ref
  ) => {
    const ariaAttributes = {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role: role,
    };

    const content = (
      <>
        {logo && (
          <div className='flex-shrink-0' aria-hidden='true'>
            {logo}
          </div>
        )}
        {children}
      </>
    );

    if (href) {
      return (
        <a
          href={href}
          className={cn(
            headerBrandVariants(),
            'hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded-md',
            className
          )}
          {...ariaAttributes}
        >
          {content}
        </a>
      );
    }

    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={cn(
            headerBrandVariants(),
            'hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded-md',
            className
          )}
          {...ariaAttributes}
        >
          {content}
        </button>
      );
    }

    return (
      <div ref={ref} className={cn(headerBrandVariants(), className)} {...ariaAttributes} {...rest}>
        {content}
      </div>
    );
  }
);
HeaderBrand.displayName = 'HeaderBrand';

const HeaderActions = React.forwardRef<HTMLDivElement, HeaderActionsProps>(
  (
    {
      className,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role,
      ...rest
    },
    ref
  ) => {
    const ariaAttributes = {
      'aria-label': ariaLabel || 'Header actions',
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role: role || 'group',
    };

    return (
      <div
        ref={ref}
        className={cn(headerActionsVariants(), className)}
        {...ariaAttributes}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
HeaderActions.displayName = 'HeaderActions';

export { Header, HeaderBrand, HeaderActions, headerVariants };
