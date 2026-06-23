'use client';

import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, CardContent, CardHeader, Heading, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Read-only character-sheet summary before submitting. */
export function ReviewStep() {
  const { name, draft, ruleset } = useCharacterCreationStore(
    useShallow(s => ({ name: s.name, draft: s.draft, ruleset: s.ruleset }))
  );

  const playbook = ruleset?.content.playbooks.find(p => p.id === draft.playbook);
  const attrDefs = ruleset?.content.attributes ?? [];
  const abilityName = (id: string) =>
    ruleset?.content.specialAbilities.find(a => a.id === id)?.name ?? id;

  return (
    <Card variant='character'>
      <CardHeader>
        <Heading level='h3' variant='gradient'>
          {name || 'Unnamed character'}
        </Heading>
        <Text variant='muted'>{playbook?.name ?? 'No playbook selected'}</Text>
      </CardHeader>
      <CardContent>
        <Stack direction='column' gap='md'>
          <div>
            <Text as='strong'>Attributes</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {attrDefs.map(a => (
                <Badge key={a.id} variant='steel'>
                  {a.name} {draft.attributes[a.id] ?? 0}
                </Badge>
              ))}
            </Stack>
          </div>

          <div>
            <Text as='strong'>Special Abilities</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {draft.specialAbilities.length > 0 ? (
                draft.specialAbilities.map(id => (
                  <Badge key={id} variant='success'>
                    {abilityName(id)}
                  </Badge>
                ))
              ) : (
                <Text variant='muted' size='sm'>
                  None selected
                </Text>
              )}
            </Stack>
          </div>

          {(draft.heritage || draft.background || draft.vice) && (
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {draft.heritage && <Badge variant='outline'>Heritage: {draft.heritage}</Badge>}
              {draft.background && <Badge variant='outline'>Background: {draft.background}</Badge>}
              {draft.vice && <Badge variant='outline'>Vice: {draft.vice}</Badge>}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
