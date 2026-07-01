'use client';

import { useState } from 'react';
import {
  loadUsed,
  effectiveLoadLimit,
  type CharacterWithDetails,
  type CharacterLoadout,
  type LoadLevel,
  type Score,
} from '@heist-mind/database';
import { Alert, Badge, Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useUpdateCharacter } from '@/features/characters/data/mutations';
import { useCreateRoll } from '@/features/rolls/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

const LOAD_LEVELS: LoadLevel[] = ['light', 'normal', 'heavy'];

/**
 * The character's **current-score loadout** (BitD: load is chosen per operation, as you go — not a
 * build or advancement choice). Edited live on the sheet: pick a load level, equip items up to the
 * limit, then Save (one campaign-log entry per save, not per toggle). When a new score has started
 * the loadout is flagged stale and can be reset for it. With no active score it's just a resettable
 * "current" loadout (à la carte). Loadout changes / clears are logged to the campaign feed.
 */
export function LoadoutCard({
  character,
  activeScore,
  onChanged,
}: {
  character: CharacterWithDetails;
  activeScore: Score | null;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const updateChar = useUpdateCharacter(character.id);
  const createRoll = useCreateRoll(character.gameId ?? '');
  const content = character.ruleset.content;
  const data = character.characterData;
  const saved: CharacterLoadout = data.loadout ?? { level: 'normal', items: [] };

  const [draft, setDraft] = useState<CharacterLoadout>({ level: saved.level, items: [...saved.items] });
  const busy = updateChar.isPending || createRoll.isPending;

  const items = content.equipment?.items ?? [];
  if (items.length === 0) return null;
  const playbook = content.playbooks.find(p => p.id === data.playbook);
  const suggestedIds = new Set(playbook?.equipment ?? []);
  const sortedGear = [
    ...items.filter(i => suggestedIds.has(i.id)),
    ...items.filter(i => !suggestedIds.has(i.id)),
  ];

  // Capacity is computed against the DRAFT (its level + items), using the existing load engine.
  const draftData = { ...data, loadout: draft };
  const used = loadUsed(content, draftData);
  const limit = effectiveLoadLimit(content, draftData, draft.level);
  const over = used > limit;
  const dirty =
    draft.level !== saved.level ||
    draft.items.length !== saved.items.length ||
    draft.items.some(id => !saved.items.includes(id));
  // A score has started since this loadout was last set → it belongs to a previous operation.
  const stale = !!activeScore && saved.items.length > 0 && saved.scoreId !== activeScore.id;

  const persist = async (next: CharacterLoadout, note: string) => {
    const userId = user?.id;
    if (!userId) return;
    const tagged: CharacterLoadout = { ...next, scoreId: activeScore?.id };
    try {
      await updateChar.mutateAsync({ userId, data: { characterData: { ...data, loadout: tagged } } });
      // Log the settled loadout change to the campaign feed (one entry per save). A standalone
      // character has no campaign feed; the loadout still saves on the sheet.
      if (character.gameId) {
        await createRoll.mutateAsync({
          userId,
          data: {
            gameId: character.gameId,
            characterId: character.id,
            kind: 'loadout',
            label: character.name,
            dice: 0,
            results: [],
            note,
          },
        });
      }
    } catch {
      // Loadout save is best-effort on the sheet (parity with the prior non-surfacing behavior);
      // the character-data mutation still invalidates the sheet so it reflects whatever landed.
    } finally {
      onChanged?.();
    }
  };

  const saveLoadout = () =>
    void persist(draft, t('components.loadout.changedNote', { level: draft.level, used, limit }));
  const resetLoadout = () => {
    setDraft({ level: draft.level, items: [] });
    void persist({ level: draft.level, items: [] }, t('components.loadout.clearedNote'));
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Heading level='h3'>{t('components.loadout.heading')}</Heading>

        {stale && (
          <Alert variant='warning' size='sm'>
            {t('components.loadout.stale')}{' '}
            <Button variant='outline' size='sm' disabled={busy} onClick={resetLoadout}>
              {t('components.loadout.resetForScore')}
            </Button>
          </Alert>
        )}

        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          {LOAD_LEVELS.map(lvl => (
            <Button
              key={lvl}
              variant={draft.level === lvl ? 'ember' : 'outline'}
              size='sm'
              className='capitalize'
              disabled={busy}
              onClick={() => setDraft(d => ({ ...d, level: lvl }))}
            >
              {t('components.loadout.levelOption', {
                level: lvl,
                limit: effectiveLoadLimit(content, draftData, lvl),
              })}
            </Button>
          ))}
          <Badge variant={over ? 'stress-critical' : 'steel'}>
            {t('components.loadout.gauge', { used, limit })}
          </Badge>
        </Stack>

        {over && <Alert variant='warning' size='sm'>{t('components.loadout.overCapacity')}</Alert>}

        <Stack direction='column' gap='xs'>
          {sortedGear.map(item => (
            <label key={item.id} className='flex cursor-pointer items-center gap-2.5'>
              <input
                type='checkbox'
                checked={draft.items.includes(item.id)}
                disabled={busy}
                onChange={() =>
                  setDraft(d => ({
                    ...d,
                    items: d.items.includes(item.id)
                      ? d.items.filter(x => x !== item.id)
                      : [...d.items, item.id],
                  }))
                }
              />
              <Text size='sm'>
                {item.name}
                <span className='text-foreground-muted'>
                  {t('components.loadout.itemLoad', { load: item.load })}
                </span>
              </Text>
              {suggestedIds.has(item.id) && (
                <Badge variant='steel' size='sm'>
                  {t('components.loadout.suggested')}
                </Badge>
              )}
            </label>
          ))}
        </Stack>

        <Stack direction='row' gap='sm' className='flex-wrap'>
          <Button variant='ember' size='sm' loading={busy} disabled={!dirty || over} onClick={saveLoadout}>
            {t('components.loadout.save')}
          </Button>
          {saved.items.length > 0 && (
            <Button variant='outline' size='sm' disabled={busy} onClick={resetLoadout}>
              {t('components.loadout.clear')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
