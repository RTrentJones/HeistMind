'use client';

import { useState, type ReactNode } from 'react';
import type { CampaignCapacity } from '@heist-mind/core';
import { Heading, Text } from '@heist-mind/ui';
import { useComponentTranslation, usePageTranslation } from '@/lib/i18n/hooks';
import { seatSummary } from './PlayerLimitControl';

/**
 * UX r3 — the GM's setup cards (Invite players, Players, Discord) folded into ONE disclosure at
 * the top of the hub. Three full cards pushed Characters to y≈1130 on a 900px screen; a GM
 * returning mid-campaign scrolled past setup on every visit. It starts OPEN while the GM is still
 * alone in the campaign (setup is the job then) and closed once players are in. The initial
 * state is taken once: a player joining mid-session (a refetch) never snaps it shut under the GM.
 *
 * Round 5 P2-4 — a FULL campaign is surfaced on the always-visible summary line and opens the
 * disclosure: the player at the door is told to ask the GM to raise the limit "under Players",
 * which sat inside this (closed) panel with nothing outside it saying "full".
 */
export function CampaignSetup({
  initiallyOpen,
  capacity,
  children,
}: {
  initiallyOpen: boolean;
  /** The campaign's seats — `full` surfaces on the summary and opens the panel. */
  capacity?: CampaignCapacity;
  children: ReactNode;
}) {
  const { t } = usePageTranslation();
  const { t: tc } = useComponentTranslation();
  const full = capacity?.full === true;
  const [open, setOpen] = useState(initiallyOpen || full);
  return (
    <details
      className='group rounded-xl border border-border-primary bg-background-secondary/40'
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
      data-testid='campaign-setup'
    >
      <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary [&::-webkit-details-marker]:hidden'>
        <span className='flex min-w-0 flex-col gap-1'>
          <Heading level='h3' as='h2'>
            {t('game.setupTitle')}
          </Heading>
          <Text as='span' variant='muted' size='sm'>
            {t('game.setupSummary')}
          </Text>
          {full && capacity && (
            <Text as='span' size='sm' className='font-medium' data-testid='campaign-full'>
              {/* Round 6 P2-1 — the shared seat phrasing ("1 of 1 player"), like the cards below. */}
              {t('game.setupFull', { summary: seatSummary(tc, capacity, false) })}
            </Text>
          )}
        </span>
        <svg
          aria-hidden='true'
          viewBox='0 0 24 24'
          className='h-5 w-5 shrink-0 text-foreground-secondary transition-transform group-open:rotate-180'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
        >
          <path d='M6 9l6 6 6-6' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </summary>
      <div className='flex flex-col gap-4 px-2 pb-2 sm:px-4 sm:pb-4'>{children}</div>
    </details>
  );
}
