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

type HarmLabels = Record<keyof HarmLike, string>;

/** English defaults for standalone/Storybook use only — apps pass LOCALIZED `labels`. */
const DEFAULT_LABELS: HarmLabels = { severe: 'Severe', moderate: 'Moderate', lesser: 'Lesser' };
const ROW_ORDER: (keyof HarmLike)[] = ['severe', 'moderate', 'lesser'];

/**
 * FitD harm track: three levels (Severe / Moderate / Lesser) shown top-down with one box per
 * allowed entry; filled boxes carry the harm description. Read-only by default; pass
 * `onClearEntry` to make each filled box a button that clears that wound (recovery) — the
 * accessible name comes from `clearLabel` so the consumer owns the copy.
 */
const HarmTracker: React.FC<{
  harm: HarmLike;
  bounds: HarmRulesLike;
  /** Localized level names (Severe / Moderate / Lesser). */
  labels?: HarmLabels;
  className?: string;
  /** When set, filled boxes become clear buttons (recovery). */
  onClearEntry?: (level: HarmTrackerLevel, text: string) => void;
  /** Accessible name for a clear button; defaults to `Clear harm: <text>`. */
  clearLabel?: (text: string) => string;
  /**
   * Clearing a wound is destructive, so it takes TWO clicks: the first arms the box (it shows
   * this text, e.g. "Clear?"), the second clears; blur or Escape disarms. Localized by the app.
   */
  confirmClearLabel?: string;
  /** Accessible name while armed; defaults to the visible confirm text + the wound. */
  confirmClearAriaLabel?: (text: string) => string;
  /** Disable the clear buttons while a save is in flight. */
  disabled?: boolean;
}> = ({
  harm,
  bounds,
  labels = DEFAULT_LABELS,
  className,
  onClearEntry,
  clearLabel,
  confirmClearLabel = 'Clear?',
  confirmClearAriaLabel,
  disabled,
}) => {
  const [armed, setArmed] = React.useState<string | null>(null);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {ROW_ORDER.map(key => {
        const label = labels[key];
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
                  const boxId = `${key}:${i}`;
                  const isArmed = armed === boxId;
                  return (
                    <button
                      key={i}
                      type='button'
                      disabled={disabled}
                      data-armed={isArmed || undefined}
                      aria-label={
                        isArmed
                          ? (confirmClearAriaLabel?.(text) ?? `${confirmClearLabel} ${text}`)
                          : clearLabel
                            ? clearLabel(text)
                            : `Clear harm: ${text}`
                      }
                      onBlur={() => setArmed(a => (a === boxId ? null : a))}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setArmed(null);
                      }}
                      onClick={() => {
                        if (!isArmed) {
                          setArmed(boxId);
                          return;
                        }
                        setArmed(null);
                        onClearEntry(key, text);
                      }}
                      className={cn(
                        'min-w-12 cursor-pointer rounded-md border px-2 py-0.5 text-center text-xs',
                        isArmed
                          ? 'border-semantic-error bg-semantic-error text-white'
                          : filledClass,
                        !isArmed &&
                          'transition-colors hover:border-semantic-success/60 hover:bg-semantic-success/15',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      {isArmed ? (
                        confirmClearLabel
                      ) : (
                        <>
                          {text} <span aria-hidden='true'>×</span>
                        </>
                      )}
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
};

export { HarmTracker };
