// packages/ui/src/components/game/ActionDots.tsx
import { cn } from '../../utils/cn';

export interface ActionDotsProps {
  name: string;
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function ActionDots({ name, value, max = 4, onChange, readonly }: ActionDotsProps) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm'>{name}</span>
      <div className='flex gap-0.5'>
        {Array.from({ length: max }).map((_, i) => (
          <button
            key={i}
            onClick={() => !readonly && onChange?.(i + 1)}
            disabled={readonly}
            className={cn(
              'h-4 w-4 rounded-full border transition-all',
              i < value
                ? 'border-primary-500 bg-primary-500'
                : 'border-neutral-600 bg-transparent hover:border-neutral-500',
              !readonly && 'cursor-pointer'
            )}
            aria-label={`Set ${name} to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
