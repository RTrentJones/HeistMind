// packages/ui/src/components/game/StressTracker.tsx
import { cn } from '../../utils/cn';

export interface StressTrackerProps {
  current: number;
  max: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function StressTracker({ current, max, onChange, readonly }: StressTrackerProps) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>Stress</span>
        <span className='text-sm text-neutral-400'>
          {current}/{max}
        </span>
      </div>
      <div className='flex gap-1'>
        {Array.from({ length: max }).map((_, i) => (
          <button
            key={i}
            onClick={() => !readonly && onChange?.(i + 1)}
            disabled={readonly}
            className={cn(
              'h-8 w-8 rounded-md border-2 transition-all',
              i < current
                ? 'border-primary-600 bg-primary-600'
                : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600',
              !readonly && 'cursor-pointer'
            )}
            aria-label={`Set stress to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
