'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Character, CharacterStatus } from '@heist-mind/database';
import { Badge, Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n/hooks';

const STATUS_VARIANT: Record<CharacterStatus, 'success' | 'steel' | 'outline' | 'stress-critical'> = {
  active: 'success',
  inactive: 'outline',
  retired: 'steel',
  dead: 'stress-critical',
};

/**
 * The campaign roster: every character attributed to its player, with status. Active characters lead;
 * retired/dead ones drop to a de-emphasised section (kept for history, not deleted). A character can
 * be RETIRED by its owner or the GM — status → retired, carried coin banked into stash (BitD), logged.
 */
export function CharacterRoster({
  gameId,
  gmId,
  userId,
  characters,
  onChanged,
}: {
  gameId: string;
  gmId: string | undefined;
  userId: string | undefined;
  characters: Character[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Resolve each character's owner (createdBy) → a player name for attribution.
  useEffect(() => {
    let active = true;
    const ids = [...new Set(characters.map(c => c.createdBy))];
    Promise.all(
      ids.map(id =>
        getRepositories()
          .profiles.findById(id)
          .then(
            r => [id, r.success && r.data ? r.data.displayName || r.data.username || '' : ''] as const
          )
      )
    ).then(entries => {
      if (active) setOwners(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [characters]);

  const ownerName = (id: string) => owners[id] || t('components.roster.unknownPlayer');
  const canManage = (ch: Character) => userId != null && (userId === gmId || userId === ch.createdBy);

  const retire = async (ch: Character) => {
    if (!userId) return;
    setBusy(ch.id);
    const data = ch.characterData;
    const coins = data?.coins ?? 0;
    // Retire: status → retired, bank carried coin into stash (BitD), keep the record.
    await getRepositories().characters.update(ch.id, userId, {
      status: 'retired',
      characterData: { ...data, stash: (data?.stash ?? 0) + coins, coins: 0 },
    });
    await getRepositories().rolls.create(userId, {
      gameId,
      characterId: ch.id,
      kind: 'note',
      label: ch.name,
      dice: 0,
      results: [],
      note: t('components.roster.retiredNote'),
    });
    setBusy(null);
    setConfirming(null);
    onChanged();
  };

  const renderCard = (ch: Character) => (
    <Card key={ch.id} variant='character'>
      <Stack direction='row' justify='between' align='center' className='flex-wrap'>
        <div>
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <Heading level='h3'>{ch.name}</Heading>
            {ch.status !== 'active' && (
              <Badge variant={STATUS_VARIANT[ch.status]} className='capitalize'>
                {ch.status}
              </Badge>
            )}
          </Stack>
          <Text variant='muted' size='sm'>
            {t('components.roster.meta', {
              playbook: ch.playbookType,
              xp: ch.experiencePoints,
              player: ownerName(ch.createdBy),
            })}
          </Text>
        </div>
        <Stack direction='row' gap='sm' align='center'>
          {ch.status === 'active' &&
            canManage(ch) &&
            (confirming === ch.id ? (
              <Button
                variant='crimson'
                size='sm'
                loading={busy === ch.id}
                onClick={() => void retire(ch)}
              >
                {t('components.roster.confirmRetire')}
              </Button>
            ) : (
              <Button variant='outline' size='sm' onClick={() => setConfirming(ch.id)}>
                {t('components.roster.retire')}
              </Button>
            ))}
          <Button asChild variant='outline' size='sm'>
            <Link href={`/games/${gameId}/characters/${ch.id}`}>{t('components.roster.view')}</Link>
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  const active = characters.filter(c => c.status === 'active');
  const inactive = characters.filter(c => c.status !== 'active');

  return (
    <Stack direction='column' gap='md'>
      {active.map(renderCard)}
      {inactive.length > 0 && (
        <>
          <Text variant='muted' size='sm' className='font-display'>
            {t('components.roster.retiredHeading')}
          </Text>
          {inactive.map(renderCard)}
        </>
      )}
    </Stack>
  );
}
