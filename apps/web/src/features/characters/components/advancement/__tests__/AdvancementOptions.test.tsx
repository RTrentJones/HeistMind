// Round-3 #5 — a locked ability's reason names its prerequisite ("Requires Veteran (second)"),
// never the raw id ("Requires veteran-2"). Real BitD builtin content (fixture provenance, F69).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CharacterWithDetails } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import '@/lib/i18n';
import { AdvancementOptions } from '../AdvancementOptions';

const BITD = getBuiltinById('blades-in-the-dark')?.content;

describe('AdvancementOptions', () => {
  it('shows a prerequisite by its ability NAME', () => {
    const character = {
      id: 'c1',
      experiencePoints: 0,
      ruleset: { content: BITD },
      characterData: {
        playbook: 'cutter',
        attributes: {},
        skills: {},
        specialAbilities: ['cutter-battleborn', 'veteran'],
        xp: { playbook: 8, attributes: {} },
        stress: 0,
        trauma: [],
        contacts: [],
        custom: {},
      },
    } as unknown as CharacterWithDetails;
    render(<AdvancementOptions character={character} onBuy={() => {}} saving={false} />);
    expect(screen.getByText('Requires Veteran (second)')).toBeInTheDocument();
    expect(screen.queryByText(/Requires veteran-2/)).not.toBeInTheDocument();
  });
});
