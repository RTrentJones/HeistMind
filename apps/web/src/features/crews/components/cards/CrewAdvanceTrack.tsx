'use client';

import { crewAdvanceReady, crewXp, CREW_XP_TRACK, type Crew } from '@heist-mind/core';
import { Alert, Button, Stack, XpTrack } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Crew advancement (BitD): mark XP from the crew's triggers on a clickable track — the SAME boxes
 * a character sheet uses, so marking XP feels identical everywhere — and when it fills, "Take
 * advance" spends it (engine-logged to the campaign feed) and points the GM at the crew-ability
 * list. GM marks; everyone sees the track.
 */
export function CrewAdvanceTrack({
  crew,
  isGm,
  busy,
  advanceNotice,
  onMarkXp,
  onTakeAdvance,
}: {
  crew: Crew;
  isGm: boolean;
  busy: boolean;
  /** Shown after a successful advance ("pick a new crew ability below"). */
  advanceNotice?: string | null;
  onMarkXp: (xp: number) => void;
  onTakeAdvance: () => void;
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
        action={
          isGm ? (
            <Button variant='ember' size='sm' disabled={busy} onClick={onTakeAdvance}>
              {t('components.crewSheet.takeCrewAdvance')}
            </Button>
          ) : undefined
        }
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
