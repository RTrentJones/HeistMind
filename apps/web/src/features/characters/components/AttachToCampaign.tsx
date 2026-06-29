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
 * "Bring to a campaign" — link a standalone character (Phase 5) into one of the player's campaigns
 * that uses the SAME ruleset. The attach goes through the `attach_character_to_game` RPC, which
 * re-checks ownership + active membership + ruleset match server-side. Single active campaign.
 */
export function AttachToCampaign({ character }: { character: CharacterWithDetails }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [games, setGames] = useState<Game[] | null>(null);
  const [gameId, setGameId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only campaigns the player belongs to AND that use this character's ruleset can accept it.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    void getRepositories()
      .games.findByPlayer(userId)
      .then(r => {
        if (!active) return;
        const matches = r.success
          ? r.data.filter(g => g.rulesetId === character.originalRulesetId)
          : [];
        setGames(matches);
        if (matches[0]) setGameId(matches[0].id);
      });
    return () => {
      active = false;
    };
  }, [user?.id, character.originalRulesetId]);

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

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3'>{t('components.attachToCampaign.title')}</Heading>
        <Text variant='muted' size='sm'>
          {t('components.attachToCampaign.help')}
        </Text>
        {error && (
          <Alert variant='destructive' size='sm'>
            {error}
          </Alert>
        )}
        {games !== null && games.length === 0 ? (
          <Text variant='muted' size='sm'>
            {t('components.attachToCampaign.none')}
          </Text>
        ) : (
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
              {t('components.attachToCampaign.attach')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
