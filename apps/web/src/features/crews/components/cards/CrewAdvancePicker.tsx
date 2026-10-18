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
import { Badge, Button, Stack, Text } from '@heist-mind/ui';
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
  const rs = { crew: crewRules };
  const starting = crewStartingPickAvailable(rs, crew);
  const ready = crewAdvanceReady(crew.resources);
  if (!crewRules || crewRules.abilities.length === 0 || (!starting && !ready)) return null;

  const abilities = takeableCrewAbilities(rs, crew);
  const upgrades = ready ? openCrewUpgrades(rs, crew) : [];
  const choice = decode(value);

  const option = (v: string, label: React.ReactNode, detail?: string) => (
    <label key={v} className='flex cursor-pointer items-start gap-2.5'>
      <input
        type='radio'
        name={`crew-advance-${crew.id}`}
        value={v}
        checked={value === v}
        onChange={() => setValue(v)}
      />
      <Text size='sm'>
        <span className='font-display'>{label}</span>
        {detail && <span className='text-foreground-muted'> — {detail}</span>}
      </Text>
    </label>
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
      <Stack direction='column' gap='xs'>
        <Text variant='muted' size='sm'>
          {starting
            ? t('components.crewSheet.pickerStartingHelp')
            : t('components.crewSheet.pickerAdvanceHelp')}
        </Text>
        {abilities.map(a => {
          const gate = crewVeteranGatewayFor(rs, crew, a.id);
          return option(
            `ability:${a.id}`,
            <>
              {a.name}
              {gate && (
                <Badge variant='outline' size='sm' className='ml-2'>
                  {t('components.crewSheet.viaVeteran')}
                </Badge>
              )}
            </>,
            a.description
          );
        })}
        {upgrades.map(u =>
          option(
            encode({ kind: 'upgrades', upgradeId: u.id }),
            t('components.crewSheet.markUpgradeBoxes', {
              name: u.name,
              boxes: crewUpgradeBoxes(rs, crew, u.id),
              size: u.upgradeBoxes ?? 0,
            }),
            u.description
          )
        )}
        {ready &&
          option(
            'upgrades',
            t('components.crewSheet.markOtherUpgrades'),
            t('components.crewSheet.markOtherUpgradesHelp')
          )}
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
