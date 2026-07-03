'use client';

import { useEffect, useRef, useState } from 'react';
import {
  loadUsed,
  effectiveLoadLimit,
  type CharacterWithDetails,
  type CharacterLoadout,
  type LoadLevel,
  type Score,
} from '@heist-mind/core';
import { Alert, Badge, Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useSaveLoadout } from '@/features/characters/data/mutations';
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
  canEdit,
}: {
  character: CharacterWithDetails;
  activeScore: Score | null;
  /** Owner/GM only (F42): others see the loadout read-only — no toggles, no save. */
  canEdit: boolean;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const saveLoadoutMut = useSaveLoadout(character.gameId);
  const content = character.ruleset.content;
  const data = character.characterData;
  const saved: CharacterLoadout = data.loadout ?? { level: 'normal', items: [] };

  const [draft, setDraft] = useState<CharacterLoadout>({
    level: saved.level,
    items: [...saved.items],
  });
  const busy = saveLoadoutMut.isPending;

  // Order-insensitive fingerprint for the clean/dirty three-way check below.
  const fingerprint = (l: CharacterLoadout) =>
    JSON.stringify({ level: l.level, items: [...l.items].sort() });
  // The saved state the current draft is based on: a draft matching it is CLEAN (safe to follow a
  // remote reload); anything else is the player's in-progress picks — never clobbered.
  const draftBaseRef = useRef(fingerprint(saved));
  const savedKey = fingerprint(saved);
  useEffect(() => {
    setDraft(prev => {
      const prevKey = fingerprint(prev);
      if (prevKey === savedKey) {
        draftBaseRef.current = savedKey;
        return prev;
      }
      if (prevKey === draftBaseRef.current) {
        draftBaseRef.current = savedKey;
        return { level: saved.level, items: [...saved.items] };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

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

  // Save + feed entry are one ENGINE use-case; the card supplies the loadout (tagged with the
  // active score) and the localized note. A failed save keeps the dirty draft and surfaces the
  // error below (no more silent best-effort).
  const persist = (next: CharacterLoadout, note: string) => {
    const userId = user?.id;
    if (!userId) return;
    const tagged: CharacterLoadout = { ...next, scoreId: activeScore?.id };
    saveLoadoutMut.mutate(
      { character, userId, loadout: tagged, logNote: note },
      { onSuccess: () => (draftBaseRef.current = fingerprint(tagged)) }
    );
  };

  const saveLoadout = () =>
    persist(draft, t('components.loadout.changedNote', { level: draft.level, used, limit }));
  const resetLoadout = () => {
    setDraft({ level: draft.level, items: [] });
    persist({ level: draft.level, items: [] }, t('components.loadout.clearedNote'));
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Heading level='h3'>{t('components.loadout.heading')}</Heading>

        {stale && (
          <Alert variant='warning' size='sm'>
            {t('components.loadout.stale')}{' '}
            {canEdit && (
              <Button variant='outline' size='sm' disabled={busy} onClick={resetLoadout}>
                {t('components.loadout.resetForScore')}
              </Button>
            )}
          </Alert>
        )}

        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          {LOAD_LEVELS.map(lvl => (
            <Button
              key={lvl}
              variant={draft.level === lvl ? 'ember' : 'outline'}
              size='sm'
              className='capitalize'
              disabled={busy || !canEdit}
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

        {over && (
          <Alert variant='warning' size='sm'>
            {t('components.loadout.overCapacity')}
          </Alert>
        )}

        {saveLoadoutMut.isError && (
          <Alert variant='destructive' size='sm'>
            {t('components.loadout.saveFailed', { message: saveLoadoutMut.error.message })}
          </Alert>
        )}

        <Stack direction='column' gap='xs'>
          {sortedGear.map(item => (
            <label key={item.id} className='flex cursor-pointer items-center gap-2.5'>
              <input
                type='checkbox'
                checked={draft.items.includes(item.id)}
                disabled={busy || !canEdit}
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

        {canEdit && (
          <Stack direction='row' gap='sm' className='flex-wrap'>
            <Button
              variant='ember'
              size='sm'
              loading={busy}
              disabled={!dirty || over}
              onClick={saveLoadout}
            >
              {t('components.loadout.save')}
            </Button>
            {saved.items.length > 0 && (
              <Button variant='outline' size='sm' disabled={busy} onClick={resetLoadout}>
                {t('components.loadout.clear')}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
