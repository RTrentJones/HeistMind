'use client';

import {
  collectAbilityEffects,
  xpTrackFull,
  type CharacterWithDetails,
  type CrewContext,
} from '@heist-mind/core';
import { Button, Card, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Spend a full attribute XP track on a new action dot. Only attributes whose track has filled are
 * shown; each of that attribute's actions can be bumped by 1 (server re-validates against the cap).
 */
export function ActionDotOptions({
  character,
  crew,
  onAdvance,
  saving,
}: {
  character: CharacterWithDetails;
  crew: CrewContext | null;
  onAdvance: (action: string) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const data = character.characterData;
  // Action rating caps at the ruleset's max (BitD: 3), RAISED to the crew's effective cap when it
  // holds a Mastery-style upgrade (→ 4) — so a member of a Mastery crew can buy the 4th dot.
  const max = Math.max(
    content.characterCreation?.actionRatings?.max ?? 3,
    collectAbilityEffects(content, data, crew).actionMax
  );
  const ready = content.attributes.filter(a => xpTrackFull(content, data, a.id));

  if (ready.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.fillTrackForDot')}
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='sm'>
      {ready.map(attr => (
        <Card key={attr.id} variant='outline'>
          <Text as='strong'>{t('components.characterEditor.pickAction', { name: attr.name })}</Text>
          <Stack direction='row' gap='sm' className='flex-wrap'>
            {attr.skills.map(action => {
              const rating = data.skills?.[action] ?? 0;
              const atMax = rating >= max;
              return (
                <Button
                  key={action}
                  variant='outline'
                  size='sm'
                  disabled={saving || atMax}
                  onClick={() => onAdvance(action)}
                >
                  {action} {rating}
                  {atMax
                    ? t('components.characterEditor.maxSuffix')
                    : t('components.characterEditor.incrementSuffix')}
                </Button>
              );
            })}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
