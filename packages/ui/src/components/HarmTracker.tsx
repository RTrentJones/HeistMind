import * as React from 'react';
import { cn } from '../lib/utils';

/** Minimal local shapes so the UI package stays free of domain-package imports. */
interface HarmLike {
  lesser: string[];
  moderate: string[];
  severe: string[];
}
interface HarmRulesLike {
  lesser: number;
  moderate: number;
  severe: number;
}

const ROWS: { key: keyof HarmLike; label: string }[] = [
  { key: 'severe', label: 'Severe' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'lesser', label: 'Lesser' },
];

/**
 * Read-only FitD harm track: three levels (Severe / Moderate / Lesser) shown top-down with one box
 * per allowed entry; filled boxes carry the harm description. Editing lives in the character editor.
 */
const HarmTracker: React.FC<{ harm: HarmLike; bounds: HarmRulesLike; className?: string }> = ({
  harm,
  bounds,
  className,
}) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {ROWS.map(({ key, label }) => {
      const entries = harm?.[key] ?? [];
      const boxes = Math.max(bounds?.[key] ?? 0, 1);
      return (
        <div key={key} className='flex items-center gap-2'>
          <span className='w-20 shrink-0 text-sm text-foreground-muted'>{label}</span>
          <div className='flex flex-wrap gap-1.5'>
            {Array.from({ length: boxes }, (_, i) => {
              const text = entries[i];
              return (
                <span
                  key={i}
                  className={cn(
                    'min-w-12 rounded-md border px-2 py-0.5 text-center text-xs',
                    text
                      ? 'border-semantic-error/60 bg-semantic-error/15 text-foreground-primary'
                      : 'border-border-primary text-foreground-muted'
                  )}
                >
                  {text || '—'}
                </span>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

export { HarmTracker };
