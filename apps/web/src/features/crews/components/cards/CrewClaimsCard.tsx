'use client';

import { useState } from 'react';
import type { Crew, UpdateCrewData } from '@heist-mind/database';
import { Badge, Button, Select, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/** Held claims as badges; the GM adds from the ruleset's claim map and removes held ones. */
export function CrewClaimsCard({
  crew,
  available,
  isGm,
  busy,
  onSave,
}: {
  crew: Crew;
  available: string[];
  isGm: boolean;
  busy: boolean;
  onSave: (patch: UpdateCrewData) => void;
}) {
  const { t } = useTranslation();
  const [newClaim, setNewClaim] = useState('');
  return (
    <div>
      <Text as='strong'>{t('components.crewSheet.claims')}</Text>
      <Stack direction='row' gap='sm' className='flex-wrap'>
        {crew.claims.length === 0 && (
          <Text variant='muted' size='sm'>
            {t('components.crewSheet.noneHeld')}
          </Text>
        )}
        {crew.claims.map(c => (
          <Badge key={c} variant='steel'>
            {c}
            {isGm && (
              <button
                type='button'
                aria-label={t('components.crewSheet.removeClaimAria', { claim: c })}
                className='ml-1.5 cursor-pointer'
                onClick={() => onSave({ claims: crew.claims.filter(x => x !== c) })}
              >
                ×
              </button>
            )}
          </Badge>
        ))}
      </Stack>
      {isGm && (
        <Stack direction='row' gap='sm' align='end' className='mt-2 flex-wrap'>
          <Select
            label={t('components.crewSheet.addClaim')}
            value={newClaim}
            onChange={e => setNewClaim(e.target.value)}
          >
            <option value=''>—</option>
            {available
              .filter(c => !crew.claims.includes(c))
              .map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </Select>
          <Button
            variant='outline'
            size='sm'
            disabled={busy || !newClaim}
            onClick={() => {
              onSave({ claims: [...crew.claims, newClaim] });
              setNewClaim('');
            }}
          >
            {t('components.crewSheet.addClaim')}
          </Button>
        </Stack>
      )}
    </div>
  );
}
