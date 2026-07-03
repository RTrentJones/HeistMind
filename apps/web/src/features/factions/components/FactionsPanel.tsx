'use client';

import { useState } from 'react';
import {
  clampFactionStatus,
  factionStatusLabel,
  type Faction,
  type FactionDefinition,
} from '@heist-mind/core';
import { type Clock as ClockType } from '@heist-mind/core';
import { Alert, Badge, Button, Card, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useClocksByGame } from '@/features/clocks/data/queries';
import { useCreateClock, useDeleteClock, useTickClock } from '@/features/clocks/data/mutations';
import { ClockTile } from '@/features/clocks/components/ClockTile';
import { NewClockForm } from '@/features/clocks/components/NewClockForm';
import { useFactionsByGame } from '@/features/factions/data/queries';
import {
  useCreateFaction,
  useDeleteFaction,
  useSetFactionStatus,
  useUpdateFaction,
} from '@/features/factions/data/mutations';
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
  const factionsQuery = useFactionsByGame(gameId);
  const clocksQuery = useClocksByGame(gameId);
  const createFaction = useCreateFaction(gameId);
  const [pick, setPick] = useState('');
  const [error, setError] = useState<string | null>(null);

  const factions = factionsQuery.data ?? [];
  const clocks = clocksQuery.data ?? [];
  const shownError = error ?? factionsQuery.error?.message ?? null;

  const addSuggested = () => {
    const userId = user?.id;
    if (!userId || !pick) return;
    const def = suggestions?.find(s => s.name === pick);
    setError(null);
    createFaction.mutate(
      { userId, data: { gameId, name: pick, factionType: def?.type, tier: def?.tier ?? 0 } },
      {
        onSuccess: () => setPick(''),
        onError: e => setError(e.message ?? t('components.factionsPanel.addFailed')),
      }
    );
  };

  const available = (suggestions ?? []).filter(s => !factions.some(f => f.name === s.name));

  return (
    <Stack direction='column' gap='md'>
      {shownError && (
        <Alert variant='destructive' size='sm'>
          {shownError}
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
              onError={setError}
            />
          ))}
        </Stack>
      )}

      {isGm && available.length > 0 && (
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Select
            label={t('components.factionsPanel.addFaction')}
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
          </Select>
          <Button
            variant='ember'
            disabled={createFaction.isPending || !pick}
            onClick={addSuggested}
          >
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
  onError,
}: {
  faction: Faction;
  clocks: ClockType[];
  isGm: boolean;
  userId?: string;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation();
  const updateFaction = useUpdateFaction(faction.gameId);
  const setStatusMut = useSetFactionStatus(faction.gameId);
  const deleteFaction = useDeleteFaction(faction.gameId);
  const createClock = useCreateClock(faction.gameId);
  const tickClock = useTickClock(faction.gameId);
  const deleteClock = useDeleteClock(faction.gameId);

  const busy =
    updateFaction.isPending ||
    setStatusMut.isPending ||
    deleteFaction.isPending ||
    createClock.isPending ||
    tickClock.isPending ||
    deleteClock.isPending;
  const onErr = {
    onError: (e: unknown) =>
      onError((e as Error).message ?? t('components.factionsPanel.updateFailed')),
  };

  // Status is table-visible mechanical state (war … allied) — through the ENGINE so the shift
  // also lands in the campaign feed.
  const setStatus = (delta: number) => {
    if (!userId) return;
    const next = clampFactionStatus(faction.status + delta);
    setStatusMut.mutate(
      {
        faction,
        userId,
        status: next,
        logLabel: faction.name,
        logNote: t('components.factionsPanel.logStatusNote', {
          status: next > 0 ? `+${next}` : `${next}`,
          label: factionStatusLabel(next),
        }),
      },
      onErr
    );
  };
  const setTier = (delta: number) =>
    updateFaction.mutate({ id: faction.id, patch: { tier: faction.tier + delta } }, onErr);

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
              onClick={() => deleteFaction.mutate(faction.id, onErr)}
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
              <ClockTile
                key={c.id}
                clock={c}
                isGm={isGm}
                busy={busy}
                size={72}
                removeLabel='×'
                onTick={(clock, delta) => {
                  if (!userId) return;
                  tickClock.mutate(
                    {
                      clock,
                      userId,
                      delta,
                      logLabel: clock.name,
                      logNote: t('components.clocksPanel.logCompleteNote'),
                    },
                    onErr
                  );
                }}
                onRemove={id => deleteClock.mutate(id, onErr)}
              />
            ))}
          </Stack>
        )}

        {isGm && (
          <NewClockForm
            label={t('components.factionsPanel.projectClockLabel', { name: faction.name })}
            placeholder={t('components.factionsPanel.projectClockPlaceholder')}
            cta={t('components.factionsPanel.addClock')}
            ctaAriaLabel={t('components.factionsPanel.addClockForAria', { name: faction.name })}
            ctaVariant='outline'
            busy={busy}
            onCreate={(name, segments) => {
              if (!userId) return;
              createClock.mutate(
                {
                  userId,
                  data: {
                    gameId: faction.gameId,
                    name,
                    segments,
                    linkedType: 'faction',
                    linkedId: faction.id,
                  },
                },
                onErr
              );
            }}
          />
        )}
      </Stack>
    </Card>
  );
}
