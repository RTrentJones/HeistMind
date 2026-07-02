'use client';

import type { CharacterData, ContactDefinition } from '@heist-mind/core';
import { Badge, Card, Heading, Input, Select, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The gear-and-coin concept surface (coin, stash, friend/rival contacts) — ONE implementation for
 * both modes. Without `edit`, it's the sheet's read view (badges; renders nothing when there's
 * nothing to show). With `edit`, it's the editor's form section (coin/stash inputs + contact picks
 * from the playbook); the editor supplies `onPatch` into its validated draft and owns the save.
 */
export function GearCard({
  data,
  edit,
}: {
  data: CharacterData;
  edit?: {
    playbookContacts: ContactDefinition[];
    onPatch: (patch: Partial<CharacterData>) => void;
  };
}) {
  const { t } = useTranslation();

  if (edit) {
    const { playbookContacts, onPatch } = edit;
    const contactName = (rel: 'friend' | 'rival') =>
      data.contacts.find(c => c.relationship === rel)?.name ?? '';
    const setContact = (rel: 'friend' | 'rival', name: string) => {
      const others = data.contacts.filter(c => c.relationship !== rel);
      if (!name) {
        onPatch({ contacts: others });
        return;
      }
      const def = playbookContacts.find(c => c.name === name);
      onPatch({
        contacts: [...others, { name, description: def?.description ?? '', relationship: rel }],
      });
    };
    return (
      <>
        <Heading level='h3'>{t('components.characterEditor.coin')}</Heading>
        <Stack direction='row' gap='sm' align='end' className='max-w-md'>
          <Input
            label={t('components.characterEditor.coinLabel')}
            type='number'
            value={String(data.coins ?? 0)}
            onChange={e => onPatch({ coins: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
          <Input
            label={t('components.characterEditor.stash')}
            type='number'
            value={String(data.stash ?? 0)}
            onChange={e => onPatch({ stash: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
        </Stack>

        {playbookContacts.length > 0 && (
          <>
            <Heading level='h3'>{t('components.characterEditor.friendsRivals')}</Heading>
            <Stack direction='row' gap='md' align='end' className='flex-wrap'>
              <Select
                label={t('components.characterEditor.closeFriend')}
                value={contactName('friend')}
                onChange={e => setContact('friend', e.target.value)}
              >
                <option value=''>—</option>
                {playbookContacts.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select
                label={t('components.characterEditor.rival')}
                value={contactName('rival')}
                onChange={e => setContact('rival', e.target.value)}
              >
                <option value=''>—</option>
                {playbookContacts.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Stack>
          </>
        )}
      </>
    );
  }

  const friend = data.contacts?.find(c => c.relationship === 'friend')?.name;
  const rival = data.contacts?.find(c => c.relationship === 'rival')?.name;
  const hasGear = (data.coins ?? 0) > 0 || (data.stash ?? 0) > 0 || friend || rival;
  if (!hasGear) return null;
  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Heading level='h3'>{t('components.characterSheet.gearAndCoin')}</Heading>
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          <Badge variant='gold'>
            {t('components.characterSheet.coin', { coins: data.coins ?? 0 })}
          </Badge>
          {(data.stash ?? 0) > 0 && (
            <Badge variant='gold'>
              {t('components.characterSheet.stash', { stash: data.stash ?? 0 })}
            </Badge>
          )}
        </Stack>
        {(friend || rival) && (
          <div>
            <Text as='strong'>{t('components.characterSheet.friendsRivals')}</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {friend && (
                <Badge variant='success'>
                  {t('components.characterSheet.friend', { name: friend })}
                </Badge>
              )}
              {rival && (
                <Badge variant='stress-critical'>
                  {t('components.characterSheet.rival', { name: rival })}
                </Badge>
              )}
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}
