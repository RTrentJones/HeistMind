'use client';

import { useShallow } from 'zustand/react/shallow';
import { pointBuySpent } from '@heist-mind/database';
import { Badge, Card, StressTracker, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/**
 * Attribute / action-rating allocator. One controllable `StressTracker` per
 * attribute (the DS dot allocator), driven by `ruleset.content.attributes` and
 * the optional point-buy budget. Dots beyond the affordable budget aren't rendered,
 * and the store also rejects any allocation past the budget/cap.
 */
export function AttributesStep() {
  const { content, attributes, values, pointBuy, setAttribute } = useCharacterCreationStore(
    useShallow(s => ({
      content: s.ruleset?.content ?? null,
      attributes: s.ruleset?.content.attributes ?? [],
      values: s.draft.attributes,
      pointBuy: s.ruleset?.content.characterCreation?.pointBuy ?? null,
      setAttribute: s.setAttribute,
    }))
  );

  if (attributes.length === 0 || !content) {
    return <Text variant='muted'>This ruleset has no attributes defined.</Text>;
  }

  const spent = pointBuySpent(content, values);
  const over = pointBuy ? spent > pointBuy.totalPoints : false;

  // Highest rating still affordable for one attribute, given the others (cumulative cost).
  const reachable = (attrId: string, cap: number) => {
    if (!pointBuy) return cap;
    for (let r = cap; r >= 0; r--) {
      if (pointBuySpent(content, { ...values, [attrId]: r }) <= pointBuy.totalPoints) return r;
    }
    return 0;
  };

  return (
    <div className='flex flex-col gap-4'>
      {pointBuy && (
        <div>
          <Badge variant={over ? 'stress-critical' : 'steel'} size='lg'>
            {spent} / {pointBuy.totalPoints} points spent
          </Badge>
        </div>
      )}

      {attributes.map(attr => (
        <Card key={attr.id} variant='default'>
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <span className='font-display' style={{ fontSize: 19 }}>
              {attr.name}
            </span>
            <div className='flex flex-wrap gap-1.5'>
              {attr.skills.map(sk => (
                <Badge key={sk} variant='outline' size='sm'>
                  {sk}
                </Badge>
              ))}
            </div>
          </div>
          {attr.description && (
            <div className='text-foreground-muted' style={{ fontSize: 13, margin: '8px 0 14px' }}>
              {attr.description}
            </div>
          )}
          <StressTracker
            current={values[attr.id] ?? 0}
            max={reachable(attr.id, attr.maxValue ?? 4)}
            interactive
            showNumbers
            showLabel={false}
            size='lg'
            onChange={v => setAttribute(attr.id, v)}
          />
        </Card>
      ))}
    </div>
  );
}
