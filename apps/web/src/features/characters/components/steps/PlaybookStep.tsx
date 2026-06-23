'use client';

import { useShallow } from 'zustand/react/shallow';
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Grid,
  Stack,
  Text,
} from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Playbook picker — a Card grid driven by `ruleset.content.playbooks`. */
export function PlaybookStep() {
  const { playbooks, selected, setPlaybook } = useCharacterCreationStore(
    useShallow(s => ({
      playbooks: s.ruleset?.content.playbooks ?? [],
      selected: s.draft.playbook,
      setPlaybook: s.setPlaybook,
    }))
  );

  if (playbooks.length === 0) {
    return <Text variant='muted'>This ruleset has no playbooks defined.</Text>;
  }

  return (
    <Grid cols={3} gap='md'>
      {playbooks.map(pb => {
        const isSelected = selected === pb.id;
        return (
          <Card
            key={pb.id}
            variant={isSelected ? 'character' : 'outline'}
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => setPlaybook(pb.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPlaybook(pb.id);
              }
            }}
            className='cursor-pointer transition-transform hover:-translate-y-0.5'
          >
            <CardHeader>
              <Stack direction='row' justify='between' align='center'>
                <CardTitle variant={isSelected ? 'ember' : 'default'}>{pb.name}</CardTitle>
                {isSelected && <Badge variant='ember'>Selected</Badge>}
              </Stack>
              <CardDescription>{pb.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </Grid>
  );
}
