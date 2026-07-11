'use client';

import { useState } from 'react';
import { harmDicePenalty, worstHarmLevel, type CharacterHarm } from '@heist-mind/core';
import { Alert, Badge, Button, Input, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useActionRoll, useResistanceRoll } from '@/features/rolls/data/mutations';
import { rollPool } from '@/features/rolls/lib/roll-pool';
import { useTranslation } from '@/lib/i18n/hooks';

interface ActionOption {
  name: string;
  rating: number;
}

type RollMode = 'action' | 'fortune' | 'resistance';

const OUTCOME_VARIANT = {
  crit: 'gold',
  success: 'success',
  partial: 'warning',
  bad: 'stress-critical',
} as const;
// Static (non-template) keys so they stay in the typed TranslationKey union.
const OUTCOME_KEY = {
  crit: 'components.rollPanel.outcome.crit',
  success: 'components.rollPanel.outcome.success',
  partial: 'components.rollPanel.outcome.partial',
  bad: 'components.rollPanel.outcome.bad',
} as const;

// BitD fallback attributes for resistance when a ruleset has no action ratings to draw on. Without
// per-attribute ratings here they roll at 0 (2d take-lowest) — the harshest, most desperate resist.
const STANDARD_ATTRIBUTES = ['Insight', 'Prowess', 'Resolve'];

// Static (non-template) so the keys stay in the typed TranslationKey union.
const MODE_KEY = {
  action: 'components.rollPanel.mode.action',
  fortune: 'components.rollPanel.mode.fortune',
  resistance: 'components.rollPanel.mode.resistance',
} as const;

/**
 * Roll dice for a character action, a GM fortune roll, or a resistance roll, and persist it to the
 * campaign's log. Dice are realized client-side; the repository recomputes the outcome from the
 * faces. A resistance roll also applies the stress it costs to the resisting character.
 */
// Fortune-roll flavors (F46): all fortune mechanically, but the LABEL tells the table what was
// asked, and the readout interprets the tiers the way the SRD phrases them.
const FORTUNE_TYPES = ['fortune', 'engagement', 'gatherInfo'] as const;
type FortuneType = (typeof FORTUNE_TYPES)[number];
const FORTUNE_TYPE_KEY = {
  fortune: 'components.rollPanel.fortuneType.fortune',
  engagement: 'components.rollPanel.fortuneType.engagement',
  gatherInfo: 'components.rollPanel.fortuneType.gatherInfo',
} as const;
const FORTUNE_READING_KEY = {
  crit: 'components.rollPanel.fortuneReading.crit',
  success: 'components.rollPanel.fortuneReading.success',
  partial: 'components.rollPanel.fortuneReading.partial',
  bad: 'components.rollPanel.fortuneReading.bad',
} as const;

export function RollPanel({
  gameId,
  characterId,
  actions,
  harm,
  teammates,
}: {
  gameId: string;
  characterId?: string;
  actions?: ActionOption[];
  /** The rolling character's harm — surfaces the RAW penalties on action rolls (F43). */
  harm?: CharacterHarm;
  /** Campaign teammates for the ASSIST move (F10): +1d, the helper marks 1 stress. */
  teammates?: { id: string; name: string }[];
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const actionRoll = useActionRoll(gameId);
  const resistanceRoll = useResistanceRoll(gameId);
  const hasActions = !!actions?.length;
  const canResist = !!characterId;
  // Resistance is rolled against the character's own ratings when we have them, else the BitD trio.
  const resistOptions: ActionOption[] = hasActions
    ? actions
    : STANDARD_ATTRIBUTES.map(name => ({ name, rating: 0 }));
  const modes: RollMode[] = [
    ...(hasActions ? (['action'] as const) : []),
    'fortune',
    ...(canResist ? (['resistance'] as const) : []),
  ];

  const [mode, setMode] = useState<RollMode>(hasActions ? 'action' : 'fortune');
  const [action, setAction] = useState(actions?.[0]?.name ?? '');
  const [resist, setResist] = useState(resistOptions[0]?.name ?? '');
  const [fortune, setFortune] = useState(1);
  const [fortuneType, setFortuneType] = useState<FortuneType>('fortune');
  // F10 — the assisting teammate's character id ('' = rolling alone).
  const [assistId, setAssistId] = useState('');
  const [position, setPosition] = useState('risky');
  const [effect, setEffect] = useState('standard');
  // BitD pre-roll dice moves (action rolls only): push yourself (+1d for 2 stress) and a devil's
  // bargain (+1d for a complication). They stack — both just grow the dice pool.
  const [push, setPush] = useState(false);
  const [bargain, setBargain] = useState(false);
  const [bargainNote, setBargainNote] = useState('');
  // F43 — harm penalties, RAW (SRD, Harm): moderate harm = −1d on action rolls (applied by
  // default, waivable when the table rules otherwise), lesser = reduced effect (surfaced),
  // severe = can't act without help or pushing (surfaced).
  const worstHarm = harm ? worstHarmLevel({ harm }) : null;
  const harmPenalty = harm ? harmDicePenalty({ harm }) : 0;
  const [waiveHarm, setWaiveHarm] = useState(false);
  const appliedHarmPenalty = waiveHarm ? 0 : harmPenalty;
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    outcome: keyof typeof OUTCOME_KEY;
    results: number[];
    stress?: number;
    kind?: RollMode;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const realize = (count: number) =>
    Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));

  const roll = async () => {
    const userId = user?.id;
    if (!userId) return;
    setRolling(true);
    setError(null);

    try {
      // The sequenced parts (persist + stress consequences) are ENGINE use-cases; the panel
      // realizes the dice and phrases the feed copy.
      if (mode === 'resistance') {
        const opt = resistOptions.find(o => o.name === resist) ?? resistOptions[0];
        const { count, zeroDice } = rollPool({ mode, rating: opt?.rating ?? 0 });
        const results = realize(count);
        const { roll: created, stress } = await resistanceRoll.mutateAsync({
          userId,
          ...(characterId !== undefined ? { characterId } : {}),
          ...(opt?.name !== undefined ? { label: opt.name } : {}),
          dice: count,
          results,
          zeroDice,
        });
        setLast({ outcome: created.outcome, results: created.results, stress });
        return;
      }

      const isActionRoll = mode === 'action';
      const rating = isActionRoll ? (actions?.find(a => a.name === action)?.rating ?? 0) : fortune;
      const assistant = isActionRoll ? (teammates?.find(tm => tm.id === assistId) ?? null) : null;
      // Push, devil's bargain, and an assist each add a die; moderate harm costs one (a 0-pool
      // still rolls 2 take-lowest) — the pool math is the pure, unit-tested `rollPool`.
      const { count, zeroDice } = rollPool({
        mode,
        rating,
        push,
        bargain,
        assist: assistant !== null,
        harmPenalty: isActionRoll ? appliedHarmPenalty : 0,
        fortune,
      });
      const results = realize(count);
      // Record the moves so the feed shows what was spent / accepted.
      const notes: string[] = [];
      if (isActionRoll && appliedHarmPenalty > 0)
        notes.push(t('components.rollPanel.harmPenaltyNote'));
      if (isActionRoll && push) notes.push(t('components.rollPanel.pushedNote'));
      if (assistant) notes.push(t('components.rollPanel.assistNote', { name: assistant.name }));
      if (isActionRoll && bargain)
        notes.push(
          bargainNote.trim()
            ? t('components.rollPanel.bargainNote', { note: bargainNote.trim() })
            : t('components.rollPanel.bargainNoteEmpty')
        );
      const created = await actionRoll.mutateAsync({
        userId,
        ...(characterId !== undefined ? { characterId } : {}),
        kind: isActionRoll ? 'action' : 'fortune',
        label: isActionRoll ? action : t(FORTUNE_TYPE_KEY[fortuneType]),
        dice: count,
        results,
        zeroDice,
        ...(isActionRoll ? { position, effect } : {}),
        ...(notes.length > 0 ? { note: notes.join(' · ') } : {}),
        // Pushing yourself costs 2 stress, applied win or lose (the engine charges it).
        pushed: isActionRoll && push,
        // Assist (F10): the engine charges the helper's 1 stress when the roller may write them;
        // otherwise the note above tells the helper to self-mark.
        ...(assistant ? { assist: { characterId: assistant.id } } : {}),
      });
      setLast({ outcome: created.outcome, results: created.results, kind: mode });
    } catch (e) {
      setError((e as Error).message ?? t('components.rollPanel.rollFailed'));
    } finally {
      setRolling(false);
    }
  };

  // Rating-0 actions roll 2 dice and take the lowest — surface that so it doesn't read as a bug.
  const isZeroDiceAction =
    mode === 'action' && (actions?.find(a => a.name === action)?.rating ?? 1) <= 0;

  return (
    <Stack direction='column' gap='sm'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}
      <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
        {modes.length > 1 && (
          <Select
            aria-label={t('components.rollPanel.modeLabel')}
            selectSize='sm'
            value={mode}
            onChange={e => setMode(e.target.value as RollMode)}
          >
            {modes.map(m => (
              <option key={m} value={m}>
                {t(MODE_KEY[m])}
              </option>
            ))}
          </Select>
        )}
        {mode === 'action' && (
          <>
            <Select
              aria-label={t('components.rollPanel.actionLabel')}
              selectSize='sm'
              value={action}
              onChange={e => setAction(e.target.value)}
            >
              {(actions ?? []).map(a => (
                <option key={a.name} value={a.name}>
                  {a.name} {t('components.rollPanel.diceSuffix', { count: a.rating })}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t('components.rollPanel.positionLabel')}
              selectSize='sm'
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value='controlled'>{t('components.rollPanel.position.controlled')}</option>
              <option value='risky'>{t('components.rollPanel.position.risky')}</option>
              <option value='desperate'>{t('components.rollPanel.position.desperate')}</option>
            </Select>
            <Select
              aria-label={t('components.rollPanel.effectLabel')}
              selectSize='sm'
              value={effect}
              onChange={e => setEffect(e.target.value)}
            >
              <option value='limited'>{t('components.rollPanel.effect.limited')}</option>
              <option value='standard'>{t('components.rollPanel.effect.standard')}</option>
              <option value='great'>{t('components.rollPanel.effect.great')}</option>
            </Select>
            <Tooltip
              variant='dark'
              size='lg'
              content={
                <div className='space-y-1'>
                  <div className='font-semibold'>{t('components.rollPanel.positionHelpTitle')}</div>
                  <div className='text-xs opacity-90'>{t('components.rollPanel.positionHelp')}</div>
                  <div className='pt-1 font-semibold'>
                    {t('components.rollPanel.effectHelpTitle')}
                  </div>
                  <div className='text-xs opacity-90'>{t('components.rollPanel.effectHelp')}</div>
                </div>
              }
            >
              <span
                tabIndex={0}
                className='cursor-help text-xs text-foreground-muted'
                aria-label={t('components.rollPanel.helpAria')}
              >
                ⓘ
              </span>
            </Tooltip>
            <label className='flex cursor-pointer items-center gap-1.5 text-sm'>
              <input type='checkbox' checked={push} onChange={e => setPush(e.target.checked)} />
              {t('components.rollPanel.push')}
            </label>
            <label className='flex cursor-pointer items-center gap-1.5 text-sm'>
              <input
                type='checkbox'
                checked={bargain}
                onChange={e => setBargain(e.target.checked)}
              />
              {t('components.rollPanel.bargain')}
            </label>
            {harmPenalty > 0 && (
              <label className='flex cursor-pointer items-center gap-1.5 text-sm'>
                <input
                  type='checkbox'
                  checked={waiveHarm}
                  onChange={e => setWaiveHarm(e.target.checked)}
                />
                {t('components.rollPanel.waiveHarm')}
              </label>
            )}
            {(teammates?.length ?? 0) > 0 && (
              <Select
                aria-label={t('components.rollPanel.assistLabel')}
                selectSize='sm'
                value={assistId}
                onChange={e => setAssistId(e.target.value)}
              >
                <option value=''>{t('components.rollPanel.assistNone')}</option>
                {(teammates ?? []).map(tm => (
                  <option key={tm.id} value={tm.id}>
                    {t('components.rollPanel.assistOption', { name: tm.name })}
                  </option>
                ))}
              </Select>
            )}
            {bargain && (
              <Input
                size='sm'
                aria-label={t('components.rollPanel.bargainPlaceholder')}
                placeholder={t('components.rollPanel.bargainPlaceholder')}
                value={bargainNote}
                onChange={e => setBargainNote(e.target.value)}
              />
            )}
          </>
        )}
        {mode === 'fortune' && (
          <>
            {/* F46 — what the fortune roll is FOR: same dice, but the label lands in the feed
                and the readout below interprets the tiers. */}
            <Select
              aria-label={t('components.rollPanel.fortuneTypeLabel')}
              selectSize='sm'
              value={fortuneType}
              onChange={e => setFortuneType(e.target.value as FortuneType)}
            >
              {FORTUNE_TYPES.map(ft => (
                <option key={ft} value={ft}>
                  {t(FORTUNE_TYPE_KEY[ft])}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t('components.rollPanel.fortuneLabel')}
              selectSize='sm'
              value={fortune}
              onChange={e => setFortune(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map(n => (
                <option key={n} value={n}>
                  {t('components.rollPanel.diceCount', { count: n })}
                </option>
              ))}
            </Select>
          </>
        )}
        {mode === 'resistance' && (
          <Select
            aria-label={t('components.rollPanel.resistLabel')}
            selectSize='sm'
            value={resist}
            onChange={e => setResist(e.target.value)}
          >
            {resistOptions.map(o => (
              <option key={o.name} value={o.name}>
                {o.name} {t('components.rollPanel.diceSuffix', { count: o.rating })}
              </option>
            ))}
          </Select>
        )}
        <Button variant='ember' onClick={roll} loading={rolling}>
          {mode === 'resistance'
            ? t('components.rollPanel.resistButton')
            : t('components.rollPanel.rollButton')}
        </Button>
      </Stack>
      {isZeroDiceAction && (
        <Text size='sm' variant='muted'>
          {t('components.rollPanel.zeroDiceHint')}
        </Text>
      )}
      {mode === 'action' && worstHarm === 'severe' && (
        <Alert variant='warning' size='sm'>
          {t('components.rollPanel.harmSevereHint')}
        </Alert>
      )}
      {mode === 'action' && harmPenalty > 0 && (
        <Text size='sm' variant='muted'>
          {waiveHarm
            ? t('components.rollPanel.harmWaivedHint')
            : t('components.rollPanel.harmModerateHint')}
        </Text>
      )}
      {mode === 'action' && worstHarm === 'lesser' && (
        <Text size='sm' variant='muted'>
          {t('components.rollPanel.harmLesserHint')}
        </Text>
      )}
      {last && (
        <Stack direction='row' gap='sm' align='center'>
          {last.stress != null ? (
            last.stress < 0 ? (
              // A critical resistance CLEARS 1 stress (negative delta) — celebrate, don't alarm.
              <Badge variant='gold'>{t('components.rollPanel.stressCleared')}</Badge>
            ) : (
              <Badge variant='stress-critical'>
                {t('components.rollPanel.stressTaken', { count: last.stress })}
              </Badge>
            )
          ) : (
            <Badge variant={OUTCOME_VARIANT[last.outcome]}>{t(OUTCOME_KEY[last.outcome])}</Badge>
          )}
          <Text variant='muted' size='sm'>
            [{last.results.join(', ')}]
          </Text>
        </Stack>
      )}
      {/* F46 — the tiered fortune reading, phrased the way the SRD grades fortune results. */}
      {last?.kind === 'fortune' && (
        <Text variant='muted' size='sm'>
          {t(FORTUNE_READING_KEY[last.outcome])}
        </Text>
      )}
      {/* F52 — a partial/bad ACTION result is where consequences land; scaffold the next moves
          instead of leaving the roller at a dead end. */}
      {last?.kind === 'action' && (last.outcome === 'partial' || last.outcome === 'bad') && (
        <Alert variant='warning' size='sm'>
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <span>{t('components.rollPanel.consequenceHint')}</span>
            {canResist && (
              <Button variant='outline' size='sm' onClick={() => setMode('resistance')}>
                {t('components.rollPanel.consequenceResist')}
              </Button>
            )}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
