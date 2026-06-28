'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  abilityChoiceLimit,
  isAbilityUnlocked,
  type AbilityDefinition,
} from '@heist-mind/database';
import { Badge, Button, Card, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Special-abilities picker (multi-select), gated by the ruleset's choice limit + tier/prereqs.
 * Leads with the chosen playbook's own roster (what you'd actually pick at creation); abilities
 * from other roles are collapsed behind a toggle so a large ruleset doesn't bury the relevant few.
 */
export function AbilitiesStep() {
  const { t } = useTranslation();
  const { content, draft, toggle } = useCharacterCreationStore(
    useShallow(s => ({
      content: s.ruleset?.content ?? null,
      draft: s.draft,
      toggle: s.toggleAbility,
    }))
  );
  const [showOthers, setShowOthers] = useState(false);

  const abilities = content?.specialAbilities ?? [];
  if (!content || abilities.length === 0) {
    return <Text variant='muted'>{t('components.steps.abilities.empty')}</Text>;
  }

  const selected = draft.specialAbilities;
  const limit = abilityChoiceLimit(content, draft.playbook);

  const playbook = content.playbooks.find(p => p.id === draft.playbook);
  const rosterIds = new Set(playbook?.specialAbilities ?? []);
  const roster = abilities.filter(a => rosterIds.has(a.id));
  const others = abilities.filter(a => !rosterIds.has(a.id));

  const renderCard = (ab: AbilityDefinition) => {
    const isSelected = selected.includes(ab.id);
    const unlocked = isAbilityUnlocked(content, draft, ab.id);
    // A single-slot pick (limit 1) SWAPS on click, so other unlocked abilities stay selectable — only
    // a true multi-select cap (limit > 1) disables the rest once full.
    const atLimit = !isSelected && limit !== 1 && selected.length >= limit;
    const disabled = !isSelected && (!unlocked || atLimit);
    const reason = !unlocked
      ? ab.prerequisite
        ? t('components.steps.abilities.requires', { prerequisite: ab.prerequisite })
        : t('components.steps.abilities.notAvailable')
      : atLimit
        ? t('components.steps.abilities.limitReached', { limit })
        : null;

    return (
      <Card
        key={ab.id}
        variant={isSelected ? 'success' : 'outline'}
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-pressed={isSelected}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) toggle(ab.id);
        }}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggle(ab.id);
          }
        }}
        className={disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
      >
        <div className='flex flex-wrap items-center gap-2.5'>
          <span className='font-display' style={{ fontSize: 18 }}>
            {ab.name}
          </span>
          {ab.tier != null && (
            <Badge variant='gold' size='sm'>
              {t('components.steps.abilities.tier', { tier: ab.tier })}
            </Badge>
          )}
          {reason && (
            <Badge variant='outline' size='sm'>
              {t('components.steps.abilities.locked')}
            </Badge>
          )}
          {isSelected && (
            <span style={{ marginLeft: 'auto' }}>
              <Badge variant='success' size='sm'>
                {t('components.steps.abilities.chosen')}
              </Badge>
            </span>
          )}
        </div>
        <div
          className='text-foreground-secondary'
          style={{ fontSize: 13, marginTop: 9, lineHeight: 1.5 }}
        >
          {ab.description}
        </div>
        {ab.rules && (
          <div
            className='text-foreground-muted'
            style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}
          >
            {ab.rules}
          </div>
        )}
        {reason && (
          <div className='text-foreground-muted' style={{ fontSize: 12, marginTop: 6 }}>
            {reason}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className='flex flex-col gap-3'>
      <Text variant='muted' size='sm'>
        {t('components.steps.abilities.countChosen', { count: selected.length, limit })}
        {playbook
          ? t('components.steps.abilities.playbookAbilities', { playbook: playbook.name })
          : ''}
      </Text>

      {roster.length > 0 ? (
        roster.map(renderCard)
      ) : (
        <Text variant='muted' size='sm'>
          {t('components.steps.abilities.chooseRoleFirst')}
        </Text>
      )}

      {others.length > 0 && (
        <>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowOthers(v => !v)}
            className='self-start'
          >
            {showOthers
              ? t('components.steps.abilities.hideMore')
              : t('components.steps.abilities.showMore', { count: others.length })}
          </Button>
          {showOthers && (
            <Text variant='muted' size='sm'>
              {t('components.steps.abilities.otherPlaybooks')}
            </Text>
          )}
          {showOthers && others.map(renderCard)}
        </>
      )}
    </div>
  );
}
