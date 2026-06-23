'use client';

import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Special-abilities picker (multi-select), ported from the spec design. */
export function AbilitiesStep() {
  const { abilities, selected, toggle } = useCharacterCreationStore(
    useShallow(s => ({
      abilities: s.ruleset?.content.specialAbilities ?? [],
      selected: s.draft.specialAbilities,
      toggle: s.toggleAbility,
    }))
  );

  if (abilities.length === 0) {
    return <Text variant="muted">This ruleset has no special abilities defined.</Text>;
  }

  return (
    <div className="flex flex-col gap-3">
      {abilities.map(ab => {
        const isSelected = selected.includes(ab.id);
        return (
          <Card
            key={ab.id}
            variant={isSelected ? 'success' : 'outline'}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => toggle(ab.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(ab.id);
              }
            }}
            className="cursor-pointer"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-display" style={{ fontSize: 18 }}>
                {ab.name}
              </span>
              {ab.tier != null && (
                <Badge variant="gold" size="sm">
                  Tier {ab.tier}
                </Badge>
              )}
              {isSelected && (
                <span style={{ marginLeft: 'auto' }}>
                  <Badge variant="success" size="sm">
                    Chosen
                  </Badge>
                </span>
              )}
            </div>
            <div
              className="text-foreground-secondary"
              style={{ fontSize: 13, marginTop: 9, lineHeight: 1.5 }}
            >
              {ab.description}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
