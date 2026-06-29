'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CharacterWithDetails, Game } from '@heist-mind/database';
import { Alert, Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

const sel =
  'rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm text-foreground-primary';

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
  const [games, setGames] = useState<Game[] | null>(null);
  const [gameId, setGameId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDetach, setConfirmingDetach] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible targets: the owner's campaigns on this character's ruleset, minus the current one.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    void getRepositories()
      .games.findByPlayer(userId)
      .then(r => {
        if (!active) return;
        const matches = r.success
          ? r.data.filter(
              g => g.rulesetId === character.originalRulesetId && g.id !== character.gameId
            )
          : [];
        setGames(matches);
        if (matches[0]) setGameId(matches[0].id);
      });
    return () => {
      active = false;
    };
  }, [user?.id, character.originalRulesetId, character.gameId]);

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

  const hasTargets = games !== null && games.length > 0;

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
            <label className='flex flex-col gap-1 text-sm'>
              {t('components.attachToCampaign.select')}
              <select className={sel} value={gameId} onChange={e => setGameId(e.target.value)}>
                {(games ?? []).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
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
            <Button
              variant='crimson'
              size='sm'
              loading={busy}
              onClick={() => void detach()}
            >
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
