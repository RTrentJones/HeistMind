'use client';

import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, CardDescription, CardHeader, CardTitle, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Special-abilities picker (multi-select) driven by `ruleset.content.specialAbilities`. */
export function AbilitiesStep() {
  const { abilities, selected, toggle } = useCharacterCreationStore(
    useShallow(s => ({
      abilities: s.ruleset?.content.specialAbilities ?? [],
      selected: s.draft.specialAbilities,
      toggle: s.toggleAbility,
    }))
  );

  if (abilities.length === 0) {
    return <Text variant='muted'>This ruleset has no special abilities defined.</Text>;
  }

  return (
    <Stack direction='column' gap='sm'>
      {abilities.map(ab => {
        const isSelected = selected.includes(ab.id);
        return (
          <Card
            key={ab.id}
            variant={isSelected ? 'success' : 'outline'}
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => toggle(ab.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(ab.id);
              }
            }}
            className='cursor-pointer'
          >
            <CardHeader>
              <Stack direction='row' justify='between' align='center'>
                <CardTitle>{ab.name}</CardTitle>
                <Stack direction='row' gap='xs'>
                  {ab.tier != null && (
                    <Badge variant='gold' size='sm'>
                      Tier {ab.tier}
                    </Badge>
                  )}
                  {isSelected && (
                    <Badge variant='success' size='sm'>
                      Chosen
                    </Badge>
                  )}
                </Stack>
              </Stack>
              <CardDescription>{ab.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </Stack>
  );
}
