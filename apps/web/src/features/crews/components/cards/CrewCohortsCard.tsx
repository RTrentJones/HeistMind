'use client';

import { useState } from 'react';
import type { Crew, UpdateCrewData } from '@heist-mind/database';
import { Badge, Button, Input, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/** Cohorts (gangs/experts) as badges; the GM adds free-text entries and removes existing ones. */
export function CrewCohortsCard({
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
  const [newCohort, setNewCohort] = useState('');
  return (
    <div>
      <Text as='strong'>{t('components.crewSheet.cohorts')}</Text>
      <Stack direction='row' gap='sm' className='flex-wrap'>
        {crew.cohorts.length === 0 && (
          <Text variant='muted' size='sm'>
            {t('components.crewSheet.noneCohorts')}
          </Text>
        )}
        {crew.cohorts.map(c => (
          <Badge key={c} variant='steel'>
            {c}
            {isGm && (
              <button
                type='button'
                aria-label={t('components.crewSheet.removeCohortAria', { cohort: c })}
                className='ml-1.5 cursor-pointer'
                onClick={() => onSave({ cohorts: crew.cohorts.filter(x => x !== c) })}
              >
                ×
              </button>
            )}
          </Badge>
        ))}
      </Stack>
      {isGm && (
        <Stack direction='row' gap='sm' align='end' className='mt-2 flex-wrap'>
          <Input
            label={t('components.crewSheet.addCohort')}
            value={newCohort}
            onChange={e => setNewCohort(e.target.value)}
            placeholder={t('components.crewSheet.addCohortPlaceholder')}
          />
          <Button
            variant='outline'
            size='sm'
            disabled={busy || !newCohort.trim()}
            onClick={() => {
              onSave({ cohorts: [...crew.cohorts, newCohort.trim()] });
              setNewCohort('');
            }}
          >
            {t('components.crewSheet.add')}
          </Button>
        </Stack>
      )}
    </div>
  );
}
