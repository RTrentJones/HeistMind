'use client';

import { useShallow } from 'zustand/react/shallow';
import type { CreationStep } from '@heist-mind/database';
import { Alert, Badge, Card, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/**
 * Generic single-select renderer for any ruleset-defined creation step we don't recognize
 * specifically. Purely data-driven from `step.options`; the selection is stored in
 * `draft.custom[step.id]`, so custom GM steps round-trip into the created character without
 * bespoke code. Card markup matches PlaybookStep so selectable cards look the same everywhere.
 */
export function ChoiceStep({ step }: { step: CreationStep | undefined }) {
  const { custom, setCustom } = useCharacterCreationStore(
    useShallow(s => ({ custom: s.draft.custom, setCustom: s.setCustom }))
  );

  const options = step?.options ?? [];
  if (!step || options.length === 0) {
    return <Text variant='muted'>Nothing to choose for this step.</Text>;
  }

  const selected = custom[step.id];

  return (
    <Stack direction='column' gap='sm'>
      {step.required && selected == null && (
        <Alert variant='warning' size='sm'>
          Choose an option to continue.
        </Alert>
      )}
      {options.map(opt => {
        const isSelected = selected === opt.id;
        return (
          <Card
            key={opt.id}
            variant={isSelected ? 'character' : 'outline'}
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => setCustom(step.id, opt.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCustom(step.id, opt.id);
              }
            }}
            className='cursor-pointer'
          >
            <div className='flex items-start justify-between gap-2.5' style={{ minHeight: 24 }}>
              <span className='font-display' style={{ fontSize: 20, lineHeight: 1.1 }}>
                {opt.name}
              </span>
              {isSelected && (
                <Badge variant='ember' size='sm'>
                  Selected
                </Badge>
              )}
            </div>
            {opt.description && (
              <div
                className='text-foreground-secondary'
                style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}
              >
                {opt.description}
              </div>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}
