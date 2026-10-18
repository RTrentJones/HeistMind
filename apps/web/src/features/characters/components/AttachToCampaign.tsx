'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CharacterWithDetails } from '@heist-mind/core';
import { Alert, Button, Card, Heading, Select, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useAttachCharacter, useDetachCharacter } from '@/features/characters/data/mutations';
import { useAttachableGameIds } from '@/features/characters/data/queries';
import { useGamesByPlayer } from '@/features/games/data/queries';
import { errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Owner controls for a character's campaign membership (single active campaign):
 * - **Standalone** → "Bring to a campaign" (attach into a same-ruleset campaign).
 * - **In a campaign** → "Move to another campaign" (re-home to a different same-ruleset campaign,
 *   excluding the current one) + "Return to My Characters" (detach back to standalone).
 *
 * Attach/move go through `attach_character_to_game`, detach through `detach_character` — both
 * SECURITY DEFINER RPCs that re-check ownership + membership + ruleset match server-side (00014).
 * Rendered for the owner only.
 */
export function AttachToCampaign({ character }: { character: CharacterWithDetails }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const inCampaign = !!character.gameId;
  const allGames = useGamesByPlayer(user?.id);
  const attachMutation = useAttachCharacter();
  const detachMutation = useDetachCharacter();
  const [gameId, setGameId] = useState('');
  const [confirmingDetach, setConfirmingDetach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = attachMutation.isPending || detachMutation.isPending;

  // Eligible targets come from the server (`attachable_games_for_character`, 00025) — the same
  // rule the attach RPC enforces: the same ruleset row, the owner's copy of it (00023
  // `copiedFrom`), or a content-identical copy (a catalog built-in each user loaded separately).
  // If that lookup fails (e.g. an older DB), fall back to the strict exact-row match.
  const attachable = useAttachableGameIds(character.id);
  const copiedFrom = character.ruleset?.compatibilityFlags?.copiedFrom;
  const games = useMemo(() => {
    const allowed = attachable.data ? new Set(attachable.data) : null;
    return (allGames.data ?? []).filter(g =>
      allowed
        ? allowed.has(g.id)
        : (g.rulesetId === character.originalRulesetId || g.rulesetId === copiedFrom) &&
          g.id !== character.gameId
    );
  }, [allGames.data, attachable.data, character.originalRulesetId, character.gameId, copiedFrom]);

  // Default the picker to the first eligible target (keep the selection if it's still valid).
  useEffect(() => {
    setGameId(prev => (games.some(g => g.id === prev) ? prev : (games[0]?.id ?? '')));
  }, [games]);

  const attach = async () => {
    if (!gameId) return;
    setError(null);
    try {
      await attachMutation.mutateAsync({ characterId: character.id, gameId });
      router.push(`/games/${gameId}/characters/${character.id}`);
    } catch (err) {
      setError(errorMessage(err) || t('components.attachToCampaign.failed'));
    }
  };

  const detach = async () => {
    setError(null);
    try {
      await detachMutation.mutateAsync(character.id);
      router.push(`/characters/${character.id}`);
    } catch (err) {
      setError(errorMessage(err) || t('components.attachToCampaign.failedDetach'));
    }
  };

  const hasTargets = games.length > 0;
  // Until both lookups answer, hold the picker's height instead of flashing the "none" copy and
  // then swapping in the picker (a layout shift on every standalone sheet).
  const resolving = allGames.isPending || attachable.isPending;

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3' as='h2'>
          {inCampaign
            ? t('components.attachToCampaign.moveTitle')
            : t('components.attachToCampaign.title')}
        </Heading>
        <Text variant='muted' size='sm'>
          {inCampaign
            ? t('components.attachToCampaign.moveHelp')
            : t('components.attachToCampaign.help')}
        </Text>
        {error && (
          <Alert variant='destructive' size='sm'>
            {error}
          </Alert>
        )}

        {/* The move/attach picker — only when there's an eligible target. */}
        {resolving ? (
          <div aria-hidden='true' className='h-16' data-testid='attach-resolving' />
        ) : hasTargets ? (
          <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
            <Select
              label={t('components.attachToCampaign.select')}
              value={gameId}
              onChange={e => setGameId(e.target.value)}
            >
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <Button
              variant='ember'
              size='sm'
              loading={busy}
              disabled={!gameId}
              onClick={() => void attach()}
            >
              {inCampaign
                ? t('components.attachToCampaign.move')
                : t('components.attachToCampaign.attach')}
            </Button>
          </Stack>
        ) : (
          !inCampaign && (
            <Text variant='muted' size='sm' data-testid='attach-none'>
              {t('components.attachToCampaign.none', {
                ruleset: character.ruleset?.name ?? t('components.attachToCampaign.thisRuleset'),
              })}{' '}
              <Link
                href={
                  character.originalRulesetId
                    ? `/games/new?ruleset=${encodeURIComponent(character.originalRulesetId)}`
                    : '/games/new'
                }
                className='underline'
              >
                {t('components.attachToCampaign.createCampaign')}
              </Link>{' '}
              {t('components.attachToCampaign.or')}{' '}
              <Link href='/games#join' className='underline'>
                {t('components.attachToCampaign.joinWithCode')}
              </Link>
              .
            </Text>
          )
        )}

        {/* Return to standalone — only when currently in a campaign. */}
        {inCampaign &&
          (confirmingDetach ? (
            <Button variant='crimson' size='sm' loading={busy} onClick={() => void detach()}>
              {t('components.attachToCampaign.confirmDetach')}
            </Button>
          ) : (
            <Button variant='outline' size='sm' onClick={() => setConfirmingDetach(true)}>
              {t('components.attachToCampaign.detach')}
            </Button>
          ))}
      </Stack>
    </Card>
  );
}
