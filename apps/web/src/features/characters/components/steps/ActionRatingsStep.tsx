'use client';

import { useShallow } from 'zustand/react/shallow';
import { actionDotsSpent, deriveAttributes } from '@heist-mind/database';
import { ActionDots, Badge, Card, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Action-rating allocator (FitD): rate each ACTION 0..creation-cap with `ActionDots`, grouped by
 * attribute. The attribute rating is DERIVED — the count of its actions rated ≥ 1 — and shown as a
 * badge. The store clamps to the per-action creation cap and the dot budget; the badge shows spend.
 * Used when the ruleset is in action-rating mode (`characterCreation.actionRatings`).
 */
export function ActionRatingsStep() {
  const { t } = useTranslation();
  const { content, draft, setActionRating } = useCharacterCreationStore(
    useShallow(s => ({
      content: s.ruleset?.content ?? null,
      draft: s.draft,
      setActionRating: s.setActionRating,
    }))
  );

  if (!content || (content.attributes?.length ?? 0) === 0) {
    return <Text variant='muted'>{t('components.steps.actionRatings.empty')}</Text>;
  }

  const ar = content.characterCreation?.actionRatings;
  const cap = Math.min(ar?.max ?? 3, ar?.maxAtCreation ?? 2);
  const playbook = content.playbooks.find(p => p.id === draft.playbook);
  const seeded = Object.values(playbook?.skills ?? {}).reduce((n, v) => n + Math.max(0, v), 0);
  const budget = seeded + (ar?.points ?? 0);
  const spent = actionDotsSpent(content, draft);
  const over = spent > budget;
  const derived = deriveAttributes(content, draft);

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <Badge variant={over ? 'stress-critical' : 'steel'} size='lg'>
          {t('components.steps.actionRatings.actionDots', { spent, budget })}
        </Badge>
      </div>

      {content.attributes.map(attr => (
        <Card key={attr.id} variant='default'>
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <span className='font-display' style={{ fontSize: 19 }}>
              {attr.name}
            </span>
            <Badge variant='ember' size='sm'>
              {attr.name} {derived[attr.id] ?? 0}
            </Badge>
          </div>
          {attr.description && (
            <div className='text-foreground-muted' style={{ fontSize: 13, margin: '8px 0 14px' }}>
              {attr.description}
            </div>
          )}
          <div className='flex flex-col gap-2.5'>
            {(attr.skills ?? []).map(action => (
              <div key={action} className='flex items-center justify-between gap-3'>
                <span style={{ fontSize: 14 }}>{action}</span>
                <ActionDots
                  current={draft.skills?.[action] ?? 0}
                  max={cap}
                  interactive
                  variant='ember'
                  onChange={v => setActionRating(action, v)}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
