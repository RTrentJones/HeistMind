'use client';

import { useState } from 'react';
import { factionStatusLabel, type Faction, type FactionDefinition } from '@heist-mind/core';
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
  useShiftFactionTier,
} from '@/features/factions/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { NewFactionForm, type NewFactionValues } from './NewFactionForm';

/**
 * Factions + status for a campaign. The city's powers, with a tier and a status toward the crew
 * (−3 war … +3 allied). Faction "projects" are clocks linked to the faction. DB-backed shared
 * state; members read, the GM maintains. RLS enforces GM-write server-side.
 *
 * The GM adds factions two ways (F96): the free-text form (always — Blades in the Dark ships no
 * suggestions, setting IP) and, when the ruleset suggests powers, a one-click seed picker.
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
  // F60 — friendly lead, raw repository message as detail.
  const shownError =
    error ??
    (factionsQuery.error
      ? `${t('components.factionsPanel.loadFailed')} — ${factionsQuery.error.message}`
      : null);

  const failMessage = (e: Error) =>
    `${t('components.factionsPanel.addFailed')}${e.message ? ` — ${e.message}` : ''}`;

  // Sequenced: the form clears only once the faction actually landed.
  const addCustom = async (values: NewFactionValues): Promise<boolean> => {
    const userId = user?.id;
    if (!userId) return false;
    setError(null);
    try {
      await createFaction.mutateAsync({ userId, data: { gameId, ...values } });
      return true;
    } catch (e) {
      setError(failMessage(e as Error));
      return false;
    }
  };

  const addSuggested = () => {
    const userId = user?.id;
    if (!userId || !pick) return;
    const def = suggestions?.find(s => s.name === pick);
    setError(null);
    createFaction.mutate(
      { userId, data: { gameId, name: pick, factionType: def?.type, tier: def?.tier ?? 0 } },
      {
        onSuccess: () => setPick(''),
        onError: e => setError(failMessage(e)),
      }
    );
  };

  const available = (suggestions ?? []).filter(s => !factions.some(f => f.name === s.name));

  // F74 — guard the initial load so the empty state doesn't flash before the first fetch resolves.
  if (factionsQuery.isLoading) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.factionsPanel.loading')}
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='md'>
      {shownError && (
        <Alert variant='destructive' size='sm'>
          {shownError}
        </Alert>
      )}

      {factions.length === 0 ? (
        <Text variant='muted' size='sm' data-testid='factions-empty'>
          {t('components.factionsPanel.empty')}{' '}
          {isGm
            ? available.length > 0
              ? t('components.factionsPanel.emptyGmHintSuggested')
              : t('components.factionsPanel.emptyGmHint')
            : t('components.factionsPanel.emptyPlayerHint')}
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
        <form
          onSubmit={e => {
            e.preventDefault();
            addSuggested();
          }}
        >
          <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
            <Select
              label={t('components.factionsPanel.suggestedLabel')}
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
            <Button type='submit' variant='outline' disabled={createFaction.isPending || !pick}>
              {t('components.factionsPanel.addSuggested')}
            </Button>
          </Stack>
        </form>
      )}

      {isGm && (
        <NewFactionForm
          existingNames={factions.map(f => f.name)}
          busy={createFaction.isPending}
          onCreate={addCustom}
        />
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
  const shiftTier = useShiftFactionTier(faction.gameId);
  const setStatusMut = useSetFactionStatus(faction.gameId);
  const deleteFaction = useDeleteFaction(faction.gameId);
  const createClock = useCreateClock(faction.gameId);
  const tickClock = useTickClock(faction.gameId);
  const deleteClock = useDeleteClock(faction.gameId);

  const busy =
    shiftTier.isPending ||
    setStatusMut.isPending ||
    deleteFaction.isPending ||
    createClock.isPending ||
    tickClock.isPending ||
    deleteClock.isPending;
  const onErr = {
    onError: (e: unknown) =>
      onError(
        `${t('components.factionsPanel.updateFailed')}${
          (e as Error).message ? ` — ${(e as Error).message}` : ''
        }`
      ),
  };

  // Status is table-visible mechanical state (war … allied) — through the ENGINE so the shift
  // also lands in the campaign feed. The mutation applies the delta to the freshest cached value.
  const setStatus = (delta: number) => {
    if (!userId) return;
    setStatusMut.mutate(
      {
        faction,
        userId,
        delta,
        logLabel: faction.name,
        logNote: next =>
          t('components.factionsPanel.logStatusNote', {
            status: next > 0 ? `+${next}` : `${next}`,
            label: factionStatusLabel(next),
          }),
      },
      onErr
    );
  };
  const setTier = (delta: number) => shiftTier.mutate({ faction, delta }, onErr);

  return (
    <Card variant='default'>
      <Stack direction='column' gap='sm'>
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          <Text as='strong'>{faction.name}</Text>
          {faction.factionType && <Badge variant='steel'>{faction.factionType}</Badge>}
          {isGm && (
            <ConfirmButton
              variant='ghost'
              aria-label={t('components.factionsPanel.removeAria', { name: faction.name })}
              confirmAriaLabel={t('components.confirmAction.deleteFactionAria', {
                name: faction.name,
              })}
              confirmLabel={t('components.confirmAction.deleteFaction')}
              disabled={busy}
              onConfirm={() => deleteFaction.mutate(faction.id, onErr)}
            >
              {t('components.factionsPanel.remove')}
            </ConfirmButton>
          )}
        </Stack>

        {faction.notes && (
          <Text variant='muted' size='sm' className='whitespace-pre-line'>
            {faction.notes}
          </Text>
        )}

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
            {/* F47 — status −3 is WAR, a table-changing state (extra heat, no downtime safety);
                call it out beyond the generic red badge. */}
            {faction.status <= -3 && (
              <Text size='sm' className='text-semantic-error'>
                {t('components.factionsPanel.atWarHint')}
              </Text>
            )}
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
