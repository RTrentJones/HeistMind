'use client';

import { useShallow } from 'zustand/react/shallow';
import { abilityChoiceLimit, isAbilityUnlocked } from '@heist-mind/database';
import { Badge, Card, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Special-abilities picker (multi-select), gated by the ruleset's choice limit + tier/prereqs. */
export function AbilitiesStep() {
  const { content, draft, toggle } = useCharacterCreationStore(
    useShallow(s => ({
      content: s.ruleset?.content ?? null,
      draft: s.draft,
      toggle: s.toggleAbility,
    }))
  );

  const abilities = content?.specialAbilities ?? [];
  if (!content || abilities.length === 0) {
    return <Text variant='muted'>This ruleset has no special abilities defined.</Text>;
  }

  const selected = draft.specialAbilities;
  const limit = abilityChoiceLimit(content, draft.playbook);

  return (
    <div className='flex flex-col gap-3'>
      <Text variant='muted' size='sm'>
        {selected.length} of {limit} chosen
      </Text>
      {abilities.map(ab => {
        const isSelected = selected.includes(ab.id);
        const unlocked = isAbilityUnlocked(content, draft, ab.id);
        const atLimit = !isSelected && selected.length >= limit;
        const disabled = !isSelected && (!unlocked || atLimit);
        const reason = !unlocked
          ? ab.prerequisite
            ? `Requires ${ab.prerequisite}`
            : 'Not available at creation'
          : atLimit
            ? `Limit of ${limit} reached`
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
                  Tier {ab.tier}
                </Badge>
              )}
              {reason && (
                <Badge variant='outline' size='sm'>
                  Locked
                </Badge>
              )}
              {isSelected && (
                <span style={{ marginLeft: 'auto' }}>
                  <Badge variant='success' size='sm'>
                    Chosen
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
            {reason && (
              <div className='text-foreground-muted' style={{ fontSize: 12, marginTop: 6 }}>
                {reason}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
