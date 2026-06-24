'use client';

import { useShallow } from 'zustand/react/shallow';
import { Input } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';

/** Free-text identity details, ported from the spec design. */
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
    <div className='flex flex-col gap-[18px]' style={{ maxWidth: 480 }}>
      <Input
        label='Heritage'
        placeholder='e.g. where they were born or raised'
        value={heritage}
        onChange={e => setField('heritage', e.target.value)}
        helpText='Where they come from and how they were raised.'
      />
      <Input
        label='Background'
        placeholder='e.g. the trade or life they came from'
        value={background}
        onChange={e => setField('background', e.target.value)}
        helpText='The life they led before the crew found them.'
      />
      <Input
        label='Vice'
        placeholder='e.g. how they unwind between jobs'
        value={vice}
        onChange={e => setField('vice', e.target.value)}
        helpText='How they blow off stress when the score is done.'
      />
    </div>
  );
}
