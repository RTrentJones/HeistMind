'use client';

import { useState, type ReactNode } from 'react';
import { Heading, Text } from '@heist-mind/ui';
import { usePageTranslation } from '@/lib/i18n/hooks';

/**
 * UX r3 — the GM's setup cards (Invite players, Players, Discord) folded into ONE disclosure at
 * the top of the hub. Three full cards pushed Characters to y≈1130 on a 900px screen; a GM
 * returning mid-campaign scrolled past setup on every visit. It starts OPEN while the GM is still
 * alone in the campaign (setup is the job then) and closed once players are in. The initial
 * state is taken once: a player joining mid-session (a refetch) never snaps it shut under the GM.
 */
export function CampaignSetup({
  initiallyOpen,
  children,
}: {
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const { t } = usePageTranslation();
  const [open, setOpen] = useState(initiallyOpen);
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
