'use client';

import type { Crew, CrewRules, UpdateCrewData } from '@heist-mind/database';
import { Badge, Button, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Optional ruleset resource pools (gambits / dungeon hoard / supplies). Reads the current value
 * from `crew.resources` (defaulting to the pool's startsAt), and writes the single pool back.
 * Renders nothing when the ruleset defines no pools.
 */
export function CrewResourcePools({
  crew,
  pools,
  isGm,
  busy,
  onSave,
}: {
  crew: Crew;
  pools: NonNullable<CrewRules['resourcePools']>;
  isGm: boolean;
  busy: boolean;
  onSave: (patch: UpdateCrewData) => void;
}) {
  const { t } = useTranslation();
  if (pools.length === 0) return null;
  const setResource = (poolId: string, value: number) =>
    onSave({ resources: { ...crew.resources, [poolId]: value } });
  return (
    <div>
      <Text as='strong'>{t('components.crewSheet.resources')}</Text>
      <Stack direction='row' gap='lg' className='mt-1 flex-wrap'>
        {pools.map(pool => {
          const value = crew.resources[pool.id] ?? pool.startsAt ?? 0;
          return (
            <Stack key={pool.id} direction='column' gap='xs' align='center'>
              <Text size='sm' className='font-display' title={pool.description}>
                {pool.name}
              </Text>
              <Stack direction='row' gap='xs' align='center'>
                {isGm && (
                  <Button
                    variant='outline'
                    size='sm'
                    aria-label={t('components.crewSheet.decreaseAria', { label: pool.name })}
                    disabled={busy || value <= 0}
                    onClick={() => setResource(pool.id, value - 1)}
                  >
                    −
                  </Button>
                )}
                <Badge variant='steel'>
                  <span data-testid={`crew-resource-${pool.id}`}>
                    {value}/{pool.max}
                  </span>
                </Badge>
                {isGm && (
                  <Button
                    variant='outline'
                    size='sm'
                    aria-label={t('components.crewSheet.increaseAria', { label: pool.name })}
                    disabled={busy || value >= pool.max}
                    onClick={() => setResource(pool.id, value + 1)}
                  >
                    +
                  </Button>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </div>
  );
}
