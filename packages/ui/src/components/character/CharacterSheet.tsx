// CharacterSheet.tsx
import React from 'react';
import type { CharacterSheet as CharacterSheetType, TabletopRpgGameData } from '@heist-mind/shared';

export interface CharacterSheetProps {
  character: CharacterSheetType;
  gameData: TabletopRpgGameData;
  editable?: boolean;
  onUpdate?: (character: CharacterSheetType) => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  character,
  gameData,
  editable = false,
  onUpdate,
}) => {
  return (
    <div>
      <h2>{character.name}</h2>
      {/* TODO: Render CharacterHeader, CharacterOptions, AttributeList, etc. */}
      <pre>{JSON.stringify(character, null, 2)}</pre>
    </div>
  );
};

export default CharacterSheet;
