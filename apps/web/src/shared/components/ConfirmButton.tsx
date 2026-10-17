'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@heist-mind/ui';

/**
 * The two-click "armed" confirm for destructive one-shot actions (delete faction, remove clock,
 * end score, clear harm…) — the pattern retire/detach already used inline, extracted so every
 * destructive control behaves the same. The first click ARMS the button (it relabels to
 * `confirmLabel` and turns crimson); the second click runs `onConfirm`. Moving focus away (blur)
 * or pressing Escape disarms it, so a stray click elsewhere never leaves a live trigger behind.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  variant = 'outline',
  size = 'sm',
  disabled,
  loading,
  'aria-label': ariaLabel,
  confirmAriaLabel,
  className,
}: {
  children: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  /** Accessible name while armed (defaults to the visible confirm label). */
  confirmAriaLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      type='button'
      variant={armed ? 'crimson' : variant}
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
      {armed ? confirmLabel : children}
    </Button>
  );
}
