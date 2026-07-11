'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Alert, Badge, Card, Grid, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

/** Playbook picker — Card grid driven by `ruleset.content.playbooks`. */
export function PlaybookStep() {
  const { t } = useTranslation();
  const { playbooks, abilities, selected, setPlaybook } = useCharacterCreationStore(
    useShallow(s => ({
      playbooks: s.ruleset?.content.playbooks ?? [],
      abilities: s.ruleset?.content.specialAbilities ?? [],
      selected: s.draft.playbook,
      setPlaybook: s.setPlaybook,
    }))
  );
  // F27 — switching AWAY from a chosen playbook resets dots + abilities, so it takes two clicks:
  // the first arms the warning (shown below), the second commits. Picking the first playbook (or
  // re-clicking the current one) never warns.
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  if (playbooks.length === 0) {
    return <Text variant='muted'>{t('components.steps.playbook.empty')}</Text>;
  }

  const abilityName = (id: string) => abilities.find(a => a.id === id)?.name ?? id;

  const pick = (id: string) => {
    if (selected && selected !== id && pendingSwitch !== id) {
      setPendingSwitch(id);
      return;
    }
    setPendingSwitch(null);
    setPlaybook(id);
  };

  return (
    <div className='flex flex-col gap-3'>
      {pendingSwitch && (
        <Alert variant='warning' size='sm'>
          {t('components.steps.playbook.switchWarning', {
            playbook: playbooks.find(p => p.id === pendingSwitch)?.name ?? pendingSwitch,
          })}
        </Alert>
      )}
      <Grid cols={3} gap='md'>
        {playbooks.map(pb => {
          const isSelected = selected === pb.id;
          return (
            <Card
              key={pb.id}
              variant={isSelected ? 'character' : 'outline'}
              role='button'
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => pick(pb.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(pb.id);
                }
              }}
              className='cursor-pointer transition-transform duration-150 hover:-translate-y-[3px]'
            >
              <div className='flex items-start justify-between gap-2.5' style={{ minHeight: 24 }}>
                <span className='font-display' style={{ fontSize: 20, lineHeight: 1.1 }}>
                  {pb.name}
                </span>
                {isSelected && (
                  <Badge variant='ember' size='sm'>
                    {t('components.steps.common.selected')}
                  </Badge>
                )}
              </div>
              <div
                className='text-foreground-secondary'
                style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}
              >
                {pb.description}
              </div>
              {/* Signature kit — the playbook's seeded action dots and its starting ability, so the
                choice is informed (a BitD sheet shows both up front). */}
              {(() => {
                const seeded = Object.entries(pb.skills ?? {}).filter(([, v]) => (v ?? 0) > 0);
                return seeded.length > 0 ? (
                  <div className='mt-2.5 flex flex-wrap gap-1.5'>
                    {seeded.map(([action, v]) => (
                      <Badge key={action} variant='steel' size='sm'>
                        {action} {v}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}
              {(pb.startingAbilities?.length ?? 0) > 0 && (
                <div className='text-foreground-muted' style={{ fontSize: 12, marginTop: 8 }}>
                  {t('components.steps.playbook.startsWith', {
                    abilities: pb.startingAbilities.map(abilityName).join(', '),
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </Grid>
    </div>
  );
}
