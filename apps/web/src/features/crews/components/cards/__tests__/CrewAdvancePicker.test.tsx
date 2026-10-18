// Round-3 #1 — the crew sheet offers ONLY legal crew picks, on the real BitD builtin content
// (fixture provenance, F69): a Shadows crew sees its own list (+ Veteran routes), never every crew
// type's abilities, never Mastery as an ability; a full track adds the upgrade-box options.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Crew } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import '@/lib/i18n';
import { CrewAdvancePicker } from '../CrewAdvancePicker';
import { CrewAbilitiesList } from '../CrewAbilitiesList';

const crewRules = getBuiltinById('blades-in-the-dark')?.content.crew;
const crew = (abilities: string[], resources: Record<string, number> = {}) =>
  ({
    id: 'cr1',
    gameId: 'g1',
    crewType: 'shadows',
    crewAbilities: abilities,
    resources,
  }) as unknown as Crew;

describe('CrewAdvancePicker', () => {
  it('a new Shadows crew picks ONE starting ability from its own list (Veteran opens others)', async () => {
    const onTake = vi.fn();
    render(
      <CrewAdvancePicker crew={crew([])} crewRules={crewRules} busy={false} onTake={onTake} />
    );
    expect(screen.getByText("Choose the crew's starting special ability")).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Pack Rats/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Patron/ })).toBeInTheDocument();
    // Another type's ability is offered only as a Veteran route; Mastery never as an ability.
    expect(
      screen.getByRole('radio', { name: /Deadly.*via Veteran|Deadlyvia Veteran/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Mastery/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /other upgrades/ })).not.toBeInTheDocument();
    const take = screen.getByRole('button', { name: 'Take starting ability' });
    expect(take).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /Pack Rats/ }));
    await userEvent.click(take);
    expect(onTake).toHaveBeenCalledWith({ kind: 'ability', abilityId: 'crew-network' });
  });

  it('renders nothing between advances (track not full, starting pick taken)', () => {
    const { container } = render(
      <CrewAdvancePicker
        crew={crew(['crew-second-story'], { 'crew-xp': 5 })}
        crewRules={crewRules}
        busy={false}
        onTake={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('a full track offers abilities OR two upgrade boxes (Mastery 0/4, other upgrades)', async () => {
    const onTake = vi.fn();
    render(
      <CrewAdvancePicker
        crew={crew(['crew-second-story'], { 'crew-xp': 8 })}
        crewRules={crewRules}
        busy={false}
        onTake={onTake}
      />
    );
    expect(screen.queryByRole('radio', { name: /Second Story/ })).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('radio', { name: /Mark 2 upgrade boxes: Mastery \(0\/4\)/ })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Take advance' }));
    expect(onTake).toHaveBeenCalledWith({ kind: 'upgrades', upgradeId: 'crew-mastery' });
    expect(screen.getByRole('radio', { name: /other upgrades/ })).toBeInTheDocument();
  });
});

describe('CrewAbilitiesList', () => {
  it('shows held abilities read-only (no ticking), upgrade progress, and flags legacy picks', () => {
    render(
      <CrewAbilitiesList
        crew={crew(['crew-second-story', 'crew-deadly'], { 'crew-upgrade:crew-mastery': 2 })}
        crewRules={crewRules}
        isGm={false}
        busy={false}
        onSave={() => {}}
      />
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Second Story')).toBeInTheDocument();
    expect(screen.getByText("Not on this crew's list")).toBeInTheDocument();
    expect(screen.getByTestId('crew-upgrade-crew-mastery')).toHaveTextContent(
      'Mastery 2/4 upgrade boxes'
    );
  });

  it('lets the GM remove a held ability (two clicks)', async () => {
    const onSave = vi.fn();
    render(
      <CrewAbilitiesList
        crew={crew(['crew-second-story'])}
        crewRules={crewRules}
        isGm
        busy={false}
        onSave={onSave}
      />
    );
    const remove = screen.getByRole('button', { name: 'Remove crew ability Second Story' });
    await userEvent.click(remove);
    await userEvent.click(screen.getByRole('button', { name: /Remove\? Click again/ }));
    expect(onSave).toHaveBeenCalledWith({ crewAbilities: [] });
  });
});
