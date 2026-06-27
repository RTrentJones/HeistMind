'use client';

import { useEffect, useState } from 'react';
import type { Crew, CrewRules, UpdateCrewData } from '@heist-mind/database';
import { applyHeat } from '@heist-mind/database';
import { Alert, Badge, Button, Heading, Input, Stack, Text, Tooltip } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
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
  const [crew, setCrew] = useState<Crew | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [crewType, setCrewType] = useState('');
  const [newCohort, setNewCohort] = useState('');
  const [newClaim, setNewClaim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await getRepositories().crews.findByGame(gameId);
    if (r.success) setCrew(r.data);
    else setError(r.error?.message ?? t('components.crewSheet.loadFailed'));
    setLoaded(true);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const createCrew = async () => {
    const userId = user?.id;
    if (!userId) return;
    setBusy(true);
    const r = await getRepositories().crews.create(userId, {
      gameId,
      crewType: crewType || undefined,
    });
    setBusy(false);
    if (r.success) {
      setError(null);
      await load();
    } else setError(r.error?.message ?? t('components.crewSheet.createFailed'));
  };

  const save = async (patch: UpdateCrewData) => {
    if (!crew) return;
    setBusy(true);
    const r = await getRepositories().crews.update(crew.id, patch);
    setBusy(false);
    if (r.success) await load();
    else setError(r.error?.message ?? t('components.crewSheet.updateFailed'));
  };

  if (!loaded) {
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
          <label className='flex flex-col gap-1 text-sm'>
            {t('components.crewSheet.crewType')}
            <select
              className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
              value={crewType}
              onChange={e => setCrewType(e.target.value)}
            >
              <option value=''>—</option>
              {(crewRules?.types ?? []).map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
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
        {stat(t('components.crewSheet.tier'), 'tier', crew.tier, 4)}
        {stat(t('components.crewSheet.rep'), 'rep', crew.rep, 12)}
        {stat(t('components.crewSheet.heat'), 'heat', crew.heat, 9, () => {
          // BitD: filling the heat track (9) marks a Wanted level and resets heat.
          const next = applyHeat({ heat: crew.heat, wanted: crew.wanted }, 1);
          void save({ heat: next.heat, wanted: next.wanted });
        })}
        {stat(t('components.crewSheet.wanted'), 'wanted', crew.wanted, 4)}
        {stat(t('components.crewSheet.coin'), 'coin', crew.coin)}
        {stat(t('components.crewSheet.vault'), 'vault', crew.vault)}
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
            <label className='flex flex-col gap-1 text-sm'>
              {t('components.crewSheet.addClaim')}
              <select
                className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
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
              </select>
            </label>
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
