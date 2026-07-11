import * as React from 'react';
import { motion } from 'framer-motion';
import { cn, calculateStressLevel } from '../lib/utils';
import { StressTooltip } from './Tooltip';

interface StressTrackerProps {
  current: number;
  max: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
  showLabel?: boolean;
  showNumbers?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const StressTracker: React.FC<StressTrackerProps> = ({
  current,
  max,
  onChange,
  interactive = false,
  showLabel = true,
  showNumbers = true,
  size = 'default',
  className,
}) => {
  const level = calculateStressLevel(current, max);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Phones get bigger pips (F57): 24px is a hard thumb target; 32px fits nine across a 390px
  // viewport with the gaps intact.
  const sizes = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6 max-sm:w-8 max-sm:h-8',
    lg: 'w-8 h-8',
  };

  const gaps = {
    sm: 'gap-1',
    default: 'gap-1.5',
    lg: 'gap-2',
  };

  const getStressColor = (index: number, isHovered: boolean = false) => {
    const isFilled = index < current;
    const isHovering = hoveredIndex !== null && index <= hoveredIndex;

    if (isHovered || isHovering) {
      return 'bg-semantic-error border-semantic-error/60 shadow-lg shadow-semantic-error/25';
    }

    if (isFilled) {
      switch (level) {
        case 'low':
          return 'bg-semantic-success border-semantic-success/60';
        case 'medium':
          return 'bg-semantic-warning border-semantic-warning/60';
        case 'high':
          return 'bg-game-ember border-game-ember/60';
        case 'critical':
          return 'bg-semantic-error border-semantic-error/60 animate-stress-pulse';
        default:
          return 'bg-foreground-muted border-foreground-muted/60';
      }
    }

    return 'bg-background-secondary border-border-primary hover:border-border-secondary';
  };

  const handleClick = (index: number) => {
    if (!interactive || !onChange) return;

    const newValue = index + 1 === current ? current - 1 : index + 1;
    onChange(Math.max(0, Math.min(newValue, max)));
  };

  const consequences = React.useMemo(() => {
    const result = [];
    if (current >= max - 1) {
      result.push('One more stress = trauma!');
    }
    if (current >= max * 0.75) {
      result.push('Consider resistance rolls');
    }
    if (current === max) {
      result.push('Must take trauma');
    }
    return result;
  }, [current, max]);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-foreground-primary'>Stress</span>
          {showNumbers && (
            <span
              className={cn(
                'text-sm font-medium',
                level === 'critical'
                  ? 'text-semantic-error-fg'
                  : level === 'high'
                    ? 'text-game-ember-fg'
                    : level === 'medium'
                      ? 'text-semantic-warning-fg'
                      : 'text-semantic-success-fg'
              )}
            >
              {current}/{max}
            </span>
          )}
        </div>
      )}

      <StressTooltip current={current} max={max} consequences={consequences}>
        <div className={cn('flex', gaps[size])}>
          {Array.from({ length: max }, (_, index) => (
            <motion.button
              key={index}
              type='button'
              // F84 — pips are buttons; give each the action it performs (the top filled pip
              // toggles back down, any other sets the track to itself).
              aria-label={
                index + 1 === current
                  ? `Clear stress to ${current - 1}`
                  : `Set stress to ${index + 1}`
              }
              aria-pressed={index < current}
              className={cn(
                'rounded-full border-2 transition-all duration-200',
                sizes[size],
                getStressColor(index, hoveredIndex === index),
                interactive && 'cursor-pointer hover:scale-110 active:scale-95',
                !interactive && 'cursor-default'
              )}
              onClick={() => handleClick(index)}
              onMouseEnter={() => interactive && setHoveredIndex(index)}
              onMouseLeave={() => interactive && setHoveredIndex(null)}
              disabled={!interactive}
              whileHover={interactive ? { scale: 1.1 } : undefined}
              whileTap={interactive ? { scale: 0.95 } : undefined}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            />
          ))}
        </div>
      </StressTooltip>
    </div>
  );
};

interface ActionDotsProps {
  current: number;
  max: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ember' | 'steel' | 'shadow' | 'crimson';
  className?: string;
}

const ActionDots: React.FC<ActionDotsProps> = ({
  current,
  max,
  onChange,
  interactive = false,
  label,
  size = 'default',
  variant = 'default',
  className,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Same phone-size bump as the stress pips (F57) — action dots are tapped mid-play too.
  const sizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4 max-sm:w-6 max-sm:h-6',
    lg: 'w-6 h-6',
  };

  const gaps = {
    sm: 'gap-1',
    default: 'gap-1.5',
    lg: 'gap-2',
  };

  // Empty pips must stay visible on ANY card surface, in both themes. The old empty style
  // (`bg-background-tertiary border-border-primary`) collided two ways: the fill matched the
  // Card `default`/`character` hover surface (also `background-tertiary`), and `border-primary`
  // shares the exact lightness of `background-tertiary` in both themes — so the outline never
  // delineated the pip. The fix makes the pip self-delineating: a recessed `background-primary`
  // fill (a darker "well" in dark mode) plus a higher-contrast `border-secondary` ring (the
  // load-bearing cue in light mode, where the recessed fill goes near-white).
  const variants = {
    default: {
      filled: 'bg-brand-primary border-brand-primary/60 shadow-lg shadow-brand-primary/20',
      empty: 'bg-background-primary border-border-secondary hover:border-border-muted',
    },
    ember: {
      filled: 'bg-game-ember border-game-ember/60 shadow-lg shadow-game-ember/20',
      empty: 'bg-background-primary border-border-secondary hover:border-game-ember/60',
    },
    steel: {
      filled: 'bg-game-steel border-game-steel/60 shadow-lg shadow-game-steel/20',
      empty: 'bg-background-primary border-border-secondary hover:border-game-steel/60',
    },
    shadow: {
      filled: 'bg-game-shadow border-game-shadow/60 shadow-lg shadow-game-shadow/20',
      empty: 'bg-background-primary border-border-secondary hover:border-game-shadow/60',
    },
    crimson: {
      filled: 'bg-game-crimson border-game-crimson/60 shadow-lg shadow-game-crimson/20',
      empty: 'bg-background-primary border-border-secondary hover:border-game-crimson/60',
    },
  };

  const getDotClass = (index: number) => {
    const isFilled = index < current;
    const isHovering = hoveredIndex !== null && index <= hoveredIndex;

    if (isFilled || isHovering) {
      return variants[variant].filled;
    }

    return variants[variant].empty;
  };

  const handleClick = (index: number) => {
    if (!interactive || !onChange) return;

    const newValue = index + 1 === current ? current - 1 : index + 1;
    onChange(Math.max(0, Math.min(newValue, max)));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-foreground-primary'>{label}</span>
          <span className='text-sm font-medium text-foreground-muted'>
            {current}/{max}
          </span>
        </div>
      )}

      <div className={cn('flex', gaps[size])}>
        {Array.from({ length: max }, (_, index) => (
          <motion.button
            key={index}
            type='button'
            // F84 — same naming scheme as the stress pips, scoped by the row's label so pages
            // with many dot rows (the wizard, the editor) stay unambiguous.
            aria-label={
              index + 1 === current
                ? `Clear ${label ?? 'rating'} to ${current - 1}`
                : `Set ${label ?? 'rating'} to ${index + 1}`
            }
            aria-pressed={index < current}
            className={cn(
              'rounded-full border-2 transition-all duration-200',
              sizes[size],
              getDotClass(index),
              interactive && 'cursor-pointer hover:scale-110 active:scale-95',
              !interactive && 'cursor-default'
            )}
            onClick={() => handleClick(index)}
            onMouseEnter={() => interactive && setHoveredIndex(index)}
            onMouseLeave={() => interactive && setHoveredIndex(null)}
            disabled={!interactive}
            whileHover={interactive ? { scale: 1.1 } : undefined}
            whileTap={interactive ? { scale: 0.95 } : undefined}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
          />
        ))}
      </div>
    </div>
  );
};

interface ProgressRingProps {
  current: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'stress' | 'ember' | 'steel' | 'crimson';
  showLabel?: boolean;
  className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  current,
  max,
  size = 60,
  strokeWidth = 4,
  variant = 'default',
  showLabel = true,
  className,
}) => {
  const normalizedRadius = (size - strokeWidth * 2) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const progress = (current / max) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const variants = {
    default: 'stroke-brand-primary',
    stress:
      current / max >= 0.8
        ? 'stroke-semantic-error'
        : current / max >= 0.6
          ? 'stroke-game-ember'
          : current / max >= 0.3
            ? 'stroke-semantic-warning'
            : 'stroke-semantic-success',
    ember: 'stroke-game-ember',
    steel: 'stroke-game-steel',
    crimson: 'stroke-game-crimson',
  };

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg height={size} width={size} className='transform -rotate-90'>
        <circle
          stroke='var(--color-border-muted)'
          fill='transparent'
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={variants[variant]}
          fill='transparent'
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap='round'
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </svg>
      {showLabel && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-sm font-medium'>
            {current}/{max}
          </span>
        </div>
      )}
    </div>
  );
};

export { StressTracker, ActionDots, ProgressRing };
