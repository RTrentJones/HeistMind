'use client';

import type { ReactNode } from 'react';
import { Badge, Card } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

const CHECK_MARK = '✓ ';

/**
 * The wizard's one selectable card (F93 → F99). Playbook, background/vice, custom choice steps and
 * special abilities all render through this so the selected treatment can't drift again: the
 * selected card gets the brand ring + the "character" surface and a green ✓ badge (red read as an
 * error; round-4 found the identity pickers had regressed to a ring-less grey card + ember badge).
 *
 * A `role="button"` card with `aria-pressed`; Enter/Space select it. `disabled` keeps it in the
 * tab order's shadow (tabIndex -1, aria-disabled) and dims it — the caller renders the reason.
 */
export function SelectableCard({
  selected,
  disabled = false,
  onSelect,
  title,
  titleSize = 20,
  tags,
  selectedLabel,
  children,
  testId,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** The card's name (rendered in the display face). */
  title: ReactNode;
  titleSize?: number;
  /** Extra inline chips after the title (tier, locked …). */
  tags?: ReactNode;
  /** Badge text when selected; defaults to "Selected". */
  selectedLabel?: string;
  children?: ReactNode;
  testId?: string;
}) {
  const { t } = useTranslation();
  const interactive = !disabled;
  const lift = 'transition-transform duration-150 motion-safe:hover:-translate-y-[3px]';
  return (
    <Card
      variant={selected ? 'character' : 'outline'}
      role='button'
      tabIndex={interactive ? 0 : -1}
      aria-pressed={selected}
      aria-disabled={disabled}
      data-testid={testId}
      onClick={() => {
        if (interactive) onSelect();
      }}
      onKeyDown={e => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={
        disabled
          ? 'cursor-not-allowed opacity-60'
          : selected
            ? `cursor-pointer ring-2 ring-brand-primary ring-offset-2 ring-offset-background-primary ${lift}`
            : `cursor-pointer ${lift}`
      }
    >
      <div className='flex items-start justify-between gap-2.5' style={{ minHeight: 24 }}>
        <div className='flex min-w-0 flex-wrap items-center gap-2.5'>
          <span className='font-display' style={{ fontSize: titleSize, lineHeight: 1.1 }}>
            {title}
          </span>
          {tags}
        </div>
        {selected && (
          <Badge variant='success' size='sm' className='shrink-0'>
            <span aria-hidden='true'>{CHECK_MARK}</span>
            {selectedLabel ?? t('components.steps.common.selected')}
          </Badge>
        )}
      </div>
      {children}
    </Card>
  );
}

/** The muted description line every selectable card carries under its title. */
export function SelectableCardDescription({ children }: { children: ReactNode }) {
  return (
    <div
      className='text-foreground-secondary'
      style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}
    >
      {children}
    </div>
  );
}
