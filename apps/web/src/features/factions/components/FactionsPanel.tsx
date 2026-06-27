'use client';

import { useEffect, useState } from 'react';
import {
  CLOCK_SEGMENTS,
  factionStatusLabel,
  type Clock as ClockType,
  type ClockSegments,
  type Faction,
  type FactionDefinition,
} from '@heist-mind/database';
import { Alert, Badge, Button, Card, Clock, Input, Stack, Text, Tooltip } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Factions + status for a campaign. The city's powers, with a tier and a status toward the crew
 * (−3 war … +3 allied). Faction "projects" are clocks linked to the faction. DB-backed shared
 * state; members read, the GM maintains. RLS enforces GM-write server-side.
 */
export function FactionsPanel({
  gameId,
  isGm,
  suggestions,
}: {
  gameId: string;
  isGm: boolean;
  suggestions?: FactionDefinition[];
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [clocks, setClocks] = useState<ClockType[]>([]);
  const [pick, setPick] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const repos = getRepositories();
    const [f, c] = await Promise.all([
      repos.factions.findByGame(gameId),
      repos.clocks.findByGame(gameId),
    ]);
    if (f.success) setFactions(f.data);
    else setError(f.error?.message ?? t('components.factionsPanel.loadFailed'));
    if (c.success) setClocks(c.data);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const addSuggested = async () => {
    const userId = user?.id;
    if (!userId || !pick) return;
    const def = suggestions?.find(s => s.name === pick);
    setBusy(true);
    const r = await getRepositories().factions.create(userId, {
      gameId,
      name: pick,
      factionType: def?.type,
      tier: def?.tier ?? 0,
    });
    setBusy(false);
    if (r.success) {
      setPick('');
      setError(null);
      await load();
    } else setError(r.error?.message ?? t('components.factionsPanel.addFailed'));
  };

  const onChange = async () => {
    await load();
  };

  const available = (suggestions ?? []).filter(s => !factions.some(f => f.name === s.name));

  return (
    <Stack direction='column' gap='md'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}

      {factions.length === 0 ? (
        <Text variant='muted' size='sm'>
          {t('components.factionsPanel.empty')}
          {isGm ? t('components.factionsPanel.emptyGmHint') : ''}
        </Text>
      ) : (
        <Stack direction='column' gap='md'>
          {factions.map(f => (
            <FactionCard
              key={f.id}
              faction={f}
              clocks={clocks.filter(c => c.linkedType === 'faction' && c.linkedId === f.id)}
              isGm={isGm}
              userId={user?.id}
              onChange={onChange}
              onError={setError}
            />
          ))}
        </Stack>
      )}

      {isGm && available.length > 0 && (
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <label className='flex flex-col gap-1 text-sm'>
            {t('components.factionsPanel.addFaction')}
            <select
              className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
              value={pick}
              onChange={e => setPick(e.target.value)}
            >
              <option value=''>—</option>
              {available.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.tier != null
                    ? ` (${t('components.factionsPanel.tierOption', { tier: s.tier })})`
                    : ''}
                </option>
              ))}
            </select>
          </label>
          <Button variant='ember' disabled={busy || !pick} onClick={addSuggested}>
            {t('components.factionsPanel.addFaction')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

/** One faction: tier + status controls, its project clocks, and (GM) a way to add a clock. */
function FactionCard({
  faction,
  clocks,
  isGm,
  userId,
  onChange,
  onError,
}: {
  faction: Faction;
  clocks: ClockType[];
  isGm: boolean;
  userId?: string;
  onChange: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [clockName, setClockName] = useState('');
  const [segments, setSegments] = useState<ClockSegments>(4);

  const run = async (fn: () => Promise<{ success: boolean; error?: { message: string } }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.success) await onChange();
    else onError(r.error?.message ?? t('components.factionsPanel.updateFailed'));
  };

  const repos = getRepositories();
  const setStatus = (delta: number) =>
    run(() => repos.factions.update(faction.id, { status: faction.status + delta }));
  const setTier = (delta: number) =>
    run(() => repos.factions.update(faction.id, { tier: faction.tier + delta }));

  return (
    <Card variant='default'>
      <Stack direction='column' gap='sm'>
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          <Text as='strong'>{faction.name}</Text>
          {faction.factionType && <Badge variant='steel'>{faction.factionType}</Badge>}
          {isGm && (
            <Button
              variant='ghost'
              size='sm'
              aria-label={t('components.factionsPanel.removeAria', { name: faction.name })}
              disabled={busy}
              onClick={() => run(() => repos.factions.delete(faction.id))}
            >
              {t('components.factionsPanel.remove')}
            </Button>
          )}
        </Stack>

        <Stack direction='row' gap='lg' align='center' className='flex-wrap'>
          <Stack direction='row' gap='xs' align='center'>
            <Text size='sm'>{t('components.factionsPanel.tier')}</Text>
            {isGm && (
              <Button
                variant='outline'
                size='sm'
                aria-label={t('components.factionsPanel.lowerTierAria', { name: faction.name })}
                disabled={busy || faction.tier <= 0}
                onClick={() => setTier(-1)}
              >
                −
              </Button>
            )}
            <Badge variant='gold'>
              <span data-testid={`faction-tier-${faction.id}`}>{faction.tier}</span>
              {t('components.factionsPanel.tierMax')}
            </Badge>
            {isGm && (
              <Button
                variant='outline'
                size='sm'
                aria-label={t('components.factionsPanel.raiseTierAria', { name: faction.name })}
                disabled={busy || faction.tier >= 6}
                onClick={() => setTier(1)}
              >
                +
              </Button>
            )}
          </Stack>

          <Stack direction='row' gap='xs' align='center'>
            <Text size='sm'>{t('components.factionsPanel.status')}</Text>
            <Tooltip
              variant='dark'
              size='lg'
              content={
                <div className='space-y-1'>
                  <div className='font-semibold'>
                    {t('components.factionsPanel.statusLegendTitle')}
                  </div>
                  <div className='text-xs opacity-90'>
                    {t('components.factionsPanel.statusLegendScale')}
                  </div>
                </div>
              }
            >
              <span
                tabIndex={0}
                className='cursor-help text-xs text-foreground-muted'
                aria-label={t('components.factionsPanel.statusLegendAria')}
              >
                ⓘ
              </span>
            </Tooltip>
            {isGm && (
              <Button
                variant='outline'
                size='sm'
                aria-label={t('components.factionsPanel.lowerStatusAria', { name: faction.name })}
                disabled={busy || faction.status <= -3}
                onClick={() => setStatus(-1)}
              >
                −
              </Button>
            )}
            <Badge variant={faction.status < 0 ? 'stress-critical' : 'steel'}>
              <span data-testid={`faction-status-${faction.id}`}>
                {faction.status > 0 ? `+${faction.status}` : faction.status}
              </span>{' '}
              {factionStatusLabel(faction.status)}
            </Badge>
            {isGm && (
              <Button
                variant='outline'
                size='sm'
                aria-label={t('components.factionsPanel.raiseStatusAria', { name: faction.name })}
                disabled={busy || faction.status >= 3}
                onClick={() => setStatus(1)}
              >
                +
              </Button>
            )}
          </Stack>
        </Stack>

        {clocks.length > 0 && (
          <Stack direction='row' gap='md' className='flex-wrap'>
            {clocks.map(c => (
              <Stack key={c.id} direction='column' gap='xs' align='center'>
                <Clock segments={c.segments} filled={c.filled} label={c.name} size={72} />
                {isGm && (
                  <Stack direction='row' gap='xs' align='center'>
                    <Button
                      variant='outline'
                      size='sm'
                      aria-label={t('components.factionsPanel.reduceClockAria', { name: c.name })}
                      disabled={busy || c.filled <= 0}
                      onClick={() => run(() => repos.clocks.update(c.id, { filled: c.filled - 1 }))}
                    >
                      −1
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      aria-label={t('components.factionsPanel.advanceClockAria', { name: c.name })}
                      disabled={busy || c.filled >= c.segments}
                      onClick={() => run(() => repos.clocks.update(c.id, { filled: c.filled + 1 }))}
                    >
                      +1
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t('components.factionsPanel.removeClockAria', { name: c.name })}
                      disabled={busy}
                      onClick={() => run(() => repos.clocks.delete(c.id))}
                    >
                      ×
                    </Button>
                  </Stack>
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {isGm && (
          <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
            <Input
              label={t('components.factionsPanel.projectClockLabel', { name: faction.name })}
              value={clockName}
              onChange={e => setClockName(e.target.value)}
              placeholder={t('components.factionsPanel.projectClockPlaceholder')}
            />
            <label className='flex flex-col gap-1 text-sm'>
              {t('components.factionsPanel.segments')}
              <select
                className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
                value={segments}
                onChange={e => setSegments(Number(e.target.value) as ClockSegments)}
              >
                {CLOCK_SEGMENTS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant='outline'
              size='sm'
              aria-label={t('components.factionsPanel.addClockForAria', { name: faction.name })}
              disabled={busy || !clockName.trim() || !userId}
              onClick={() => {
                const name = clockName.trim();
                if (!userId || !name) return;
                setClockName('');
                void run(() =>
                  repos.clocks.create(userId, {
                    gameId: faction.gameId,
                    name,
                    segments,
                    linkedType: 'faction',
                    linkedId: faction.id,
                  })
                );
              }}
            >
              {t('components.factionsPanel.addClock')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
