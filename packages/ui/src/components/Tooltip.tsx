import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useReducedMotion, type AriaAttributes } from '../lib/accessibility';

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: 'default' | 'dark' | 'light' | 'glass' | 'ember' | 'steel' | 'crimson';
    size?: 'sm' | 'default' | 'lg';
  }
>(
  (
    { className, sideOffset = 4, variant = 'default', size = 'default', children, ...props },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const variants = {
      default: 'bg-brand-primary text-white border border-brand-primary/20',
      dark: 'bg-background-tertiary text-foreground-primary border border-border-primary',
      light:
        'bg-background-elevated text-foreground-primary border border-border-primary shadow-lg',
      glass:
        'bg-background-glass text-foreground-primary border border-border-secondary backdrop-blur-md',
      ember:
        'bg-gradient-to-r from-game-ember to-game-crimson text-white border border-game-ember/30',
      steel:
        'bg-gradient-to-r from-game-steel to-game-shadow text-white border border-game-steel/30',
      crimson:
        'bg-gradient-to-r from-game-crimson to-semantic-error text-white border border-game-crimson/30',
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs max-w-[200px]',
      default: 'px-3 py-1.5 text-sm max-w-[300px]',
      lg: 'px-4 py-2 text-base max-w-[400px]',
    };

    return (
      <AnimatePresence>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
              'z-50 overflow-hidden rounded-lg shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2',
              variants[variant],
              sizes[size],
              className
            )}
            asChild
            role='tooltip'
            {...props}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 2 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: 'easeOut' }}
            >
              {children}
              <TooltipPrimitive.Arrow
                className={cn(
                  'fill-current',
                  variant === 'glass' && 'fill-background-glass',
                  variant === 'dark' && 'fill-background-tertiary',
                  variant === 'light' && 'fill-background-elevated'
                )}
              />
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </AnimatePresence>
    );
  }
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Compound component for easier usage
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  variant?: 'default' | 'dark' | 'light' | 'glass' | 'ember' | 'steel' | 'crimson';
  size?: 'sm' | 'default' | 'lg';
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  variant = 'default',
  size = 'default',
  side = 'top',
  delayDuration = 300,
  disabled = false,
  className,
  ...props
}) => {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent variant={variant} size={size} side={side} className={className} {...props}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
};

// Game-specific tooltip variants
const StressTooltip: React.FC<{
  children: React.ReactNode;
  current: number;
  max: number;
  consequences?: string[];
}> = ({ children, current, max, consequences = [] }) => {
  const percentage = (current / max) * 100;
  const level =
    percentage < 25 ? 'low' : percentage < 50 ? 'medium' : percentage < 75 ? 'high' : 'critical';

  const variants = {
    low: 'steel',
    medium: 'default',
    high: 'ember',
    critical: 'crimson',
  } as const;

  return (
    <Tooltip
      variant={variants[level]}
      content={
        <div className='space-y-2'>
          <div className='font-semibold'>
            Stress: {current}/{max}
          </div>
          <div className='text-xs opacity-80'>
            Level: {level.charAt(0).toUpperCase() + level.slice(1)}
          </div>
          {consequences.length > 0 && (
            <div className='space-y-1'>
              <div className='text-xs font-medium'>Consequences:</div>
              <ul className='text-xs space-y-0.5'>
                {consequences.map((consequence, i) => (
                  <li key={i}>• {consequence}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const SkillTooltip: React.FC<{
  children: React.ReactNode;
  name: string;
  level: number;
  description: string;
  examples?: string[];
}> = ({ children, name, level, description, examples = [] }) => {
  const skillLevel =
    level === 0 ? 'Novice' : level <= 2 ? 'Trained' : level <= 4 ? 'Expert' : 'Master';

  return (
    <Tooltip
      variant='glass'
      size='lg'
      content={
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-semibold'>{name}</span>
            <span className='text-xs bg-background-glass px-2 py-0.5 rounded'>
              {skillLevel} ({level})
            </span>
          </div>
          <p className='text-xs opacity-90 leading-relaxed'>{description}</p>
          {examples.length > 0 && (
            <div className='space-y-1'>
              <div className='text-xs font-medium'>Examples:</div>
              <ul className='text-xs space-y-0.5 opacity-80'>
                {examples.map((example, i) => (
                  <li key={i}>• {example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const ActionTooltip: React.FC<{
  children: React.ReactNode;
  name: string;
  description: string;
  position?: string;
  effect?: string;
  risk?: 'low' | 'medium' | 'high' | 'extreme';
}> = ({ children, name, description, position, effect, risk }) => {
  const riskColors = {
    low: 'steel',
    medium: 'default',
    high: 'ember',
    extreme: 'crimson',
  } as const;

  return (
    <Tooltip
      variant={risk ? riskColors[risk] : 'default'}
      size='lg'
      content={
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-semibold'>{name}</span>
            {risk && (
              <span className='text-xs bg-background-glass px-2 py-0.5 rounded capitalize'>
                {risk} Risk
              </span>
            )}
          </div>
          <p className='text-xs opacity-90 leading-relaxed'>{description}</p>
          {position && (
            <div className='text-xs'>
              <span className='font-medium'>Position:</span> {position}
            </div>
          )}
          {effect && (
            <div className='text-xs'>
              <span className='font-medium'>Effect:</span> {effect}
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  StressTooltip,
  SkillTooltip,
  ActionTooltip,
};
