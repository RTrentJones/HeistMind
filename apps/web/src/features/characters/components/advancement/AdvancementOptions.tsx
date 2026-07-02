'use client';

import {
  usesXpTracks,
  xpTrackFull,
  PLAYBOOK_TRACK,
  type CharacterWithDetails,
} from '@heist-mind/database';
import { Badge, Button, Card, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/** Spend XP on new special abilities (the ruleset's `ability` advancement option). */
export function AdvancementOptions({
  character,
  onBuy,
  saving,
}: {
  character: CharacterWithDetails;
  onBuy: (abilityId: string, cost: number, name: string) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const owned = character.characterData.specialAbilities;
  const option = content.advancement?.advancementOptions?.find(o => o.category === 'ability');

  if (!option) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.noAbilityAdvancements')}
      </Text>
    );
  }
  const buyable = content.specialAbilities.filter(a => !owned.includes(a.id));
  if (buyable.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.allLearned')}
      </Text>
    );
  }

  const requirementsMet = (option.requirements ?? []).every(r => owned.includes(r));
  // Track rulesets gate ability buys on a full playbook track; flat rulesets gate on pooled XP.
  const trackMode = usesXpTracks(content);
  const playbookFull = xpTrackFull(content, character.characterData, PLAYBOOK_TRACK);

  return (
    <Stack direction='column' gap='sm'>
      <Text variant='muted' size='sm'>
        {trackMode
          ? t('components.characterEditor.optionTrack', { name: option.name })
          : t('components.characterEditor.optionFlat', { name: option.name, cost: option.cost })}
      </Text>
      {buyable.map(ability => {
        const prereqKnown =
          !!ability.prerequisite &&
          content.specialAbilities.some(a => a.id === ability.prerequisite);
        const prereqMet =
          !ability.prerequisite || !prereqKnown || owned.includes(ability.prerequisite);
        const affordable = trackMode ? playbookFull : option.cost <= character.experiencePoints;
        const disabled = saving || !prereqMet || !requirementsMet || !affordable;
        const reason = !affordable
          ? trackMode
            ? t('components.characterEditor.fillTrack')
            : t('components.characterEditor.needXp', { cost: option.cost })
          : !prereqMet
            ? t('components.characterEditor.requires', { prerequisite: ability.prerequisite ?? '' })
            : !requirementsMet
              ? t('components.characterEditor.requiresAll', {
                  requirements: option.requirements?.join(', ') ?? '',
                })
              : null;
        return (
          <Card key={ability.id} variant='outline'>
            <Stack direction='row' justify='between' align='center' gap='sm'>
              <div>
                <Text as='strong'>{ability.name}</Text>
                {ability.tier != null && (
                  <Badge variant='gold' size='sm' className='ml-2'>
                    {t('components.characterEditor.tier', { tier: ability.tier })}
                  </Badge>
                )}
                <Text variant='muted' size='sm'>
                  {ability.description}
                </Text>
                {ability.rules && (
                  <details className='mt-1'>
                    <summary className='cursor-pointer text-xs text-foreground-muted'>
                      {t('components.characterEditor.rules')}
                    </summary>
                    <Text variant='muted' size='sm' className='mt-1'>
                      {ability.rules}
                    </Text>
                  </details>
                )}
                {reason && (
                  <Text variant='muted' size='sm'>
                    {reason}
                  </Text>
                )}
              </div>
              <Button
                variant='outline'
                size='sm'
                disabled={disabled}
                onClick={() => onBuy(ability.id, option.cost, ability.name)}
              >
                {trackMode
                  ? t('components.characterEditor.takeAbility')
                  : t('components.characterEditor.buyAbility', { cost: option.cost })}
              </Button>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
