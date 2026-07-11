'use client';

import { useState } from 'react';
import {
  harmBounds,
  stressBounds,
  type CharacterData,
  type CharacterHarm,
  type RulesetContent,
} from '@heist-mind/core';
import { Badge, Button, HarmTracker, Heading, Input, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

const EMPTY_HARM: CharacterHarm = { lesser: [], moderate: [], severe: [] };

// Static (non-template) keys so they stay in the typed TranslationKey union.
const HARM_LEVEL_KEY = {
  lesser: 'components.characterEditor.addLesser',
  moderate: 'components.characterEditor.addModerate',
  severe: 'components.characterEditor.addSevere',
} as const;

/**
 * The harm + trauma concept surface — ONE implementation for all modes. Without `edit`, it's the
 * sheet's read view (harm tracker + trauma badges, matching the Condition card); add `quick` and
 * the sheet view grows the in-play one-tap moves (F65): take harm at a level and clear a wound by
 * clicking its box — both through the ENGINE use-cases the Discord bot drives, so every change
 * lands in the campaign feed. With `edit`, it's the editor's stress-tab section: trauma picked
 * from the ruleset's named conditions (or free text when the ruleset has none) and harm entries
 * added/removed per level; the editor supplies `onPatch` into its validated draft and owns the save.
 */
export function HarmCard({
  content,
  data,
  edit,
  quick,
}: {
  content: RulesetContent;
  data: CharacterData;
  edit?: { onPatch: (patch: Partial<CharacterData>) => void };
  /** Sheet-face quick actions (owner/GM): engine-backed take/clear, feed-logged. */
  quick?: {
    busy: boolean;
    onTake: (level: keyof CharacterHarm, description: string) => void;
    onClear: (level: keyof CharacterHarm, description: string) => void;
  };
}) {
  const { t } = useTranslation();
  const [traumaInput, setTraumaInput] = useState('');
  const [harmInput, setHarmInput] = useState('');
  const bounds = harmBounds(content);
  const harm = data.harm ?? EMPTY_HARM;
  const trauma = data.trauma ?? [];

  if (!edit) {
    const takeQuick = (level: keyof CharacterHarm) => {
      const value = harmInput.trim();
      if (!value || !quick) return;
      quick.onTake(level, value);
      setHarmInput('');
    };
    return (
      <>
        <div>
          <Text as='strong'>{t('components.characterSheet.harm')}</Text>
          <HarmTracker
            harm={harm}
            bounds={bounds}
            {...(quick
              ? {
                  onClearEntry: quick.onClear,
                  clearLabel: (text: string) =>
                    t('components.characterSheet.clearHarmAria', { name: text }),
                  disabled: quick.busy,
                }
              : {})}
          />
        </div>
        {quick && (
          <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
            <Input
              size='sm'
              label={t('components.characterSheet.takeHarmLabel')}
              placeholder={t('components.characterEditor.harmPlaceholder')}
              value={harmInput}
              onChange={e => setHarmInput(e.target.value)}
            />
            {(['lesser', 'moderate', 'severe'] as const).map(level => (
              <Button
                key={level}
                variant='outline'
                size='sm'
                disabled={!harmInput.trim() || quick.busy}
                onClick={() => takeQuick(level)}
              >
                {t(HARM_LEVEL_KEY[level])}
              </Button>
            ))}
          </Stack>
        )}
        {trauma.length > 0 && (
          <div>
            <Text as='strong'>{t('components.characterSheet.trauma')}</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {trauma.map(condition => (
                <Badge key={condition} variant='stress-critical'>
                  {condition}
                </Badge>
              ))}
            </Stack>
          </div>
        )}
      </>
    );
  }

  const { onPatch } = edit;
  const traumaMax = stressBounds(content).traumaMax;
  const addHarm = (level: keyof CharacterHarm) => {
    const value = harmInput.trim();
    if (!value || harm[level].length >= bounds[level]) return;
    onPatch({ harm: { ...harm, [level]: [...harm[level], value] } });
    setHarmInput('');
  };
  const removeHarm = (level: keyof CharacterHarm, val: string) =>
    onPatch({ harm: { ...harm, [level]: harm[level].filter(x => x !== val) } });

  return (
    <>
      <Heading level='h3'>
        {t('components.characterEditor.traumaHeading', {
          count: trauma.length,
          max: traumaMax,
        })}
      </Heading>
      <Stack direction='row' gap='sm' className='flex-wrap'>
        {trauma.length === 0 && (
          <Text variant='muted' size='sm'>
            {t('components.characterEditor.none')}
          </Text>
        )}
        {trauma.map(condition => (
          <Badge key={condition} variant='stress-critical'>
            {condition}
            <button
              type='button'
              aria-label={t('components.characterEditor.remove', { name: condition })}
              className='ml-1.5 cursor-pointer'
              onClick={() => onPatch({ trauma: trauma.filter(x => x !== condition) })}
            >
              ×
            </button>
          </Badge>
        ))}
      </Stack>
      {content.traumaConditions && content.traumaConditions.length > 0 ? (
        // Named-condition rulesets (BitD's 8): pick from a checklist — unique, capped at
        // traumaMax — rather than typing free text. Toggling a chip adds/removes the condition.
        <Stack direction='row' gap='sm' className='flex-wrap'>
          {content.traumaConditions.map(condition => {
            const taken = trauma.includes(condition);
            const full = trauma.length >= traumaMax;
            return (
              <Button
                key={condition}
                variant={taken ? 'crimson' : 'outline'}
                size='sm'
                aria-pressed={taken}
                disabled={!taken && full}
                onClick={() =>
                  onPatch({
                    trauma: taken ? trauma.filter(x => x !== condition) : [...trauma, condition],
                  })
                }
              >
                {condition}
              </Button>
            );
          })}
        </Stack>
      ) : (
        // Rulesets without a named set: keep free-text entry (unique, capped).
        <Stack direction='row' gap='sm' align='end' className='max-w-md'>
          <Input
            label={t('components.characterEditor.addTrauma')}
            value={traumaInput}
            onChange={e => setTraumaInput(e.target.value)}
            placeholder={t('components.characterEditor.traumaPlaceholder')}
          />
          <Button
            variant='outline'
            disabled={!traumaInput.trim() || trauma.length >= traumaMax}
            onClick={() => {
              const value = traumaInput.trim();
              if (value && trauma.length < traumaMax && !trauma.includes(value)) {
                onPatch({ trauma: [...trauma, value] });
                setTraumaInput('');
              }
            }}
          >
            {t('components.characterEditor.add')}
          </Button>
        </Stack>
      )}

      <Heading level='h3'>{t('components.characterEditor.harm')}</Heading>
      <HarmTracker harm={harm} bounds={bounds} />
      {(['severe', 'moderate', 'lesser'] as const).map(level =>
        harm[level].length > 0 ? (
          <Stack key={level} direction='row' gap='sm' align='center' className='flex-wrap'>
            <Text size='sm' className='w-20 capitalize'>
              {level}
            </Text>
            {harm[level].map(h => (
              <Badge key={h} variant='stress-critical'>
                {h}
                <button
                  type='button'
                  aria-label={t('components.characterEditor.remove', { name: h })}
                  className='ml-1.5 cursor-pointer'
                  onClick={() => removeHarm(level, h)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </Stack>
        ) : null
      )}
      <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
        <Input
          label={t('components.characterEditor.addHarm')}
          value={harmInput}
          onChange={e => setHarmInput(e.target.value)}
          placeholder={t('components.characterEditor.harmPlaceholder')}
        />
        <Button variant='outline' disabled={!harmInput.trim()} onClick={() => addHarm('lesser')}>
          {t('components.characterEditor.addLesser')}
        </Button>
        <Button variant='outline' disabled={!harmInput.trim()} onClick={() => addHarm('moderate')}>
          {t('components.characterEditor.addModerate')}
        </Button>
        <Button variant='outline' disabled={!harmInput.trim()} onClick={() => addHarm('severe')}>
          {t('components.characterEditor.addSevere')}
        </Button>
      </Stack>
    </>
  );
}
