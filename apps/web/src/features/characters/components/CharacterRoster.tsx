'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Character } from '@heist-mind/database';
import { Button, Stack, Text } from '@heist-mind/ui';
import { useRetireCharacter } from '@/features/characters/data/mutations';
import { useProfileNames } from '@/features/profiles/data/queries';
import { useTranslation } from '@/lib/i18n/hooks';
import { CharacterCard } from './CharacterCard';

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
}: {
  gameId: string;
  gmId: string | undefined;
  userId: string | undefined;
  characters: Character[];
}) {
  const { t } = useTranslation();
  // Resolve each character's owner (createdBy) → a player name for attribution.
  const owners = useProfileNames(characters.map(c => c.createdBy));
  const retireMut = useRetireCharacter(gameId);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const ownerName = (id: string) => owners[id] || t('components.roster.unknownPlayer');
  const canManage = (ch: Character) =>
    userId != null && (userId === gmId || userId === ch.createdBy);

  // Retire: status → retired, bank carried coin into stash (BitD), log a note. The mutation
  // invalidates the roster + log, so both refresh without an imperative reload.
  const retire = async (ch: Character) => {
    if (!userId) return;
    setBusy(ch.id);
    try {
      await retireMut.mutateAsync({
        character: ch,
        userId,
        note: t('components.roster.retiredNote'),
      });
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  const renderCard = (ch: Character) => (
    <CharacterCard
      key={ch.id}
      character={ch}
      meta={t('components.roster.meta', {
        playbook: ch.playbookType,
        xp: ch.experiencePoints,
        player: ownerName(ch.createdBy),
      })}
      actions={
        <>
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
        </>
      }
    />
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
