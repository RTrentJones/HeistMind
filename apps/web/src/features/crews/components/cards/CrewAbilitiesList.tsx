'use client';

import type { Crew, CrewRules, UpdateCrewData } from '@heist-mind/database';
import { Badge, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Crew special abilities: the GM toggles them from the ruleset's list; players see the taken ones
 * as badges. Renders nothing when the ruleset defines no crew abilities.
 */
export function CrewAbilitiesList({
  crew,
  abilities,
  isGm,
  onSave,
}: {
  crew: Crew;
  abilities: NonNullable<CrewRules['abilities']>;
  isGm: boolean;
  onSave: (patch: UpdateCrewData) => void;
}) {
  const { t } = useTranslation();
  if (abilities.length === 0) return null;
  const toggleAbility = (id: string) =>
    onSave({
      crewAbilities: crew.crewAbilities.includes(id)
        ? crew.crewAbilities.filter(a => a !== id)
        : [...crew.crewAbilities, id],
    });
  return (
    <div>
      <Text as='strong'>{t('components.crewSheet.crewAbilities')}</Text>
      {isGm ? (
        <Stack direction='column' gap='xs'>
          {abilities.map(a => (
            <label key={a.id} className='flex cursor-pointer items-start gap-2.5'>
              <input
                type='checkbox'
                checked={crew.crewAbilities.includes(a.id)}
                onChange={() => toggleAbility(a.id)}
              />
              <Text size='sm'>
                <span className='font-display'>{a.name}</span>
                <span className='text-foreground-muted'> — {a.description}</span>
              </Text>
            </label>
          ))}
        </Stack>
      ) : crew.crewAbilities.length > 0 ? (
        <Stack direction='row' gap='sm' className='flex-wrap'>
          {crew.crewAbilities.map(id => (
            <Badge key={id} variant='success'>
              {abilities.find(a => a.id === id)?.name ?? id}
            </Badge>
          ))}
        </Stack>
      ) : (
        <Text variant='muted' size='sm'>
          {t('components.crewSheet.noneTaken')}
        </Text>
      )}
    </div>
  );
}
