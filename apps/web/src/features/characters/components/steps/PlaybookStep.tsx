'use client';

import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, Grid, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Playbook picker — Card grid driven by `ruleset.content.playbooks`. */
export function PlaybookStep() {
  const { playbooks, selected, setPlaybook } = useCharacterCreationStore(
    useShallow(s => ({
      playbooks: s.ruleset?.content.playbooks ?? [],
      selected: s.draft.playbook,
      setPlaybook: s.setPlaybook,
    }))
  );

  if (playbooks.length === 0) {
    return <Text variant="muted">This ruleset has no playbooks defined.</Text>;
  }

  return (
    <Grid cols={3} gap="md">
      {playbooks.map(pb => {
        const isSelected = selected === pb.id;
        return (
          <Card
            key={pb.id}
            variant={isSelected ? 'character' : 'outline'}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => setPlaybook(pb.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPlaybook(pb.id);
              }
            }}
            className="cursor-pointer transition-transform duration-150 hover:-translate-y-[3px]"
          >
            <div className="flex items-start justify-between gap-2.5" style={{ minHeight: 24 }}>
              <span className="font-display" style={{ fontSize: 20, lineHeight: 1.1 }}>
                {pb.name}
              </span>
              {isSelected && (
                <Badge variant="ember" size="sm">
                  Selected
                </Badge>
              )}
            </div>
            <div
              className="text-foreground-secondary"
              style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}
            >
              {pb.description}
            </div>
          </Card>
        );
      })}
    </Grid>
  );
}
