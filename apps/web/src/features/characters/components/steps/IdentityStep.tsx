'use client';

import { useShallow } from 'zustand/react/shallow';
import { Input, Stack } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Free-text identity details written to the character draft. */
export function IdentityStep() {
  const { heritage, background, vice, setField } = useCharacterCreationStore(
    useShallow(s => ({
      heritage: s.draft.heritage ?? '',
      background: s.draft.background ?? '',
      vice: s.draft.vice ?? '',
      setField: s.setIdentityField,
    }))
  );

  return (
    <Stack direction='column' gap='md'>
      <Input
        label='Heritage'
        placeholder='Where are you from?'
        value={heritage}
        onChange={e => setField('heritage', e.target.value)}
        helpText='Your origin and upbringing.'
      />
      <Input
        label='Background'
        placeholder='What did you do before the crew?'
        value={background}
        onChange={e => setField('background', e.target.value)}
      />
      <Input
        label='Vice'
        placeholder='What do you indulge in?'
        value={vice}
        onChange={e => setField('vice', e.target.value)}
        helpText='How you blow off stress between scores.'
      />
    </Stack>
  );
}
