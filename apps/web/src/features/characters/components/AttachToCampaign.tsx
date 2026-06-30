'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CharacterWithDetails } from '@heist-mind/database';
import { Alert, Button, Card, Heading, Select, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useGamesByPlayer } from '@/features/games/data/queries';
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
  const [gameId, setGameId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDetach, setConfirmingDetach] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible targets: the owner's campaigns on this character's ruleset, minus the current one.
  const games = useMemo(
    () =>
      (allGames.data ?? []).filter(
        g => g.rulesetId === character.originalRulesetId && g.id !== character.gameId
      ),
    [allGames.data, character.originalRulesetId, character.gameId]
  );

  // Default the picker to the first eligible target (keep the selection if it's still valid).
  useEffect(() => {
    setGameId(prev => (games.some(g => g.id === prev) ? prev : (games[0]?.id ?? '')));
  }, [games]);

  const attach = async () => {
    if (!gameId) return;
    setBusy(true);
    setError(null);
    const r = await getRepositories().characters.attachToGame(character.id, gameId);
    setBusy(false);
    if (!r.success) {
      setError(r.error?.message ?? t('components.attachToCampaign.failed'));
      return;
    }
    router.push(`/games/${gameId}/characters/${character.id}`);
  };

  const detach = async () => {
    setBusy(true);
    setError(null);
    const r = await getRepositories().characters.detachFromGame(character.id);
    setBusy(false);
    if (!r.success) {
      setError(r.error?.message ?? t('components.attachToCampaign.failedDetach'));
      return;
    }
    router.push(`/characters/${character.id}`);
  };

  const hasTargets = games.length > 0;

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3'>
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
        {hasTargets ? (
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
            <Text variant='muted' size='sm'>
              {t('components.attachToCampaign.none')}
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
