import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './Button';
import { useTheme, type ThemeMode } from '../lib/theme';
import { cn } from '../lib/utils';
import { tokens } from '../lib/design-tokens';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

const ThemeToggle = React.memo(
  React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
    ({ className, size = 'icon', variant = 'ghost', showLabel = false }, ref) => {
      const { mode, setMode, resolvedMode } = useTheme();

      const cycleTheme = () => {
        const modes: ThemeMode[] = ['light', 'dark', 'system'];
        const currentIndex = modes.indexOf(mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        if (nextMode) {
          setMode(nextMode);
        }
      };

      const getIcon = () => {
        switch (mode) {
          case 'light':
            return <Sun className='h-4 w-4' />;
          case 'dark':
            return <Moon className='h-4 w-4' />;
          case 'system':
            return <Monitor className='h-4 w-4' />;
          default:
            return <Monitor className='h-4 w-4' />;
        }
      };

      const getLabel = () => {
        switch (mode) {
          case 'light':
            return 'Light mode';
          case 'dark':
            return 'Dark mode';
          case 'system':
            return 'System theme';
          default:
            return 'Theme';
        }
      };

      const getAccessibleLabel = () => {
        const current = getLabel();
        const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
        return `Current theme: ${current}. Click to switch to ${next} mode.`;
      };

      return (
        <Button
          ref={ref}
          variant={variant}
          size={size}
          onClick={cycleTheme}
          className={cn(
            'transition-all duration-200',
            resolvedMode === 'dark' && variant === 'ghost' && 'hover:bg-zinc-800',
            resolvedMode === 'light' && variant === 'ghost' && 'hover:bg-zinc-100',
            className
          )}
          aria-label={getAccessibleLabel()}
          accessibleDescription='Toggle between light, dark, and system theme modes'
        >
          <span className='flex items-center gap-2'>
            {getIcon()}
            {showLabel && <span className='text-sm'>{getLabel()}</span>}
          </span>
        </Button>
      );
    }
  )
);

ThemeToggle.displayName = 'ThemeToggle';

// Extended theme selector component
export interface ThemeSelectProps {
  className?: string;
}

export const ThemeSelect: React.FC<ThemeSelectProps> = ({ className }) => {
  const { mode, setMode, resolvedMode } = useTheme();

  const themes: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: 'light', label: 'Light', icon: <Sun className='h-4 w-4' /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className='h-4 w-4' /> },
    { mode: 'system', label: 'System', icon: <Monitor className='h-4 w-4' /> },
  ];

  return (
    <div
      className={cn('flex rounded-lg border border-border p-1', className)}
      role='radiogroup'
      aria-label='Theme selection'
    >
      {themes.map(({ mode: themeMode, label, icon }) => (
        <Button
          key={themeMode}
          variant={mode === themeMode ? 'default' : 'ghost'}
          size='sm'
          onClick={() => setMode(themeMode)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm transition-all',
            mode === themeMode && 'shadow-sm'
          )}
          role='radio'
          aria-checked={mode === themeMode}
          aria-label={`${label} theme${mode === themeMode ? ' (current)' : ''}`}
        >
          {icon}
          {label}
        </Button>
      ))}
    </div>
  );
};

export { ThemeToggle };
