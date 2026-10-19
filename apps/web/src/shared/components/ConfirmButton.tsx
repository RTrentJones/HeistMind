'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@heist-mind/ui';

/**
 * The two-click "armed" confirm for destructive one-shot actions (delete faction, remove clock,
 * end score, clear harm…) — the pattern retire/detach already used inline, extracted so every
 * destructive control behaves the same. The first click ARMS the button (it relabels to
 * `confirmLabel` and turns crimson); the second click runs `onConfirm`. Moving focus away (blur)
 * or pressing Escape disarms it, so a stray click elsewhere never leaves a live trigger behind.
 *
 * UX r3 — `reserveWidth`: arming doesn't change the button's size. The inactive label is laid in
 * the same grid cell as an `aria-hidden`, `invisible` ghost, so the button is always as wide as
 * its longer label and a row doesn't re-wrap (the page jumped on the first click). Keep the
 * visible `confirmLabel` short and put long, specific wording (names) in `confirmAriaLabel`.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  variant = 'outline',
  armedVariant = 'crimson',
  size = 'sm',
  disabled,
  loading,
  'aria-label': ariaLabel,
  confirmAriaLabel,
  reserveWidth = false,
  className,
}: {
  children: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  variant?: ButtonProps['variant'];
  /** Variant while armed (default crimson). */
  armedVariant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  /** Accessible name while armed (defaults to the visible confirm label). */
  confirmAriaLabel?: string;
  /** Size the button for the wider of its two labels so arming never shifts layout. */
  reserveWidth?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      type='button'
      variant={armed ? armedVariant : variant}
      size={size}
      disabled={disabled}
      loading={loading}
      className={className}
      aria-label={armed ? confirmAriaLabel : ariaLabel}
      data-armed={armed || undefined}
      onBlur={() => setArmed(false)}
      onKeyDown={e => {
        if (e.key === 'Escape') setArmed(false);
      }}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {reserveWidth ? (
        // place-items-center: when the reserved (wider) label wraps in a narrow cell, the visible
        // one centres in that box instead of riding its top line (Revoke sat ~8px above its
        // neighbour "Copy code" at 360 — F99).
        <span className='grid place-items-center text-center'>
          <span className='[grid-area:1/1]'>{armed ? confirmLabel : children}</span>
          <span aria-hidden='true' className='invisible [grid-area:1/1]'>
            {armed ? children : confirmLabel}
          </span>
        </span>
      ) : armed ? (
        confirmLabel
      ) : (
        children
      )}
    </Button>
  );
}
