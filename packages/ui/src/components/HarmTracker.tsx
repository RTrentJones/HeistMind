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
export type HarmTrackerLevel = keyof HarmLike;

const ROWS: { key: keyof HarmLike; label: string }[] = [
  { key: 'severe', label: 'Severe' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'lesser', label: 'Lesser' },
];

/**
 * FitD harm track: three levels (Severe / Moderate / Lesser) shown top-down with one box per
 * allowed entry; filled boxes carry the harm description. Read-only by default; pass
 * `onClearEntry` to make each filled box a button that clears that wound (recovery) — the
 * accessible name comes from `clearLabel` so the consumer owns the copy.
 */
const HarmTracker: React.FC<{
  harm: HarmLike;
  bounds: HarmRulesLike;
  className?: string;
  /** When set, filled boxes become clear buttons (recovery). */
  onClearEntry?: (level: HarmTrackerLevel, text: string) => void;
  /** Accessible name for a clear button; defaults to `Clear harm: <text>`. */
  clearLabel?: (text: string) => string;
  /** Disable the clear buttons while a save is in flight. */
  disabled?: boolean;
}> = ({ harm, bounds, className, onClearEntry, clearLabel, disabled }) => (
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
              const filledClass =
                'border-semantic-error/60 bg-semantic-error/15 text-foreground-primary';
              if (text && onClearEntry) {
                return (
                  <button
                    key={i}
                    type='button'
                    disabled={disabled}
                    aria-label={clearLabel ? clearLabel(text) : `Clear harm: ${text}`}
                    onClick={() => onClearEntry(key, text)}
                    className={cn(
                      'min-w-12 cursor-pointer rounded-md border px-2 py-0.5 text-center text-xs',
                      filledClass,
                      'transition-colors hover:border-semantic-success/60 hover:bg-semantic-success/15',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {text} <span aria-hidden='true'>×</span>
                  </button>
                );
              }
              return (
                <span
                  key={i}
                  className={cn(
                    'min-w-12 rounded-md border px-2 py-0.5 text-center text-xs',
                    text ? filledClass : 'border-border-primary text-foreground-muted'
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
