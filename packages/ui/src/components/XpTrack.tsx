import * as React from 'react';
import { cn } from '../lib/utils';
import { Badge } from './Badge';

export interface XpTrackProps {
  /** Row label ("Playbook", an attribute name, "Crew advancement"). */
  label?: string;
  /** Marks currently filled. */
  current: number;
  /** Total boxes in the track. */
  size: number;
  /** Whether the boxes are clickable (owner/GM). */
  interactive?: boolean;
  /** Disable clicks while a save is in flight. */
  disabled?: boolean;
  /** Gold badge text shown when the track is full (e.g. "Full — ready to advance"). */
  readyLabel?: string;
  /** Optional CTA rendered beside the badge when the track is full (e.g. a "Take advance" button). */
  action?: React.ReactNode;
  /** Muted helper line under the boxes (e.g. the XP-trigger hint). */
  hint?: string;
  /** Accessible name for a box that marks; receives the value clicking it sets. Default "Mark N XP". */
  markLabel?: (value: number) => string;
  /** Accessible name for the top filled box (which unmarks); receives the value it steps back to. Default "Unmark — back to N XP". */
  unmarkLabel?: (value: number) => string;
  onChange?: (value: number) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * A FitD experience track: a row of square boxes filled left-to-right, gold when earned (XP is
 * good news — deliberately NOT the StressTracker's danger palette). Click box N to set the track
 * to N; click the last filled box to unmark it (same toggle idiom as the stress tracker). One
 * component for character playbook/attribute tracks and the crew advancement track, so marking XP
 * feels the same everywhere.
 */
export const XpTrack: React.FC<XpTrackProps> = ({
  label,
  current,
  size,
  interactive = false,
  disabled = false,
  readyLabel,
  action,
  hint,
  markLabel,
  unmarkLabel,
  onChange,
  className,
  'data-testid': testId,
}) => {
  const count = Math.max(0, Math.floor(size));
  const filled = Math.max(0, Math.min(Math.floor(current), count));
  const full = count > 0 && filled >= count;

  const handleClick = (index: number) => {
    if (!interactive || !onChange || disabled) return;
    // Clicking the top filled box unmarks it; any other box sets the track to that box.
    const next = index + 1 === filled ? filled - 1 : index + 1;
    onChange(Math.max(0, Math.min(next, count)));
  };

  const boxName = (index: number) => {
    if (index + 1 === filled) {
      return unmarkLabel ? unmarkLabel(filled - 1) : `Unmark — back to ${filled - 1} XP`;
    }
    return markLabel ? markLabel(index + 1) : `Mark ${index + 1} XP`;
  };

  return (
    <div className={cn('flex flex-col gap-1', className)} data-testid={testId}>
      {(label || (full && (readyLabel || action))) && (
        <div className='flex flex-wrap items-center gap-2'>
          {label && <span className='text-sm font-medium text-foreground-primary'>{label}</span>}
          {full && readyLabel && <Badge variant='gold'>{readyLabel}</Badge>}
          {full && action}
        </div>
      )}
      <div className='flex items-center gap-1.5'>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type='button'
            aria-label={boxName(i)}
            aria-pressed={i < filled}
            disabled={!interactive || disabled}
            onClick={() => handleClick(i)}
            className={cn(
              'h-5 w-5 rounded-sm border-2 transition-all duration-150',
              i < filled
                ? 'border-game-gold/70 bg-gradient-to-br from-game-gold to-semantic-warning shadow-sm'
                : 'border-border-primary bg-background-secondary',
              interactive && !disabled
                ? 'cursor-pointer hover:scale-110 hover:border-game-gold/70 active:scale-95'
                : 'cursor-default',
              full && i < filled && 'shadow-game-gold/30 shadow-md'
            )}
          />
        ))}
        <span className='ml-1 text-xs text-foreground-muted'>
          {filled}/{count}
        </span>
      </div>
      {hint && <span className='text-sm text-foreground-muted'>{hint}</span>}
    </div>
  );
};
