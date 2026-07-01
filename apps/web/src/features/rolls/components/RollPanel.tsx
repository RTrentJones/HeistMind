'use client';

import { useState } from 'react';
import { diceForRating, resistanceStress } from '@heist-mind/database';
import { Alert, Badge, Button, Input, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useApplyCharacterStress } from '@/features/characters/data/mutations';
import { useCreateRoll } from '@/features/rolls/data/mutations';
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
export function RollPanel({
  gameId,
  characterId,
  actions,
  onRolled,
}: {
  gameId: string;
  characterId?: string;
  actions?: ActionOption[];
  onRolled?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const createRoll = useCreateRoll(gameId);
  const applyStressMut = useApplyCharacterStress();
  const hasActions = !!actions?.length;
  const canResist = !!characterId;
  // Resistance is rolled against the character's own ratings when we have them, else the BitD trio.
  const resistOptions: ActionOption[] = hasActions
    ? actions!
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
  const [position, setPosition] = useState('risky');
  const [effect, setEffect] = useState('standard');
  // BitD pre-roll dice moves (action rolls only): push yourself (+1d for 2 stress) and a devil's
  // bargain (+1d for a complication). They stack — both just grow the dice pool.
  const [push, setPush] = useState(false);
  const [bargain, setBargain] = useState(false);
  const [bargainNote, setBargainNote] = useState('');
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    outcome: keyof typeof OUTCOME_KEY;
    results: number[];
    stress?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const realize = (count: number) =>
    Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));

  // Add the resist's stress cost to the character, clamped to the ruleset's stress max (no-op without
  // a character or cost). The read-modify-write lives behind the characters seam.
  const applyStressCost = (userId: string, stress: number) => {
    if (!characterId || stress <= 0) return;
    return applyStressMut.mutateAsync({ characterId, userId, stress });
  };

  const roll = async () => {
    const userId = user?.id;
    if (!userId) return;
    setRolling(true);
    setError(null);

    try {
      if (mode === 'resistance') {
        const opt = resistOptions.find(o => o.name === resist) ?? resistOptions[0];
        const { count, zeroDice } = diceForRating(opt?.rating ?? 0);
        const results = realize(count);
        const stress = resistanceStress(results);
        const created = await createRoll.mutateAsync({
          userId,
          data: {
            gameId,
            characterId,
            kind: 'resistance',
            label: opt?.name,
            dice: count,
            results,
            zeroDice,
          },
        });
        await applyStressCost(userId, stress);
        setLast({ outcome: created.outcome, results: created.results, stress });
        onRolled?.();
        return;
      }

      const isActionRoll = mode === 'action';
      const rating = isActionRoll ? (actions!.find(a => a.name === action)?.rating ?? 0) : fortune;
      // Push and devil's bargain each add a die to an action roll (a 0-pool still rolls 2 take-lowest).
      const extraDice = isActionRoll ? (push ? 1 : 0) + (bargain ? 1 : 0) : 0;
      const { count, zeroDice } = isActionRoll
        ? diceForRating(rating + extraDice)
        : { count: Math.max(fortune, 1), zeroDice: false };
      const results = realize(count);
      // Record the moves so the feed shows what was spent / accepted.
      const notes: string[] = [];
      if (isActionRoll && push) notes.push(t('components.rollPanel.pushedNote'));
      if (isActionRoll && bargain)
        notes.push(
          bargainNote.trim()
            ? t('components.rollPanel.bargainNote', { note: bargainNote.trim() })
            : t('components.rollPanel.bargainNoteEmpty')
        );
      const created = await createRoll.mutateAsync({
        userId,
        data: {
          gameId,
          characterId,
          kind: isActionRoll ? 'action' : 'fortune',
          label: isActionRoll ? action : 'Fortune',
          dice: count,
          results,
          zeroDice,
          position: isActionRoll ? position : undefined,
          effect: isActionRoll ? effect : undefined,
          note: notes.length > 0 ? notes.join(' · ') : undefined,
        },
      });
      // Pushing yourself costs 2 stress, applied win or lose.
      if (isActionRoll && push) await applyStressCost(userId, 2);
      setLast({ outcome: created.outcome, results: created.results });
      onRolled?.();
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
              {actions!.map(a => (
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
      {last && (
        <Stack direction='row' gap='sm' align='center'>
          {last.stress != null ? (
            <Badge variant='stress-critical'>
              {t('components.rollPanel.stressTaken', { count: last.stress })}
            </Badge>
          ) : (
            <Badge variant={OUTCOME_VARIANT[last.outcome]}>{t(OUTCOME_KEY[last.outcome])}</Badge>
          )}
          <Text variant='muted' size='sm'>
            [{last.results.join(', ')}]
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
