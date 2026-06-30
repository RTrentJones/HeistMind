'use client';

import { useState } from 'react';
import { Button, Input, Select, Stack } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCreateRoll } from '@/features/rolls/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Record a result that was settled elsewhere — in person or on Discord (R-E3). Writes a `note` event
 * to the campaign log (auto-tagged with the active score), so the between-session record is complete
 * regardless of where play actually happened.
 */
export function AddResultForm({
  gameId,
  characters,
  onAdded,
}: {
  gameId: string;
  characters: { id: string; name: string }[];
  onAdded?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const createRoll = useCreateRoll(gameId);
  const [text, setText] = useState('');
  const [characterId, setCharacterId] = useState('');

  const add = () => {
    const userId = user?.id;
    if (!userId || !text.trim()) return;
    createRoll.mutate(
      {
        userId,
        data: {
          gameId,
          characterId: characterId || undefined,
          kind: 'note',
          label: t('components.addResult.label'),
          dice: 0,
          results: [],
          note: text.trim(),
        },
      },
      {
        onSuccess: () => {
          setText('');
          onAdded?.();
        },
      }
    );
  };

  return (
    <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
      {characters.length > 0 && (
        <Select
          label={t('components.addResult.character')}
          value={characterId}
          onChange={e => setCharacterId(e.target.value)}
        >
          <option value=''>{t('components.addResult.noCharacter')}</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}
      <Input
        label={t('components.addResult.resultLabel')}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('components.addResult.placeholder')}
      />
      <Button
        variant='outline'
        size='sm'
        loading={createRoll.isPending}
        disabled={!text.trim()}
        onClick={add}
      >
        {t('components.addResult.add')}
      </Button>
    </Stack>
  );
}
