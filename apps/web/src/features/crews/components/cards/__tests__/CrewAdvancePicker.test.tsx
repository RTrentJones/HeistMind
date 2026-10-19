// Round-3 #1 — the crew sheet offers ONLY legal crew picks, on the real BitD builtin content
// (fixture provenance, F69): a Shadows crew sees its own list (+ Veteran routes), never every crew
// type's abilities, never Mastery as an ability; a full track adds the upgrade-box options.
import { render, screen, within } from '@testing-library/react';
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
    const legend = screen.getByText("Choose the crew's starting special ability");
    // Round 6 P2-6 — plain sans like the group headings, not the wrapping small-caps face.
    expect(legend.tagName).toBe('LEGEND');
    expect(legend).toHaveClass('text-sm', 'font-semibold');
    expect(legend).not.toHaveClass('font-display');
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

  // F99 — presentation only: own list first under its own heading, then the Veteran routes, then
  // upgrades; every option is a ≥44px row; and no block element nests inside a <p> (the old Badge
  // <div> in the label <p> was a React hydration error on the GM hub).
  it('groups own abilities first, then Veteran routes, then upgrades, as tappable rows', () => {
    const { container } = render(
      <CrewAdvancePicker
        crew={crew(['crew-second-story'], { 'crew-xp': 8 })}
        crewRules={crewRules}
        busy={false}
        onTake={() => {}}
      />
    );
    const groups = within(screen.getByTestId('crew-advance-picker')).getAllByRole('group');
    // (<details> is itself an ARIA group, wrapping the Veteran group — F102 — and, inside it,
    // one per source crew type — round 6 P2-7.)
    expect(groups.map(g => g.getAttribute('data-testid'))).toEqual([
      'crew-advance-own',
      'crew-advance-veteran-disclosure',
      'crew-advance-veteran',
      'crew-advance-veteran-type-assassins',
      'crew-advance-veteran-type-bravos',
      'crew-advance-veteran-type-cult',
      'crew-advance-veteran-type-hawkers',
      'crew-advance-veteran-type-smugglers',
      'crew-advance-upgrades',
    ]);
    const own = screen.getByRole('group', { name: "From your crew's list (Shadows)" });
    expect(within(own).getByRole('radio', { name: /^Patron/ })).toBeInTheDocument();
    expect(within(own).queryByRole('radio', { name: /via Veteran/ })).not.toBeInTheDocument();
    const veteran = screen.getByRole('group', { name: /Through Veteran/ });
    expect(within(veteran).getByRole('radio', { name: /Deadly/ })).toBeInTheDocument();
    const upgrades = screen.getByRole('group', { name: /Upgrades/ });
    expect(within(upgrades).getAllByRole('radio')).toHaveLength(2);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.closest('label')).toHaveClass('min-h-11');
    }
    expect(container.querySelector('p div, p p')).toBeNull();
  });

  // F102 — 13 Veteran rows sat between the crew's own list and the upgrades (~4,900px tall at
  // 360): they're a native disclosure, collapsed by default and opened from the keyboard.
  // (Keyboard toggling is the browser's native <summary> behaviour — covered in gm-crew e2e.)
  it('collapses the Veteran routes by default; the summary opens them', async () => {
    render(
      <CrewAdvancePicker
        crew={crew(['crew-second-story'], { 'crew-xp': 8 })}
        crewRules={crewRules}
        busy={false}
        onTake={() => {}}
      />
    );
    const disclosure = screen.getByTestId('crew-advance-veteran-disclosure');
    expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure).not.toHaveAttribute('open');
    const summary = disclosure.querySelector('summary')!;
    expect(summary).toHaveTextContent(/Through Veteran.*abilities from other crew types/);
    await userEvent.click(summary);
    expect(disclosure).toHaveAttribute('open');
  });
});

// Round 6 P2-7 — opened, the Veteran routes were one 32-row list (10,281px at 360), and "Veteran"
// was ALSO a bare row on the crew's own list (the same choice twice).
describe('CrewAdvancePicker — Veteran routes (round 6 P2-7)', () => {
  it('offers Veteran only as routes, never as a bare row on the own list', () => {
    render(
      <CrewAdvancePicker crew={crew([])} crewRules={crewRules} busy={false} onTake={() => {}} />
    );
    const own = screen.getByRole('group', { name: "From your crew's list (Shadows)" });
    expect(within(own).queryByRole('radio', { name: /^Veteran/ })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio', { name: /^Veteran/ })).toHaveLength(0);
  });

  it('groups the routes by source crew type, each its own collapsed disclosure', async () => {
    const onTake = vi.fn();
    render(
      <CrewAdvancePicker crew={crew([])} crewRules={crewRules} busy={false} onTake={onTake} />
    );
    const assassins = screen.getByTestId('crew-advance-veteran-type-assassins');
    expect(assassins.tagName).toBe('DETAILS');
    expect(assassins).not.toHaveAttribute('open');
    const summary = assassins.querySelector('summary')!;
    expect(summary).toHaveTextContent(/^Assassins\s*· \d+ abilities$/);
    // Every route sits in exactly one type group, and no Shadows (own) ability is among them.
    const vet = screen.getByTestId('crew-advance-veteran');
    const typed = vet.querySelectorAll('details input[type="radio"]');
    expect(typed.length).toBe(vet.querySelectorAll('input[type="radio"]').length);
    expect(within(assassins).getByRole('radio', { name: /^Deadly/, hidden: true })).toBeTruthy();
    expect(screen.queryByTestId('crew-advance-veteran-type-shadows')).toBeNull();
    // Open the outer disclosure, then the type, then pick.
    await userEvent.click(
      screen.getByTestId('crew-advance-veteran-disclosure').querySelector('summary')!
    );
    await userEvent.click(summary);
    expect(assassins).toHaveAttribute('open');
    await userEvent.click(within(assassins).getByRole('radio', { name: /^Deadly/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Take starting ability' }));
    expect(onTake).toHaveBeenCalledWith({ kind: 'ability', abilityId: 'crew-deadly' });
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
    // F102 — the description shrinks, never the button (it was clipped to 42px at 360).
    expect(remove).toHaveClass('shrink-0');
    await userEvent.click(remove);
    await userEvent.click(screen.getByRole('button', { name: /Remove\? Click again/ }));
    expect(onSave).toHaveBeenCalledWith({ crewAbilities: [] });
  });
});
