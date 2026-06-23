'use client';

import { useShallow } from 'zustand/react/shallow';
import type { CreationStep } from '@heist-mind/database';
import {
  Alert,
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Text,
} from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/**
 * Generic single-select renderer for any ruleset-defined creation step we don't
 * recognize specifically. Purely data-driven from `step.options`; the selection
 * is stored in `draft.custom[step.id]`, so custom GM steps round-trip into the
 * created character without bespoke code.
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
            variant={isSelected ? 'success' : 'outline'}
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
            <CardHeader>
              <Stack direction='row' justify='between' align='center'>
                <CardTitle>{opt.name}</CardTitle>
                {isSelected && (
                  <Badge variant='success' size='sm'>
                    Chosen
                  </Badge>
                )}
              </Stack>
              {opt.description && <CardDescription>{opt.description}</CardDescription>}
            </CardHeader>
          </Card>
        );
      })}
    </Stack>
  );
}
