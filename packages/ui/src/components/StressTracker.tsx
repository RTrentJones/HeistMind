import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const sizes = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
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
      return 'bg-red-400 border-red-300 shadow-glow-crimson';
    }

    if (isFilled) {
      switch (level) {
        case 'low':
          return 'bg-green-500 border-green-400';
        case 'medium':
          return 'bg-yellow-500 border-yellow-400';
        case 'high':
          return 'bg-orange-500 border-orange-400';
        case 'critical':
          return 'bg-red-500 border-red-400 animate-stress-pulse';
        default:
          return 'bg-gray-500 border-gray-400';
      }
    }

    return 'bg-slate-800 border-slate-600 hover:border-slate-500';
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
          <span className='text-sm font-medium text-foreground'>Stress</span>
          {showNumbers && (
            <span
              className={cn(
                'text-sm font-medium',
                level === 'critical'
                  ? 'text-red-400'
                  : level === 'high'
                    ? 'text-orange-400'
                    : level === 'medium'
                      ? 'text-yellow-400'
                      : 'text-green-400'
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

  const sizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const gaps = {
    sm: 'gap-1',
    default: 'gap-1.5',
    lg: 'gap-2',
  };

  const variants = {
    default: {
      filled: 'bg-purple-500 border-purple-400 shadow-glow-purple-sm',
      empty: 'bg-slate-800 border-slate-600 hover:border-slate-500',
    },
    ember: {
      filled: 'bg-orange-500 border-orange-400 shadow-glow-ember',
      empty: 'bg-slate-800 border-slate-600 hover:border-orange-600',
    },
    steel: {
      filled: 'bg-blue-500 border-blue-400 shadow-glow-steel',
      empty: 'bg-slate-800 border-slate-600 hover:border-blue-600',
    },
    shadow: {
      filled: 'bg-gray-600 border-gray-500',
      empty: 'bg-slate-800 border-slate-600 hover:border-gray-600',
    },
    crimson: {
      filled: 'bg-red-500 border-red-400 shadow-glow-crimson',
      empty: 'bg-slate-800 border-slate-600 hover:border-red-600',
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
          <span className='text-sm font-medium text-foreground'>{label}</span>
          <span className='text-sm font-medium text-muted-foreground'>
            {current}/{max}
          </span>
        </div>
      )}

      <div className={cn('flex', gaps[size])}>
        {Array.from({ length: max }, (_, index) => (
          <motion.button
            key={index}
            type='button'
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
    default: 'stroke-purple-500',
    stress:
      current / max >= 0.8
        ? 'stroke-red-500'
        : current / max >= 0.6
          ? 'stroke-orange-500'
          : current / max >= 0.3
            ? 'stroke-yellow-500'
            : 'stroke-green-500',
    ember: 'stroke-orange-500',
    steel: 'stroke-blue-500',
    crimson: 'stroke-red-500',
  };

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg height={size} width={size} className='transform -rotate-90'>
        <circle
          stroke='rgb(71 85 105)'
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
