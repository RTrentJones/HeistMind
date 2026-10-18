'use client';

import {
  crewAdvanceReady,
  crewStartingPickAvailable,
  crewUpgradeBoxes,
  findCrewAbility,
  isCrewAbilityUnlocked,
  isCrewUpgrade,
  type Crew,
  type CrewRules,
  type UpdateCrewData,
} from '@heist-mind/core';
import { Badge, Stack, Text } from '@heist-mind/ui';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Crew special abilities + modelled upgrades, read-only for everyone: the held abilities (name +
 * rules text) and each upgrade's box progress (BitD Mastery 0–4). New abilities are TAKEN through
 * the crew-advance picker (RAW: the starting pick, then one per full advancement track) — never
 * ticked here. The GM may remove a held ability (a correction; removals never need an advance). A
 * held ability the current rules wouldn't allow (an older sheet) is kept and flagged. Renders
 * nothing when the ruleset defines no crew abilities.
 */
export function CrewAbilitiesList({
  crew,
  crewRules,
  isGm,
  busy,
  onSave,
}: {
  crew: Crew;
  crewRules?: CrewRules;
  isGm: boolean;
  busy: boolean;
  onSave: (patch: UpdateCrewData) => void;
}) {
  const { t } = useTranslation();
  const abilities = crewRules?.abilities ?? [];
  if (abilities.length === 0) return null;
  const rs = { crew: crewRules };
  const held = crew.crewAbilities.filter(id => !isCrewUpgrade(findCrewAbility(rs, id)));
  const upgrades = abilities.filter(a => isCrewUpgrade(a) && !a.retired);
  const nextHint = crewStartingPickAvailable(rs, crew)
    ? isGm
      ? t('components.crewSheet.startingPickHint')
      : t('components.crewSheet.startingPickHintPlayer')
    : crewAdvanceReady(crew.resources)
      ? null
      : t('components.crewSheet.earnNextAbilityHint');

  return (
    <div data-testid='crew-abilities'>
      <Text as='strong'>{t('components.crewSheet.crewAbilities')}</Text>
      {held.length === 0 ? (
        <Text variant='muted' size='sm'>
          {t('components.crewSheet.noneTaken')}
        </Text>
      ) : (
        <Stack direction='column' gap='xs'>
          {held.map(id => {
            const def = findCrewAbility(rs, id);
            const legacy = !!def && !isCrewAbilityUnlocked(rs, crew, id);
            return (
              <div key={id} className='flex items-start justify-between gap-2.5'>
                <Text size='sm'>
                  <span className='font-display'>{def?.name ?? id}</span>
                  {def?.description && (
                    <span className='text-foreground-muted'> — {def.description}</span>
                  )}
                  {legacy && (
                    <Badge variant='warning' size='sm' className='ml-2'>
                      {t('components.crewSheet.legacyAbility')}
                    </Badge>
                  )}
                </Text>
                {isGm && (
                  <ConfirmButton
                    disabled={busy}
                    aria-label={t('components.crewSheet.removeAbilityAria', {
                      name: def?.name ?? id,
                    })}
                    confirmLabel={t('components.crewSheet.removeAbilityConfirm')}
                    onConfirm={() =>
                      onSave({ crewAbilities: crew.crewAbilities.filter(a => a !== id) })
                    }
                  >
                    {t('components.crewSheet.removeAbility')}
                  </ConfirmButton>
                )}
              </div>
            );
          })}
        </Stack>
      )}
      {upgrades.length > 0 && (
        <Stack direction='row' gap='sm' className='mt-2 flex-wrap'>
          {upgrades.map(u => {
            const boxes = crewUpgradeBoxes(rs, crew, u.id);
            const size = u.upgradeBoxes ?? 0;
            return (
              <Badge
                key={u.id}
                variant={boxes >= size ? 'success' : 'outline'}
                data-testid={`crew-upgrade-${u.id}`}
              >
                {t('components.crewSheet.upgradeProgress', { name: u.name, boxes, size })}
              </Badge>
            );
          })}
        </Stack>
      )}
      {nextHint && (
        <Text variant='muted' size='sm' className='mt-1'>
          {nextHint}
        </Text>
      )}
    </div>
  );
}
