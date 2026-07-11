'use client';

import { useShallow } from 'zustand/react/shallow';
import type { CreationOption, CreationStep } from '@heist-mind/core';
import { Badge, Card, Input, Select, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

const IDENTITY_FIELDS = { heritage: 'heritage', background: 'background', vice: 'vice' } as const;
type IdentityField = (typeof IDENTITY_FIELDS)[keyof typeof IDENTITY_FIELDS];

/**
 * Identity step. Two modes, chosen from the ruleset's step:
 *  - When the step is a single identity field (heritage/background/vice) WITH options, render those
 *    options as selectable cards (the value is the option name, so it reads well on the sheet).
 *  - Otherwise (a generic combined "identity" step, or no options), fall back to free-text inputs.
 * The playbook's close friend / rival picks (F12 — BitD identity) ride the LAST identity field
 * (vice) so per-field rulesets collect them exactly once; the combined fallback carries them too.
 */
export function IdentityStep({ step }: { step?: CreationStep }) {
  const field = step ? IDENTITY_FIELDS[step.id as keyof typeof IDENTITY_FIELDS] : undefined;
  const options = step?.options ?? [];
  const body = field && options.length > 0 ? <FieldPicker field={field} options={options} /> : null;
  return (
    <Stack direction='column' gap='lg' align='start'>
      {body ?? <FreeTextIdentity />}
      {(field === 'vice' || !body) && <ContactsPicker />}
    </Stack>
  );
}

/** Close friend / rival from the playbook's contact list (F12). Hidden when the playbook has none. */
function ContactsPicker() {
  const { t } = useTranslation();
  const { contacts, picked, setContact } = useCharacterCreationStore(
    useShallow(s => ({
      contacts: s.ruleset?.content.playbooks.find(p => p.id === s.draft.playbook)?.contacts ?? [],
      picked: s.draft.contacts,
      setContact: s.setContact,
    }))
  );
  if (contacts.length === 0) return null;

  const current = (rel: string) => picked.find(c => c.relationship === rel)?.name ?? '';
  const row = (rel: 'friend' | 'rival', label: string) => (
    <Select
      label={label}
      selectSize='sm'
      value={current(rel)}
      onChange={e => setContact(rel, contacts.find(c => c.name === e.target.value) ?? null)}
    >
      <option value=''>{t('components.steps.identity.contactNone')}</option>
      {contacts.map(c => (
        <option key={c.name} value={c.name}>
          {c.name}
          {c.description ? ` — ${c.description}` : ''}
        </option>
      ))}
    </Select>
  );

  return (
    <Stack direction='column' gap='sm' align='start' className='w-full max-w-lg'>
      <Text as='strong'>{t('components.steps.identity.contactsHeading')}</Text>
      <Text variant='muted' size='sm'>
        {t('components.steps.identity.contactsHelp')}
      </Text>
      {row('friend', t('components.steps.identity.friendLabel'))}
      {row('rival', t('components.steps.identity.rivalLabel'))}
    </Stack>
  );
}

/** Card picker for one identity field, driven by the step's options. */
function FieldPicker({ field, options }: { field: IdentityField; options: CreationOption[] }) {
  const { t } = useTranslation();
  const { value, setField } = useCharacterCreationStore(
    useShallow(s => ({ value: s.draft[field] ?? '', setField: s.setIdentityField }))
  );

  return (
    <Stack direction='column' gap='sm'>
      {options.map(opt => {
        const isSelected = value === opt.name;
        return (
          <Card
            key={opt.id}
            variant={isSelected ? 'character' : 'outline'}
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => setField(field, opt.name)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setField(field, opt.name);
              }
            }}
            className='cursor-pointer'
          >
            <div className='flex items-start justify-between gap-2.5' style={{ minHeight: 24 }}>
              <span className='font-display' style={{ fontSize: 20, lineHeight: 1.1 }}>
                {opt.name}
              </span>
              {isSelected && (
                <Badge variant='ember' size='sm'>
                  {t('components.steps.common.selected')}
                </Badge>
              )}
            </div>
            {opt.description && (
              <div
                className='text-foreground-secondary'
                style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}
              >
                {opt.description}
              </div>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

/** Free-text identity details (fallback for rulesets without per-field options). */
function FreeTextIdentity() {
  const { t } = useTranslation();
  const { heritage, background, vice, setField } = useCharacterCreationStore(
    useShallow(s => ({
      heritage: s.draft.heritage ?? '',
      background: s.draft.background ?? '',
      vice: s.draft.vice ?? '',
      setField: s.setIdentityField,
    }))
  );

  return (
    <div className='flex w-full max-w-lg flex-col gap-[18px]'>
      <Input
        label={t('components.steps.identity.heritageLabel')}
        placeholder={t('components.steps.identity.heritagePlaceholder')}
        value={heritage}
        onChange={e => setField('heritage', e.target.value)}
        helpText={t('components.steps.identity.heritageHelp')}
      />
      <Input
        label={t('components.steps.identity.backgroundLabel')}
        placeholder={t('components.steps.identity.backgroundPlaceholder')}
        value={background}
        onChange={e => setField('background', e.target.value)}
        helpText={t('components.steps.identity.backgroundHelp')}
      />
      <Input
        label={t('components.steps.identity.viceLabel')}
        placeholder={t('components.steps.identity.vicePlaceholder')}
        value={vice}
        onChange={e => setField('vice', e.target.value)}
        helpText={t('components.steps.identity.viceHelp')}
      />
    </div>
  );
}
