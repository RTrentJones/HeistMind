'use client';

import {
  abilityName,
  consumesVeteranSlot,
  isAbilityAdvanceable,
  veteranGatewayFor,
  usesXpTracks,
  xpTrackFull,
  PLAYBOOK_TRACK,
  type CharacterWithDetails,
  type CrewContext,
} from '@heist-mind/core';
import { Badge, Button, Card, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/** Spend XP on new special abilities (the ruleset's `ability` advancement option). */
export function AdvancementOptions({
  character,
  onBuy,
  saving,
  crew = null,
}: {
  character: CharacterWithDetails;
  onBuy: (abilityId: string, cost: number, name: string) => void;
  saving: boolean;
  /** The campaign's crew — its veteran grants open cross-playbook picks (null = no crew). */
  crew?: CrewContext | null;
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
  // RAW (review #1): an advance takes an ability from YOUR playbook; another playbook's ability
  // needs a free Veteran slot (your own Veteran, or a crew grant) — the same gate the repository
  // runs. Other playbooks' abilities with no slot free are hidden behind a count, not offered.
  const unowned = content.specialAbilities.filter(a => !owned.includes(a.id) && !a.retired);
  const data = character.characterData;
  const crossLocked = unowned.filter(
    a =>
      consumesVeteranSlot(content, data, a.id) && !isAbilityAdvanceable(content, data, a.id, crew)
  );
  const buyable = unowned
    .filter(a => !crossLocked.includes(a))
    // Your playbook's roster first, then any cross-playbook pick a free slot opens.
    .sort(
      (a, b) =>
        Number(consumesVeteranSlot(content, data, a.id)) -
        Number(consumesVeteranSlot(content, data, b.id))
    );
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
      {crossLocked.length > 0 && (
        <Text variant='muted' size='sm' data-testid='veteran-locked-count'>
          {t('components.characterEditor.veteranLocked', { count: crossLocked.length })}
        </Text>
      )}
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
            ? t('components.characterEditor.requires', {
                // Prerequisites are stored as ids — show the ability's NAME ("Veteran (second)").
                prerequisite: abilityName(content, ability.prerequisite ?? ''),
              })
            : !requirementsMet
              ? t('components.characterEditor.requiresAll', {
                  requirements: (option.requirements ?? [])
                    .map(r => abilityName(content, r))
                    .join(', '),
                })
              : null;
        return (
          <Card key={ability.id} variant='outline'>
            <Stack direction='row' justify='between' align='center' gap='sm'>
              <div>
                <Text as='strong'>{ability.name}</Text>
                {veteranGatewayFor(content, data, ability.id, crew) && (
                  <Badge variant='outline' size='sm' className='ml-2'>
                    {t('components.characterEditor.viaVeteran')}
                  </Badge>
                )}
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
