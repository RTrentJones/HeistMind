'use client';

import { useState, type FormEvent } from 'react';
import {
  FACTION_STATUS_MAX,
  FACTION_STATUS_MIN,
  FACTION_TIER_MAX,
  factionStatusLabel,
} from '@heist-mind/core';
import { Button, Input, Select, Stack, Text, Textarea } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

export interface NewFactionValues {
  name: string;
  tier: number;
  status: number;
  notes?: string;
}

const TIERS = Array.from({ length: FACTION_TIER_MAX + 1 }, (_, i) => i);
const STATUSES = Array.from(
  { length: FACTION_STATUS_MAX - FACTION_STATUS_MIN + 1 },
  (_, i) => FACTION_STATUS_MAX - i
);

/** `+2 Friendly`, `0 Neutral`, `−3 War` — the SRD status scale, signed. */
const statusOption = (s: number) =>
  `${s > 0 ? `+${s}` : s < 0 ? `−${Math.abs(s)}` : '0'} ${factionStatusLabel(s)}`;

/**
 * F96 — the GM's free-text "Add a faction" form: name, tier (0–6, the app-wide FitD bound),
 * starting status on the SRD's −3…+3 scale (default Neutral), optional notes. Blades in the Dark
 * ships no suggested factions (setting IP), so this is the only way to add one there; it sits
 * alongside the suggestion picker on rulesets that do suggest. A name the campaign already has is
 * refused inline (case-insensitive) — the tracker never offers a duplicate power. The caller owns
 * the create mutation.
 */
export function NewFactionForm({
  existingNames,
  busy,
  onCreate,
}: {
  existingNames: string[];
  busy: boolean;
  /** Resolve true when the faction landed, so the form clears; false keeps the draft. */
  onCreate: (values: NewFactionValues) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [tier, setTier] = useState(0);
  const [status, setStatus] = useState(0);
  const [notes, setNotes] = useState('');

  const trimmed = name.trim();
  const duplicate =
    trimmed !== '' && existingNames.some(n => n.trim().toLowerCase() === trimmed.toLowerCase());

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmed || duplicate || busy) return;
    const ok = await onCreate({
      name: trimmed,
      tier,
      status,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    if (ok) {
      setName('');
      setTier(0);
      setStatus(0);
      setNotes('');
    }
  };

  return (
    <form
      onSubmit={e => void submit(e)}
      aria-labelledby='new-faction-heading'
      className='border-t border-border-primary pt-3'
    >
      <Stack direction='column' gap='sm'>
        <Text as='strong' id='new-faction-heading'>
          {t('components.factionsPanel.newHeading')}
        </Text>
        <Stack direction='row' gap='sm' align='end' className='flex-wrap [&>*]:min-w-0'>
          <Input
            label={t('components.factionsPanel.nameLabel')}
            placeholder={t('components.factionsPanel.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            {...(duplicate ? { error: t('components.factionsPanel.duplicateName') } : {})}
          />
          <Select
            label={t('components.factionsPanel.tierLabel')}
            value={tier}
            onChange={e => setTier(Number(e.target.value))}
          >
            {TIERS.map(n => (
              <option key={n} value={n}>
                {t('components.factionsPanel.tierOption', { tier: n })}
              </option>
            ))}
          </Select>
          <Select
            label={t('components.factionsPanel.statusLabel')}
            value={status}
            onChange={e => setStatus(Number(e.target.value))}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {statusOption(s)}
              </option>
            ))}
          </Select>
        </Stack>
        <Textarea
          label={t('components.factionsPanel.notesLabel')}
          placeholder={t('components.factionsPanel.notesPlaceholder')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
        />
        <div>
          <Button type='submit' variant='ember' disabled={busy || !trimmed || duplicate}>
            {t('components.factionsPanel.addFaction')}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
