// packages/ui/src/components/layout/Header.tsx
import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60',
          className
        )}
        {...props}
      >
        <div className='container mx-auto flex h-16 items-center justify-between px-4'>
          {children}
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';

export interface HeaderBrandProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const HeaderBrand = forwardRef<HTMLDivElement, HeaderBrandProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center space-x-2', className)} {...props}>
        {children}
      </div>
    );
  }
);

HeaderBrand.displayName = 'HeaderBrand';

export interface HeaderNavProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const HeaderNav = forwardRef<HTMLElement, HeaderNavProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('hidden md:flex md:items-center md:space-x-6', className)}
        {...props}
      >
        {children}
      </nav>
    );
  }
);

HeaderNav.displayName = 'HeaderNav';

export interface HeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const HeaderActions = forwardRef<HTMLDivElement, HeaderActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center space-x-3', className)} {...props}>
        {children}
      </div>
    );
  }
);

HeaderActions.displayName = 'HeaderActions';
