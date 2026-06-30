'use client';

import { useState } from 'react';
import type { CrewRules, UpdateCrewData } from '@heist-mind/database';
import {
  applyHeat,
  advanceTier,
  incarcerate,
  crewXp,
  crewAdvanceReady,
  withCrewXp,
  REP_PER_TIER,
  CREW_LIMITS,
  CREW_XP_TRACK,
} from '@heist-mind/database';
import { Alert, Badge, Button, Heading, Input, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCrewByGame } from '@/features/crews/data/queries';
import { useCreateCrew, useUpdateCrew } from '@/features/crews/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The shared crew sheet for a campaign — one crew per game. Members see it (DB-backed shared state,
 * loaded on view); the GM creates it and maintains tier/rep/heat/wanted, crew abilities, claims, and
 * cohorts. RLS enforces GM-write server-side; the controls are a convenience, not the gate.
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
  const [newCohort, setNewCohort] = useState('');
  const [newClaim, setNewClaim] = useState('');

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

  // Patch helper used by every control; the mutation invalidates the crew query on success.
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
  const stat = (
    label: string,
    key: keyof UpdateCrewData,
    value: number,
    max?: number,
    onIncrement?: () => void
  ) => (
    <Stack direction='column' gap='xs' align='center'>
      <Text size='sm' className='font-display'>
        {label}
      </Text>
      <Stack direction='row' gap='xs' align='center'>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.decreaseAria', { label })}
            disabled={busy || value <= 0}
            onClick={() => save({ [key]: value - 1 } as UpdateCrewData)}
          >
            −
          </Button>
        )}
        <Badge variant='steel'>
          <span data-testid={`crew-${String(key)}`}>{value}</span>
        </Badge>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.increaseAria', { label })}
            disabled={busy || (max != null && value >= max)}
            onClick={onIncrement ?? (() => save({ [key]: value + 1 } as UpdateCrewData))}
          >
            +
          </Button>
        )}
      </Stack>
    </Stack>
  );

  const toggleAbility = (id: string) =>
    save({
      crewAbilities: crew.crewAbilities.includes(id)
        ? crew.crewAbilities.filter(a => a !== id)
        : [...crew.crewAbilities, id],
    });

  // Optional ruleset resource pools (gambits / dungeon hoard / supplies). Reads the current value
  // from `crew.resources` (defaulting to the pool's startsAt), and writes the single pool back.
  const pools = crewRules?.resourcePools ?? [];
  const setResource = (poolId: string, value: number) =>
    save({ resources: { ...crew.resources, [poolId]: value } });

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
        {stat(t('components.crewSheet.tier'), 'tier', crew.tier, CREW_LIMITS.tier)}
        {/* Rep is uncapped — it accrues until a full track is spent to advance Tier (button below). */}
        {stat(t('components.crewSheet.rep'), 'rep', crew.rep)}
        {stat(t('components.crewSheet.heat'), 'heat', crew.heat, CREW_LIMITS.heat, () => {
          // BitD: filling the heat track (9) marks a Wanted level and resets heat.
          const next = applyHeat({ heat: crew.heat, wanted: crew.wanted }, 1);
          void save({ heat: next.heat, wanted: next.wanted });
        })}
        {stat(t('components.crewSheet.wanted'), 'wanted', crew.wanted, CREW_LIMITS.wanted)}
        {stat(t('components.crewSheet.coin'), 'coin', crew.coin)}
        {stat(t('components.crewSheet.vault'), 'vault', crew.vault)}
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

      {/* Crew advancement (BitD): mark XP from the crew's triggers; fill the track → take a crew
          ability (the list below) and reset. */}
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
              disabled={busy || crewXp(crew.resources) <= 0}
              onClick={() =>
                void save({ resources: withCrewXp(crew.resources, crewXp(crew.resources) - 1) })
              }
            >
              −
            </Button>
          )}
          <Badge variant={crewAdvanceReady(crew.resources) ? 'gold' : 'steel'}>
            {t('components.crewSheet.xpFraction', {
              xp: crewXp(crew.resources),
              total: CREW_XP_TRACK,
            })}
          </Badge>
          {isGm && (
            <Button
              variant='outline'
              size='sm'
              aria-label={t('components.crewSheet.increaseAria', {
                label: t('components.crewSheet.advancementXp'),
              })}
              disabled={busy || crewXp(crew.resources) >= CREW_XP_TRACK}
              onClick={() =>
                void save({ resources: withCrewXp(crew.resources, crewXp(crew.resources) + 1) })
              }
            >
              +
            </Button>
          )}
          {isGm && crewAdvanceReady(crew.resources) && (
            <Button
              variant='ember'
              size='sm'
              disabled={busy}
              onClick={() => void save({ resources: withCrewXp(crew.resources, 0) })}
            >
              {t('components.crewSheet.takeCrewAdvance')}
            </Button>
          )}
        </Stack>
        <Text variant='muted' size='sm'>
          {crewAdvanceReady(crew.resources)
            ? t('components.crewSheet.advanceReadyHint')
            : t('components.crewSheet.crewXpHint')}
        </Text>
      </Stack>

      {pools.length > 0 && (
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
      )}

      {crewRules?.abilities && crewRules.abilities.length > 0 && (
        <div>
          <Text as='strong'>{t('components.crewSheet.crewAbilities')}</Text>
          {isGm ? (
            <Stack direction='column' gap='xs'>
              {crewRules.abilities.map(a => (
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
                  {crewRules.abilities.find(a => a.id === id)?.name ?? id}
                </Badge>
              ))}
            </Stack>
          ) : (
            <Text variant='muted' size='sm'>
              {t('components.crewSheet.noneTaken')}
            </Text>
          )}
        </div>
      )}

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
                  onClick={() => save({ claims: crew.claims.filter(x => x !== c) })}
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
              {(crewRules?.claims ?? [])
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
                void save({ claims: [...crew.claims, newClaim] });
                setNewClaim('');
              }}
            >
              {t('components.crewSheet.addClaim')}
            </Button>
          </Stack>
        )}
      </div>

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
                  onClick={() => save({ cohorts: crew.cohorts.filter(x => x !== c) })}
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
                void save({ cohorts: [...crew.cohorts, newCohort.trim()] });
                setNewCohort('');
              }}
            >
              {t('components.crewSheet.add')}
            </Button>
          </Stack>
        )}
      </div>
    </Stack>
  );
}
