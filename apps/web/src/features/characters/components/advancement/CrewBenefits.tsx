'use client';

import {
  collectAbilityEffects,
  type CharacterData,
  type CrewContext,
  type RulesetContent,
} from '@heist-mind/core';
import { Alert, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Surface the campaign crew's benefits so they're discoverable rather than silently changing the
 * caps. Mastery (the only crew effect that's actionable in the editor) lets a member raise an action
 * to 4; a veteran upgrade opens cross-playbook ability picks. Renders nothing when the crew grants
 * neither — keeping the panel honest about what's actually in effect.
 */
export function CrewBenefits({
  content,
  data,
  crew,
}: {
  content: RulesetContent;
  data: CharacterData;
  crew: CrewContext | null;
}) {
  const { t } = useTranslation();
  const effects = collectAbilityEffects(content, data, crew);
  const baseMax = content.characterCreation?.actionRatings?.max ?? 3;
  const masteryMax = Math.max(baseMax, effects.actionMax);
  const hasMastery = masteryMax > baseMax;
  const hasVeteran = effects.veteran > 0;
  if (!hasMastery && !hasVeteran) return null;
  return (
    <Alert variant='info' size='sm'>
      <Stack direction='column' gap='xs'>
        <Text as='strong' size='sm'>
          {t('components.characterEditor.crewBenefitsTitle')}
        </Text>
        {hasMastery && (
          <Text size='sm'>{t('components.characterEditor.crewMastery', { max: masteryMax })}</Text>
        )}
        {hasVeteran && <Text size='sm'>{t('components.characterEditor.crewVeteran')}</Text>}
      </Stack>
    </Alert>
  );
}
