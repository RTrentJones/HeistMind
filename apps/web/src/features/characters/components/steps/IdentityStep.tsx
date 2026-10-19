'use client';

import { useShallow } from 'zustand/react/shallow';
import type { CreationOption, CreationStep } from '@heist-mind/core';
import { Input, Select, Stack, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';
import { SelectableCard, SelectableCardDescription } from './SelectableCard';

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
  // A single-field step: its listed choices as cards (+ the specifics for background/vice), or —
  // with no list (BitD heritage) — just that field as free text. A combined step: all three.
  const body = field ? (
    options.length > 0 ? (
      <Stack direction='column' gap='md' className='w-full'>
        <FieldPicker field={field} options={options} />
        {field !== 'heritage' && <DetailField field={field} />}
      </Stack>
    ) : (
      <SingleFreeTextField field={field} />
    )
  ) : null;
  return (
    <Stack direction='column' gap='lg' align='start'>
      {body ?? <FreeTextIdentity />}
      {(field === 'vice' || !body) && <ContactsPicker />}
    </Stack>
  );
}

/** The specifics that go with a listed pick: background detail, or the vice + its purveyor. */
function DetailField({ field }: { field: 'background' | 'vice' }) {
  const { t } = useTranslation();
  const key = field === 'vice' ? 'viceDetail' : 'backgroundDetail';
  const { value, setField } = useCharacterCreationStore(
    useShallow(s => ({ value: s.draft[key] ?? '', setField: s.setIdentityField }))
  );
  return (
    <div className='w-full max-w-lg'>
      <Input
        label={t(`components.steps.identity.${key}Label`)}
        placeholder={t(`components.steps.identity.${key}Placeholder`)}
        value={value}
        onChange={e => setField(key, e.target.value)}
        helpText={t(`components.steps.identity.${key}Help`)}
      />
    </div>
  );
}

/** One identity field as free text (a single-field step whose ruleset lists no choices). */
function SingleFreeTextField({ field }: { field: IdentityField }) {
  const { t } = useTranslation();
  const { value, setField } = useCharacterCreationStore(
    useShallow(s => ({ value: s.draft[field] ?? '', setField: s.setIdentityField }))
  );
  return (
    <div className='w-full max-w-lg'>
      <Input
        label={t(`components.steps.identity.${field}Label`)}
        placeholder={t(`components.steps.identity.${field}Placeholder`)}
        value={value}
        onChange={e => setField(field, e.target.value)}
        helpText={t(`components.steps.identity.${field}Help`)}
      />
    </div>
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
  const row = (rel: 'friend' | 'rival', label: string) => {
    const chosen = contacts.find(c => c.name === current(rel));
    const hintId = `contact-${rel}-hint`;
    // F102 — full width of the (max-w-lg) column: a native select otherwise sizes to its longest
    // option (the page went 438px wide at 360 and the fixed footer slid off-screen).
    // Round 6 P2-3 — the options carry the NAME only and the chosen contact's description sits
    // under the select: "name — description" in the capped trigger was cut mid-word at 360.
    return (
      <div key={rel} className='flex w-full flex-col gap-1'>
        <Select
          label={label}
          selectSize='sm'
          className='w-full'
          wrapperClassName='w-full'
          value={current(rel)}
          aria-describedby={chosen?.description ? hintId : undefined}
          onChange={e => setContact(rel, contacts.find(c => c.name === e.target.value) ?? null)}
        >
          <option value=''>{t('components.steps.identity.contactNone')}</option>
          {contacts.map(c => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
        {chosen?.description && (
          <Text id={hintId} variant='muted' size='sm' data-testid={`contact-${rel}-description`}>
            {chosen.description}
          </Text>
        )}
      </div>
    );
  };

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
  const { value, setField } = useCharacterCreationStore(
    useShallow(s => ({ value: s.draft[field] ?? '', setField: s.setIdentityField }))
  );

  return (
    <Stack direction='column' gap='sm'>
      {options.map(opt => {
        const isSelected = value === opt.name;
        return (
          <SelectableCard
            key={opt.id}
            selected={isSelected}
            onSelect={() => setField(field, opt.name)}
            title={opt.name}
          >
            {opt.description && (
              <SelectableCardDescription>{opt.description}</SelectableCardDescription>
            )}
          </SelectableCard>
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
