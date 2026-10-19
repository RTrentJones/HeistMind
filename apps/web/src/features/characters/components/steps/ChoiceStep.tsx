'use client';

import { useShallow } from 'zustand/react/shallow';
import type { CreationStep } from '@heist-mind/core';
import { Alert, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';
import { SelectableCard, SelectableCardDescription } from './SelectableCard';

/**
 * Generic single-select renderer for any ruleset-defined creation step we don't recognize
 * specifically. Purely data-driven from `step.options`; the selection is stored in
 * `draft.custom[step.id]`, so custom GM steps round-trip into the created character without
 * bespoke code. Renders the shared SelectableCard so selectable cards look the same everywhere.
 */
export function ChoiceStep({ step }: { step: CreationStep | undefined }) {
  const { t } = useTranslation();
  const { custom, setCustom } = useCharacterCreationStore(
    useShallow(s => ({ custom: s.draft.custom, setCustom: s.setCustom }))
  );

  const options = step?.options ?? [];
  if (!step || options.length === 0) {
    return <Text variant='muted'>{t('components.steps.choice.empty')}</Text>;
  }

  const selected = custom[step.id];

  return (
    <Stack direction='column' gap='sm'>
      {step.required && selected == null && (
        <Alert variant='warning' size='sm'>
          {t('components.steps.choice.chooseToContinue')}
        </Alert>
      )}
      {options.map(opt => {
        const isSelected = selected === opt.id;
        return (
          <SelectableCard
            key={opt.id}
            selected={isSelected}
            onSelect={() => setCustom(step.id, opt.id)}
            title={opt.name}
          >
            {opt.description && (
              <SelectableCardDescription>{opt.description}</SelectableCardDescription>
            )}
          </SelectableCard>
        );
      })}
    </Stack>
  );
}
