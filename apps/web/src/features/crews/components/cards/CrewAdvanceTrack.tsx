'use client';

import { crewAdvanceReady, crewXp, CREW_XP_TRACK, type Crew } from '@heist-mind/core';
import { Alert, Stack, XpTrack } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Crew advancement (BitD): mark XP from the crew's triggers on a clickable track — the SAME boxes
 * a character sheet uses, so marking XP feels identical everywhere. When it fills, the advance is
 * SPENT in the crew-advance picker below (a new special ability or two upgrade boxes — RAW), which
 * clears the track in the same write. GM marks; everyone sees the track.
 */
export function CrewAdvanceTrack({
  crew,
  isGm,
  busy,
  advanceNotice,
  onMarkXp,
}: {
  crew: Crew;
  isGm: boolean;
  busy: boolean;
  /** Shown after a successful advance (what the crew gained). */
  advanceNotice?: string | null;
  onMarkXp: (xp: number) => void;
}) {
  const { t } = useTranslation();
  const xp = crewXp(crew.resources);
  const ready = crewAdvanceReady(crew.resources);
  return (
    <Stack direction='column' gap='xs'>
      <XpTrack
        data-testid='crew-xp-track'
        label={t('components.crewSheet.advancementXp')}
        current={xp}
        size={CREW_XP_TRACK}
        interactive={isGm}
        disabled={busy}
        readyLabel={t('components.crewSheet.xpReady')}
        markLabel={v => t('components.crewSheet.markCrewXpAria', { count: v })}
        unmarkLabel={v => t('components.crewSheet.unmarkCrewXpAria', { count: v })}
        hint={
          ready ? t('components.crewSheet.advanceReadyHint') : t('components.crewSheet.crewXpHint')
        }
        onChange={onMarkXp}
      />
      {advanceNotice && (
        <Alert variant='info' size='sm'>
          {advanceNotice}
        </Alert>
      )}
    </Stack>
  );
}
