'use client';

import { useState } from 'react';
import type { CrewRules, UpdateCrewData } from '@heist-mind/database';
import { applyHeat, advanceTier, incarcerate, REP_PER_TIER, CREW_LIMITS } from '@heist-mind/database';
import { Alert, Badge, Button, Heading, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCrewByGame } from '@/features/crews/data/queries';
import { useCreateCrew, useUpdateCrew } from '@/features/crews/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';
import { CrewStatStepper } from './cards/CrewStatStepper';
import { CrewAdvanceTrack } from './cards/CrewAdvanceTrack';
import { CrewResourcePools } from './cards/CrewResourcePools';
import { CrewAbilitiesList } from './cards/CrewAbilitiesList';
import { CrewClaimsCard } from './cards/CrewClaimsCard';
import { CrewCohortsCard } from './cards/CrewCohortsCard';

/**
 * The shared crew sheet for a campaign — one crew per game, composed from the per-concern crew
 * cards (stats, advancement track, resource pools, abilities, claims, cohorts). Members see it
 * (DB-backed shared state, loaded on view); the GM creates it and maintains it. RLS enforces
 * GM-write server-side; the `isGm` gates keep the UI honest about who can act.
 */
export function CrewSheet({
  gameId,
  isGm,
  crewRules,
}: {
  gameId: string;
  isGm: boolean;
  crewRules?: CrewRules;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const crewQuery = useCrewByGame(gameId);
  const createCrewMut = useCreateCrew(gameId);
  const updateCrewMut = useUpdateCrew(gameId);
  const [crewType, setCrewType] = useState('');

  const crew = crewQuery.data ?? null;
  const busy = createCrewMut.isPending || updateCrewMut.isPending;
  const error =
    (crewQuery.error as Error | null)?.message ??
    (createCrewMut.error as Error | null)?.message ??
    (updateCrewMut.error as Error | null)?.message ??
    null;

  const createCrew = () => {
    const userId = user?.id;
    if (!userId) return;
    createCrewMut.mutate({ userId, data: { gameId, crewType: crewType || undefined } });
  };

  // Patch helper used by every card; the mutation invalidates the crew query on success.
  const save = (patch: UpdateCrewData) => {
    if (!crew) return;
    updateCrewMut.mutate({ id: crew.id, patch });
  };

  if (crewQuery.isLoading) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.crewSheet.loading')}
      </Text>
    );
  }

  if (!crew) {
    if (!isGm) {
      return (
        <Text variant='muted' size='sm'>
          {t('components.crewSheet.emptyPlayer')}
        </Text>
      );
    }
    return (
      <Stack direction='column' gap='sm'>
        {error && (
          <Alert variant='destructive' size='sm'>
            {error}
          </Alert>
        )}
        <Text variant='muted' size='sm'>
          {t('components.crewSheet.startPrompt')}
        </Text>
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Select
            label={t('components.crewSheet.crewType')}
            value={crewType}
            onChange={e => setCrewType(e.target.value)}
          >
            <option value=''>—</option>
            {(crewRules?.types ?? []).map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          <Button variant='ember' disabled={busy} onClick={createCrew}>
            {t('components.crewSheet.createCrew')}
          </Button>
        </Stack>
      </Stack>
    );
  }

  const typeName =
    crewRules?.types.find(type => type.id === crew.crewType)?.name ?? crew.crewType ?? '—';

  const stepper = (
    label: string,
    key: keyof UpdateCrewData,
    value: number,
    max?: number,
    onIncrement?: () => void
  ) => (
    <CrewStatStepper
      label={label}
      value={value}
      testId={`crew-${String(key)}`}
      max={max}
      isGm={isGm}
      busy={busy}
      onDecrement={() => save({ [key]: value - 1 } as UpdateCrewData)}
      onIncrement={onIncrement ?? (() => save({ [key]: value + 1 } as UpdateCrewData))}
    />
  );

  return (
    <Stack direction='column' gap='md'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}

      <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
        <Heading level='h3'>{crew.name?.trim() || typeName}</Heading>
        <Badge variant='gold'>{typeName}</Badge>
        <Tooltip
          variant='dark'
          size='lg'
          content={
            <div className='space-y-1'>
              <div className='font-semibold'>{t('components.crewSheet.holdTooltipTitle')}</div>
              <div className='text-xs opacity-90'>
                {t('components.crewSheet.holdTooltipStrong')}
              </div>
              <div className='text-xs opacity-90'>{t('components.crewSheet.holdTooltipWeak')}</div>
            </div>
          }
        >
          <span tabIndex={0} className='cursor-help'>
            <Badge variant='steel'>
              {t('components.crewSheet.holdLabel', {
                value:
                  crew.hold === 'strong'
                    ? t('components.crewSheet.holdStrong')
                    : t('components.crewSheet.holdWeak'),
              })}
            </Badge>
          </span>
        </Tooltip>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() => save({ hold: crew.hold === 'strong' ? 'weak' : 'strong' })}
          >
            {t('components.crewSheet.toggleHold')}
          </Button>
        )}
      </Stack>

      <Stack direction='row' gap='lg' className='flex-wrap'>
        {stepper(t('components.crewSheet.tier'), 'tier', crew.tier, CREW_LIMITS.tier)}
        {/* Rep is uncapped — it accrues until a full track is spent to advance Tier (button below). */}
        {stepper(t('components.crewSheet.rep'), 'rep', crew.rep)}
        {stepper(t('components.crewSheet.heat'), 'heat', crew.heat, CREW_LIMITS.heat, () => {
          // BitD: filling the heat track (9) marks a Wanted level and resets heat.
          const next = applyHeat({ heat: crew.heat, wanted: crew.wanted }, 1);
          void save({ heat: next.heat, wanted: next.wanted });
        })}
        {stepper(t('components.crewSheet.wanted'), 'wanted', crew.wanted, CREW_LIMITS.wanted)}
        {stepper(t('components.crewSheet.coin'), 'coin', crew.coin)}
        {stepper(t('components.crewSheet.vault'), 'vault', crew.vault)}
      </Stack>

      {/* Crew-progression actions (GM): spend a full Rep track to advance Tier (BitD), and apply an
          incarceration to cool off (−1 Wanted, clear Heat — BitD's direct release valve). */}
      {isGm && (crew.rep >= REP_PER_TIER || crew.wanted > 0 || crew.heat > 0) && (
        <Stack direction='row' gap='sm' className='flex-wrap'>
          {crew.rep >= REP_PER_TIER && crew.tier < CREW_LIMITS.tier && (
            <Button
              variant='ember'
              size='sm'
              disabled={busy}
              onClick={() => void save(advanceTier({ tier: crew.tier, rep: crew.rep }))}
            >
              {t('components.crewSheet.advanceTier', { tier: crew.tier + 1 })}
            </Button>
          )}
          {(crew.wanted > 0 || crew.heat > 0) && (
            <Button
              variant='outline'
              size='sm'
              disabled={busy}
              onClick={() => void save(incarcerate({ heat: crew.heat, wanted: crew.wanted }))}
            >
              {t('components.crewSheet.incarcerate')}
            </Button>
          )}
        </Stack>
      )}

      <CrewAdvanceTrack crew={crew} isGm={isGm} busy={busy} onSave={save} />
      <CrewResourcePools
        crew={crew}
        pools={crewRules?.resourcePools ?? []}
        isGm={isGm}
        busy={busy}
        onSave={save}
      />
      <CrewAbilitiesList
        crew={crew}
        abilities={crewRules?.abilities ?? []}
        isGm={isGm}
        onSave={save}
      />
      <CrewClaimsCard
        crew={crew}
        available={crewRules?.claims ?? []}
        isGm={isGm}
        busy={busy}
        onSave={save}
      />
      <CrewCohortsCard crew={crew} isGm={isGm} busy={busy} onSave={save} />
    </Stack>
  );
}
