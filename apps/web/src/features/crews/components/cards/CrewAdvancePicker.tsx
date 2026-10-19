'use client';

import { useState } from 'react';
import {
  crewAdvanceReady,
  crewStartingPickAvailable,
  crewUpgradeBoxes,
  crewVeteranGatewayFor,
  openCrewUpgrades,
  takeableCrewAbilities,
  type Crew,
  type CrewAdvanceChoice,
  type CrewRules,
} from '@heist-mind/core';
import { Button, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/** Radio value encoding for a choice (`ability:<id>`, `upgrade:<id>`, `upgrades`). */
function encode(choice: CrewAdvanceChoice): string {
  if (choice.kind === 'ability') return `ability:${choice.abilityId}`;
  return choice.upgradeId ? `upgrade:${choice.upgradeId}` : 'upgrades';
}
function decode(value: string): CrewAdvanceChoice | null {
  if (value.startsWith('ability:')) return { kind: 'ability', abilityId: value.slice(8) };
  if (value.startsWith('upgrade:')) return { kind: 'upgrades', upgradeId: value.slice(8) };
  if (value === 'upgrades') return { kind: 'upgrades' };
  return null;
}

/**
 * The GM's crew-advance picker — offers ONLY legal picks (core `takeableCrewAbilities` /
 * `openCrewUpgrades`, the same rules the repository enforces):
 * - a new crew (no special ability yet) chooses its ONE starting ability from its own list;
 * - a FULL advancement track is spent on a new special ability from the crew's list (another
 *   type's only through Veteran — taken together in one advance) OR two upgrade boxes (Mastery
 *   unlocks at four; other upgrades are tracked on paper).
 * Renders nothing otherwise (the abilities card says how to earn the next one).
 *
 * F99 — presentation only (the legal set is still exactly core's): options are grouped under
 * headings — the crew's OWN list first (the picks a GM is looking for), then other types' abilities
 * reachable through Veteran, then the upgrade-box options — and each is a ≥44px tappable row.
 * F102 — the Veteran group is a disclosure, collapsed by default.
 */
export function CrewAdvancePicker({
  crew,
  crewRules,
  busy,
  onTake,
}: {
  crew: Crew;
  crewRules?: CrewRules;
  busy: boolean;
  onTake: (choice: CrewAdvanceChoice) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [veteranOpen, setVeteranOpen] = useState(false);
  const rs = { crew: crewRules };
  const starting = crewStartingPickAvailable(rs, crew);
  const ready = crewAdvanceReady(crew.resources);
  if (!crewRules || crewRules.abilities.length === 0 || (!starting && !ready)) return null;

  const abilities = takeableCrewAbilities(rs, crew);
  const upgrades = ready ? openCrewUpgrades(rs, crew) : [];
  const choice = decode(value);
  const own = abilities.filter(a => !crewVeteranGatewayFor(rs, crew, a.id));
  const viaVeteran = abilities.filter(a => crewVeteranGatewayFor(rs, crew, a.id));
  const crewTypeName = crewRules.types.find(ct => ct.id === crew.crewType)?.name;

  // Each option is a tappable row with an unmistakable checked state in BOTH themes (brand ring +
  // tint via `has-[:checked]`, a brand-accented radio) instead of a bare 13px native radio that
  // read as disabled in dark mode. Plain spans throughout: the old Badge rendered a <div> inside
  // the <p> label text — invalid nesting React reports as a hydration error on the GM hub.
  const option = (v: string, label: string, detail?: string, suffix?: string) => (
    <label
      key={v}
      className='flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border-primary bg-background-primary px-3 py-2.5 transition-colors hover:border-brand-primary/60 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/10 has-[:checked]:ring-2 has-[:checked]:ring-brand-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary'
    >
      <input
        type='radio'
        name={`crew-advance-${crew.id}`}
        value={v}
        checked={value === v}
        onChange={() => setValue(v)}
        className='mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-primary focus-visible:outline-none'
      />
      <span className='min-w-0 text-sm'>
        <span className='font-display'>{label}</span>
        {suffix && <span className='ml-1.5 text-xs text-foreground-muted'>· {suffix}</span>}
        {detail && <span className='block text-foreground-muted'>{detail}</span>}
      </span>
    </label>
  );

  // Group headings: plain sans text-sm (the small-caps display face wrapped to 2–3 lines at 360).
  const headingClass = 'text-sm font-semibold text-foreground-secondary';
  const group = (id: string, heading: string, rows: React.ReactNode[], help?: string) =>
    rows.length > 0 && (
      <div
        role='group'
        aria-labelledby={`${id}-${crew.id}`}
        className='flex flex-col gap-2'
        data-testid={id}
      >
        <div>
          <span id={`${id}-${crew.id}`} className={`block ${headingClass}`}>
            {heading}
          </span>
          {help && <span className='block text-xs text-foreground-muted'>{help}</span>}
        </div>
        {rows}
      </div>
    );

  // F102 — the Veteran routes (13 rows on BitD) are a native disclosure, collapsed by default, so
  // the upgrades + "Take advance" aren't ~4,900px down the page at 360. <details>/<summary> is
  // keyboard-operable as is (Enter/Space toggles).
  const veteranRows = viaVeteran.map(a =>
    option(`ability:${a.id}`, a.name, a.description, t('components.crewSheet.viaVeteran'))
  );
  const veteranId = `crew-advance-veteran-${crew.id}`;
  const veteran = veteranRows.length > 0 && (
    <details
      open={veteranOpen}
      onToggle={e => setVeteranOpen(e.currentTarget.open)}
      className='group/vet rounded-md border border-border-primary'
      data-testid='crew-advance-veteran-disclosure'
    >
      <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary [&::-webkit-details-marker]:hidden'>
        <span className='min-w-0'>
          <span id={veteranId} className={`block ${headingClass}`}>
            {t('components.crewSheet.pickerGroupVeteran')}
          </span>
          <span className='block text-xs text-foreground-muted'>
            {t('components.crewSheet.pickerGroupVeteranCount', { count: veteranRows.length })}
          </span>
        </span>
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          fill='currentColor'
          className='size-5 shrink-0 text-foreground-muted transition-transform group-open/vet:rotate-180'
        >
          <path d='M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z' />
        </svg>
      </summary>
      <div
        role='group'
        aria-labelledby={veteranId}
        className='flex flex-col gap-2 px-3 pb-3'
        data-testid='crew-advance-veteran'
      >
        <span className='block text-xs text-foreground-muted'>
          {t('components.crewSheet.pickerGroupVeteranHelp')}
        </span>
        {veteranRows}
      </div>
    </details>
  );

  return (
    <fieldset
      className='rounded-md border border-border-primary p-3'
      data-testid='crew-advance-picker'
    >
      <legend className='px-1 font-display'>
        {starting
          ? t('components.crewSheet.pickerStartingTitle')
          : t('components.crewSheet.pickerAdvanceTitle')}
      </legend>
      <Stack direction='column' gap='md'>
        <Text variant='muted' size='sm'>
          {starting
            ? t('components.crewSheet.pickerStartingHelp')
            : t('components.crewSheet.pickerAdvanceHelp')}
        </Text>
        {group(
          'crew-advance-own',
          crewTypeName
            ? t('components.crewSheet.pickerGroupOwnNamed', { type: crewTypeName })
            : t('components.crewSheet.pickerGroupOwn'),
          own.map(a => option(`ability:${a.id}`, a.name, a.description))
        )}
        {veteran}
        {group('crew-advance-upgrades', t('components.crewSheet.pickerGroupUpgrades'), [
          ...upgrades.map(u =>
            option(
              encode({ kind: 'upgrades', upgradeId: u.id }),
              t('components.crewSheet.markUpgradeBoxes', {
                name: u.name,
                boxes: crewUpgradeBoxes(rs, crew, u.id),
                size: u.upgradeBoxes ?? 0,
              }),
              u.description
            )
          ),
          ...(ready
            ? [
                option(
                  'upgrades',
                  t('components.crewSheet.markOtherUpgrades'),
                  t('components.crewSheet.markOtherUpgradesHelp')
                ),
              ]
            : []),
        ])}
        <div>
          <Button
            variant='ember'
            size='sm'
            disabled={busy || !choice}
            onClick={() => choice && onTake(choice)}
          >
            {starting
              ? t('components.crewSheet.takeStartingAbility')
              : t('components.crewSheet.takeCrewAdvance')}
          </Button>
        </div>
      </Stack>
    </fieldset>
  );
}
