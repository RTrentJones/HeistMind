'use client';

import { useShallow } from 'zustand/react/shallow';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/**
 * Attribute / action-rating allocator. One controllable `StressTracker` per
 * attribute (the DS's dot-allocator interaction), driven by
 * `ruleset.content.attributes` and the optional point-buy budget.
 */
export function AttributesStep() {
  const { attributes, values, pointBuy, setAttribute } = useCharacterCreationStore(
    useShallow(s => ({
      attributes: s.ruleset?.content.attributes ?? [],
      values: s.draft.attributes,
      pointBuy: s.ruleset?.content.characterCreation?.pointBuy ?? null,
      setAttribute: s.setAttribute,
    }))
  );

  if (attributes.length === 0) {
    return <Text variant='muted'>This ruleset has no attributes defined.</Text>;
  }

  const spent = Object.values(values).reduce((a, b) => a + b, 0);
  const over = pointBuy ? spent > pointBuy.totalPoints : false;

  return (
    <Stack direction='column' gap='md'>
      {pointBuy && (
        <Badge variant={over ? 'stress-critical' : 'steel'}>
          {spent} / {pointBuy.totalPoints} points spent
        </Badge>
      )}

      {attributes.map(attr => (
        <Card key={attr.id} variant='default'>
          <CardHeader>
            <Stack direction='row' justify='between' align='center'>
              <CardTitle>{attr.name}</CardTitle>
              <Stack direction='row' gap='xs' className='flex-wrap'>
                {attr.skills.map(sk => (
                  <Badge key={sk} variant='outline' size='sm'>
                    {sk}
                  </Badge>
                ))}
              </Stack>
            </Stack>
          </CardHeader>
          <CardContent>
            {attr.description && (
              <Text variant='muted' size='sm'>
                {attr.description}
              </Text>
            )}
            <StressTracker
              current={values[attr.id] ?? 0}
              max={attr.maxValue ?? 4}
              interactive
              showNumbers
              onChange={v => setAttribute(attr.id, v)}
            />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
