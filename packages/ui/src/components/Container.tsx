import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { MotionDiv } from '../lib/motion-safe';
import { useReducedMotion } from '../lib/accessibility';

const containerVariants = cva(
  [
    'mx-auto w-full',
    'px-4 sm:px-6 lg:px-8', // Responsive horizontal padding
  ],
  {
    variants: {
      maxWidth: {
        xs: 'max-w-xs', // 320px
        sm: 'max-w-sm', // 384px
        md: 'max-w-md', // 448px
        lg: 'max-w-lg', // 512px
        xl: 'max-w-xl', // 576px
        '2xl': 'max-w-2xl', // 672px
        '3xl': 'max-w-3xl', // 768px
        '4xl': 'max-w-4xl', // 896px
        '5xl': 'max-w-5xl', // 1024px
        '6xl': 'max-w-6xl', // 1152px
        '7xl': 'max-w-7xl', // 1280px
        full: 'max-w-full',
        none: 'max-w-none',
        screen: {
          sm: 'max-w-screen-sm', // 640px
          md: 'max-w-screen-md', // 768px
          lg: 'max-w-screen-lg', // 1024px
          xl: 'max-w-screen-xl', // 1280px
          '2xl': 'max-w-screen-2xl', // 1536px
        },
      },
      padding: {
        none: 'px-0',
        sm: 'px-4',
        md: 'px-6 lg:px-8',
        lg: 'px-8 lg:px-12',
        xl: 'px-12 lg:px-16',
      },
      center: {
        true: 'text-center',
        false: '',
      },
    },
    defaultVariants: {
      maxWidth: '7xl',
      padding: 'md',
      center: false,
    },
  }
);

export interface ContainerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color' | 'role'>,
    VariantProps<typeof containerVariants> {
  /** Whether to render as a semantic section */
  asSection?: boolean;
  /** Whether to render as a semantic main element */
  asMain?: boolean;
  /** Whether to render as a semantic article */
  asArticle?: boolean;
  /** Custom max width override */
  customMaxWidth?: string;
  /** ARIA role override */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA labelledby */
  'aria-labelledby'?: string;
  /** ARIA describedby */
  'aria-describedby'?: string;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      maxWidth,
      padding,
      center,
      asSection = false,
      asMain = false,
      asArticle = false,
      customMaxWidth,
      children,
      style,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    // Determine the appropriate semantic element
    const Element = asMain ? 'main' : asSection ? 'section' : asArticle ? 'article' : 'div';

    // Build ARIA attributes
    const ariaAttributes = {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role: role || (Element !== 'div' ? undefined : 'region'),
    };

    // Custom styling for max-width override
    const customStyle = customMaxWidth
      ? {
          ...style,
          maxWidth: customMaxWidth,
        }
      : style;

    return (
      <MotionDiv
        ref={ref}
        className={cn(containerVariants({ maxWidth, padding, center }), className)}
        style={customStyle}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
        {...ariaAttributes}
        {...rest}
      >
        {children}
      </MotionDiv>
    );
  }
);
Container.displayName = 'Container';

export { Container, containerVariants };
