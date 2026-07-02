'use client';

import {
  crewAdvanceReady,
  crewXp,
  withCrewXp,
  CREW_XP_TRACK,
  type Crew,
  type UpdateCrewData,
} from '@heist-mind/database';
import { Badge, Button, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Crew advancement (BitD): mark XP from the crew's triggers; fill the track → take a crew ability
 * (the abilities list) and reset. GM marks; everyone sees the track.
 */
export function CrewAdvanceTrack({
  crew,
  isGm,
  busy,
  onSave,
}: {
  crew: Crew;
  isGm: boolean;
  busy: boolean;
  onSave: (patch: UpdateCrewData) => void;
}) {
  const { t } = useTranslation();
  const xp = crewXp(crew.resources);
  const ready = crewAdvanceReady(crew.resources);
  return (
    <Stack direction='column' gap='xs'>
      <Stack direction='row' gap='sm' align='center'>
        <Text size='sm' className='font-display'>
          {t('components.crewSheet.advancementXp')}
        </Text>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.decreaseAria', {
              label: t('components.crewSheet.advancementXp'),
            })}
            disabled={busy || xp <= 0}
            onClick={() => onSave({ resources: withCrewXp(crew.resources, xp - 1) })}
          >
            −
          </Button>
        )}
        <Badge variant={ready ? 'gold' : 'steel'}>
          {t('components.crewSheet.xpFraction', { xp, total: CREW_XP_TRACK })}
        </Badge>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.increaseAria', {
              label: t('components.crewSheet.advancementXp'),
            })}
            disabled={busy || xp >= CREW_XP_TRACK}
            onClick={() => onSave({ resources: withCrewXp(crew.resources, xp + 1) })}
          >
            +
          </Button>
        )}
        {isGm && ready && (
          <Button
            variant='ember'
            size='sm'
            disabled={busy}
            onClick={() => onSave({ resources: withCrewXp(crew.resources, 0) })}
          >
            {t('components.crewSheet.takeCrewAdvance')}
          </Button>
        )}
      </Stack>
      <Text variant='muted' size='sm'>
        {ready ? t('components.crewSheet.advanceReadyHint') : t('components.crewSheet.crewXpHint')}
      </Text>
    </Stack>
  );
}
