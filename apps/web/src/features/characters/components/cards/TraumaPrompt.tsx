'use client';

import { useState } from 'react';
import { mustRetireFromTrauma, pendingTrauma, type CharacterWithDetails } from '@heist-mind/core';
import { Alert, Button, Input, Select, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useChooseTrauma } from '@/features/characters/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Stress overflow → trauma, the sheet side (RAW, SRD Stress & Trauma): marking the last stress box
 * owes a trauma condition (`characterData.traumaPending`) — the PLAYER picks which, from the
 * ruleset's list, here. And when the trauma track is full the scoundrel must retire: surfaced as a
 * banner, never a silent clamp or an automatic status change (retire vs. taking the fall is theirs).
 */
export function TraumaPrompt({
  character,
  canEdit,
}: {
  character: CharacterWithDetails;
  canEdit: boolean;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const choose = useChooseTrauma(character.id, character.gameId);
  const [picked, setPicked] = useState('');
  const [error, setError] = useState<string | null>(null);

  const content = character.ruleset.content;
  const data = character.characterData;
  const owed = pendingTrauma(data);
  const retire = character.status === 'active' && mustRetireFromTrauma(content, data);
  if (owed === 0 && !retire) return null;

  const named = content.traumaConditions ?? [];
  const available = named.filter(c => !data.trauma.includes(c));

  const submit = () => {
    const userId = user?.id;
    const condition = picked.trim();
    if (!userId || !condition) return;
    setError(null);
    choose.mutate(
      {
        userId,
        condition,
        logNote: t('components.characterSheet.traumaChosenLog', {
          name: character.name,
          condition,
        }),
        retireNote: t('components.characterSheet.traumaRetireLogNote', { name: character.name }),
      },
      {
        onSuccess: () => setPicked(''),
        onError: e => setError(e.message ?? t('components.characterSheet.traumaFailed')),
      }
    );
  };

  return (
    <Stack direction='column' gap='sm'>
      {owed > 0 && (
        <Alert variant='warning' data-testid='trauma-pending'>
          <Stack direction='column' gap='sm'>
            <Text>
              {owed === 1
                ? t('components.characterSheet.traumaPendingOne')
                : t('components.characterSheet.traumaPendingMany', { count: owed })}
            </Text>
            {canEdit && (
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                {named.length > 0 ? (
                  <Select
                    aria-label={t('components.characterSheet.traumaPickLabel')}
                    selectSize='sm'
                    value={picked}
                    onChange={e => setPicked(e.target.value)}
                  >
                    <option value=''>{t('components.characterSheet.traumaPickPlaceholder')}</option>
                    {available.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    aria-label={t('components.characterSheet.traumaPickLabel')}
                    value={picked}
                    onChange={e => setPicked(e.target.value)}
                  />
                )}
                <Button
                  variant='ember'
                  size='sm'
                  disabled={!picked.trim() || choose.isPending}
                  onClick={submit}
                >
                  {t('components.characterSheet.traumaMark')}
                </Button>
              </Stack>
            )}
            {error && (
              <Text variant='muted' size='sm'>
                {error}
              </Text>
            )}
          </Stack>
        </Alert>
      )}
      {retire && (
        <Alert variant='destructive' data-testid='trauma-retire'>
          {t('components.characterSheet.traumaRetireBanner')}
        </Alert>
      )}
    </Stack>
  );
}
