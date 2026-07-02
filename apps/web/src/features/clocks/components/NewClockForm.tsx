'use client';

import { useState } from 'react';
import { CLOCK_SEGMENTS, type ClockSegments } from '@heist-mind/database';
import { Button, Input, Select, Stack } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

const DEFAULT_SEGMENTS: ClockSegments = 4;

/**
 * The name + segments + submit row for creating a clock (GM-only surfaces). Shared by the clocks
 * panel and factions' project clocks; the caller owns the actual create mutation.
 */
export function NewClockForm({
  label,
  placeholder,
  cta,
  ctaAriaLabel,
  ctaVariant = 'ember',
  busy,
  onCreate,
}: {
  label: string;
  placeholder: string;
  cta: string;
  ctaAriaLabel?: string;
  ctaVariant?: 'ember' | 'outline';
  busy: boolean;
  onCreate: (name: string, segments: ClockSegments) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [segments, setSegments] = useState<ClockSegments>(DEFAULT_SEGMENTS);

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), segments);
    setName('');
    setSegments(DEFAULT_SEGMENTS);
  };

  return (
    <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
      <Input
        label={label}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={placeholder}
      />
      <Select
        label={t('components.clocksPanel.segments')}
        value={segments}
        onChange={e => setSegments(Number(e.target.value) as ClockSegments)}
      >
        {CLOCK_SEGMENTS.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Button
        variant={ctaVariant}
        size={ctaVariant === 'outline' ? 'sm' : undefined}
        aria-label={ctaAriaLabel}
        disabled={busy || !name.trim()}
        onClick={submit}
      >
        {cta}
      </Button>
    </Stack>
  );
}
