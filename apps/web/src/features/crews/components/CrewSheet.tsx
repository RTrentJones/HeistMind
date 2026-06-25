'use client';

import { useEffect, useState } from 'react';
import type { Crew, CrewRules, UpdateCrewData } from '@heist-mind/database';
import { Alert, Badge, Button, Heading, Input, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

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
    else setError(r.error?.message ?? 'Failed to load the crew');
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
    } else setError(r.error?.message ?? 'Failed to create the crew');
  };

  const save = async (patch: UpdateCrewData) => {
    if (!crew) return;
    setBusy(true);
    const r = await getRepositories().crews.update(crew.id, patch);
    setBusy(false);
    if (r.success) await load();
    else setError(r.error?.message ?? 'Failed to update the crew');
  };

  if (!loaded) {
    return (
      <Text variant='muted' size='sm'>
        Loading crew…
      </Text>
    );
  }

  if (!crew) {
    if (!isGm) {
      return (
        <Text variant='muted' size='sm'>
          No crew sheet yet.
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
          Start the crew sheet — pick a crew type.
        </Text>
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <label className='flex flex-col gap-1 text-sm'>
            Crew type
            <select
              className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
              value={crewType}
              onChange={e => setCrewType(e.target.value)}
            >
              <option value=''>—</option>
              {(crewRules?.types ?? []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant='ember' disabled={busy} onClick={createCrew}>
            Create crew
          </Button>
        </Stack>
      </Stack>
    );
  }

  const typeName = crewRules?.types.find(t => t.id === crew.crewType)?.name ?? crew.crewType ?? '—';
  const stat = (label: string, key: keyof UpdateCrewData, value: number, max?: number) => (
    <Stack direction='column' gap='xs' align='center'>
      <Text size='sm' className='font-display'>
        {label}
      </Text>
      <Stack direction='row' gap='xs' align='center'>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={`Decrease ${label}`}
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
            aria-label={`Increase ${label}`}
            disabled={busy || (max != null && value >= max)}
            onClick={() => save({ [key]: value + 1 } as UpdateCrewData)}
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
        <Badge variant='steel'>Hold: {crew.hold}</Badge>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() => save({ hold: crew.hold === 'strong' ? 'weak' : 'strong' })}
          >
            Toggle hold
          </Button>
        )}
      </Stack>

      <Stack direction='row' gap='lg' className='flex-wrap'>
        {stat('Tier', 'tier', crew.tier, 4)}
        {stat('Rep', 'rep', crew.rep, 12)}
        {stat('Heat', 'heat', crew.heat, 9)}
        {stat('Wanted', 'wanted', crew.wanted, 4)}
        {stat('Coin', 'coin', crew.coin)}
        {stat('Vault', 'vault', crew.vault)}
      </Stack>

      {crewRules?.abilities && crewRules.abilities.length > 0 && (
        <div>
          <Text as='strong'>Crew Abilities</Text>
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
              None taken.
            </Text>
          )}
        </div>
      )}

      <div>
        <Text as='strong'>Claims</Text>
        <Stack direction='row' gap='sm' className='flex-wrap'>
          {crew.claims.length === 0 && (
            <Text variant='muted' size='sm'>
              None held.
            </Text>
          )}
          {crew.claims.map(c => (
            <Badge key={c} variant='steel'>
              {c}
              {isGm && (
                <button
                  type='button'
                  aria-label={`Remove claim ${c}`}
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
              Add claim
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
              Add claim
            </Button>
          </Stack>
        )}
      </div>

      <div>
        <Text as='strong'>Cohorts</Text>
        <Stack direction='row' gap='sm' className='flex-wrap'>
          {crew.cohorts.length === 0 && (
            <Text variant='muted' size='sm'>
              None.
            </Text>
          )}
          {crew.cohorts.map(c => (
            <Badge key={c} variant='steel'>
              {c}
              {isGm && (
                <button
                  type='button'
                  aria-label={`Remove cohort ${c}`}
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
              label='Add cohort'
              value={newCohort}
              onChange={e => setNewCohort(e.target.value)}
              placeholder='e.g. A gang of dockhands'
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
              Add
            </Button>
          </Stack>
        )}
      </div>
    </Stack>
  );
}
