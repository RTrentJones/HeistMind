'use client';

import { useEffect, useRef, useState } from 'react';
import {
  harmDicePenalty,
  resistanceStress,
  rollOutcome,
  worstHarmLevel,
  type CharacterHarm,
} from '@heist-mind/core';
import { Alert, Badge, Button, Input, Select, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useApplyStress, useMarkDesperateRollXp } from '@/features/characters/data/mutations';
import { useActionRoll, useResistanceRoll } from '@/features/rolls/data/mutations';
import { rollPool } from '@/features/rolls/lib/roll-pool';
import { useTranslation } from '@/lib/i18n/hooks';
import { OUTCOME_KEY, OUTCOME_VARIANT } from '@/features/rolls/lib/labels';

interface ActionOption {
  /** The attribute id (attribute options only) — names the XP track a desperate roll marked. */
  id?: string;
  name: string;
  rating: number;
}

type RollMode = 'action' | 'fortune' | 'resistance';

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
 *
 * `gameId: null` is the STANDALONE sheet (F96, "character sheet anywhere"): the same dice, pool
 * math and outcome classification, but nothing is written to any log — there is no campaign. The
 * stress the rules charge (push +2, a resistance's 6 − highest, a crit clearing 1) still lands on
 * the sheet through the same engine `applyStress` path the stress tracker uses, so the portable
 * sheet stays true to what was rolled (overflow → trauma owed, prompted on the sheet).
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
/** Ability / upgrade dice offered (the bot's `bonus:` range, −3…+3). */
const BONUS_DICE = [-3, -2, -1, 0, 1, 2, 3] as const;
/** How many display-only rolls the standalone panel keeps on screen. */
const LOCAL_HISTORY = 5;

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
  attributes,
  harm,
  teammates,
}: {
  /** The campaign whose log the roll lands in; `null` = standalone, display-only (F96). */
  gameId: string | null;
  characterId?: string;
  actions?: ActionOption[];
  /** The character's ATTRIBUTE ratings — RAW, resistance rolls the attribute, not an action (F23). */
  attributes?: ActionOption[];
  /** The rolling character's harm — surfaces the RAW penalties on action rolls (F43). */
  harm?: CharacterHarm;
  /** Campaign teammates for the ASSIST move (F10): +1d, the helper marks 1 stress. */
  teammates?: { id: string; name: string }[];
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const local = gameId === null;
  // Hooks are unconditional; the campaign writers are simply never called in local mode.
  const actionRoll = useActionRoll(gameId ?? '');
  const resistanceRoll = useResistanceRoll(gameId ?? '');
  const applyStress = useApplyStress(characterId ?? '', null);
  const markDesperateXp = useMarkDesperateRollXp(characterId ?? '');
  const hasActions = !!actions?.length;
  const canResist = !!characterId;
  // Resistance rolls the character's ATTRIBUTES when provided (RAW; derived on action-rating
  // rulesets), falling back to action ratings, else the BitD trio at 0 (zero-dice).
  const resistOptions: ActionOption[] = attributes?.length
    ? attributes
    : hasActions
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
  // BitD pre-roll dice moves (action rolls only): push yourself (+1d for 2 stress) OR a devil's
  // bargain (+1d for a complication) — one or the other, never both (RAW, action roll step 5).
  const [push, setPush] = useState(false);
  const [bargain, setBargain] = useState(false);
  const [bargainNote, setBargainNote] = useState('');
  // F43 — harm penalties, RAW (SRD, Harm): moderate harm = −1d on action rolls (applied by
  // default, waivable when the table rules otherwise), lesser = reduced effect (surfaced),
  // severe = can't act without help or pushing (surfaced).
  const worstHarm = harm ? worstHarmLevel({ harm }) : null;
  const harmPenalty = harm ? harmDicePenalty({ harm }) : 0;
  const [waiveHarm, setWaiveHarm] = useState(false);
  // Round 4 — ability / upgrade dice (the bot's `bonus:`), signed −3…+3, action + resistance.
  const [bonus, setBonus] = useState(0);
  const signedDice = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
  // Negative ability dice are almost always a penalty (Daredevil −1d…), not "from an ability".
  const bonusNote =
    bonus > 0
      ? t('components.rollPanel.abilityDiceNote', { signed: signedDice(bonus) })
      : bonus < 0
        ? t('components.rollPanel.abilityDicePenaltyNote', { signed: signedDice(bonus) })
        : null;
  const appliedHarmPenalty = waiveHarm ? 0 : harmPenalty;
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    outcome: keyof typeof OUTCOME_KEY;
    results: number[];
    stress?: number;
    kind?: RollMode;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Standalone (display-only) rolls: the last few, newest first — there's no log to read them in.
  const [history, setHistory] = useState<
    { id: number; label: string; outcome: keyof typeof OUTCOME_KEY; results: number[] }[]
  >([]);
  const historySeq = useRef(0);
  // RAW feedback: what the desperate roll just marked (the attribute XP track).
  const [desperateNote, setDesperateNote] = useState<string | null>(null);
  // F103 — what happened to the stress a SAVED roll charged: a failed push/resistance write, and
  // the assist's 1 stress on the helper. Shown with the result, never as "Roll failed".
  const [stressNotes, setStressNotes] = useState<string[]>([]);

  /**
   * P1-2 — push, a devil's bargain, an assist, ability dice and a harm waiver are ONE-SHOT moves:
   * they apply to the roll they were chosen for. Cleared only after that roll SUCCEEDS (a failed
   * roll keeps them so the player can simply retry); action/position/effect stay — players do
   * re-roll the same action.
   */
  const resetOneShots = (rolled: RollMode) => {
    setBonus(0);
    if (rolled !== 'action') return;
    setPush(false);
    setBargain(false);
    setBargainNote('');
    setAssistId('');
    setWaiveHarm(false);
  };
  // F99 — on a phone the result can land below the fold / under the fixed thumb bar: bring it
  // into view (nearest edge, honouring the region's scroll margin) whenever a new roll lands.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!last || typeof window === 'undefined') return;
    if (!window.matchMedia?.('(max-width: 639px)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [last]);
  const attributeName = (id: string) => attributes?.find(a => a.id === id)?.name ?? id;
  /** What a desperate roll did to the XP track — marked, already full, or (rare) failed. */
  const desperateCopy = (
    xp: { track: string | null; marks: number; trackFull?: boolean } | null,
    failure?: string | null
  ): string | null => {
    if (xp?.track)
      return xp.trackFull
        ? t('components.rollPanel.desperateXpFull', {
            attribute: attributeName(xp.track),
            size: xp.marks,
          })
        : t('components.rollPanel.desperateXpNote', {
            attribute: attributeName(xp.track),
            marks: xp.marks,
          });
    return failure ? t('components.rollPanel.desperateXpFailed', { reason: failure }) : null;
  };

  /** What happened to the helper's 1 stress (F103) — the roller tells the table. */
  const assistCopy = (
    name: string,
    a: { status: 'charged' | 'near_limit' | 'failed'; error?: string }
  ): string =>
    a.status === 'charged'
      ? t('components.rollPanel.assistCharged', { name })
      : a.status === 'near_limit'
        ? t('components.rollPanel.assistNearLimit', { name })
        : t('components.rollPanel.assistFailed', {
            name,
            reason: a.error ?? t('components.rollPanel.rollFailed'),
          });

  // Feed copy for a stress cost that marks the last box (RAW → trauma; the engine logs it).
  const traumaLog = {
    note: (name: string) => t('components.characterSheet.traumaLogNote', { name }),
    retireNote: (name: string) => t('components.characterSheet.traumaRetireLogNote', { name }),
  };

  const realize = (count: number) =>
    Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));

  /** Charge a stress delta to the rolling character's sheet (standalone mode; no log). */
  const chargeStress = async (userId: string, stress: number) => {
    if (characterId === undefined || stress === 0) return;
    await applyStress.mutateAsync({ userId, stress, traumaLog });
  };

  // F96 — standalone sheet: realize, classify and show; apply only the stress the rules charge.
  const rollLocally = async (userId: string) => {
    let label: string;
    let count: number;
    let zeroDice: boolean;
    let stress: number | undefined;
    let kind: RollMode = mode;
    if (mode === 'resistance') {
      const opt = resistOptions.find(o => o.name === resist) ?? resistOptions[0];
      ({ count, zeroDice } = rollPool({ mode, rating: opt?.rating ?? 0, bonus }));
      label = opt?.name ?? t(MODE_KEY.resistance);
    } else {
      const isActionRoll = mode === 'action';
      const rating = isActionRoll ? (actions?.find(a => a.name === action)?.rating ?? 0) : fortune;
      ({ count, zeroDice } = rollPool({
        mode,
        rating,
        push,
        bargain,
        harmPenalty: isActionRoll ? appliedHarmPenalty : 0,
        fortune,
        bonus: isActionRoll ? bonus : 0,
      }));
      label = isActionRoll ? action : t(FORTUNE_TYPE_KEY[fortuneType]);
      kind = isActionRoll ? 'action' : 'fortune';
    }
    const results = realize(count);
    const outcome = rollOutcome(results, { zeroDice });
    if (mode === 'resistance') {
      stress = resistanceStress(results, { zeroDice });
      await chargeStress(userId, stress);
    } else if (mode === 'action' && push) {
      // Pushing yourself costs 2 stress, win or lose (RAW).
      await chargeStress(userId, 2);
    }
    // A desperate action roll marks 1 xp in that action's attribute (RAW), log or no log. The
    // roll already happened (and its stress landed) — an XP write failure is reported as such,
    // never as the roll failing.
    let xp: Awaited<ReturnType<typeof markDesperateXp.mutateAsync>> = null;
    let xpFailure: string | null = null;
    if (mode === 'action' && position === 'desperate' && characterId !== undefined) {
      try {
        xp = await markDesperateXp.mutateAsync({ userId, action });
      } catch (e) {
        xpFailure = (e as Error).message || t('components.rollPanel.rollFailed');
      }
    }
    setDesperateNote(desperateCopy(xp, xpFailure));
    setStressNotes([]);
    setLast({ outcome, results, kind, ...(stress !== undefined ? { stress } : {}) });
    setHistory(h =>
      [{ id: ++historySeq.current, label, outcome, results }, ...h].slice(0, LOCAL_HISTORY)
    );
    resetOneShots(mode);
  };

  const roll = async () => {
    const userId = user?.id;
    if (!userId) return;
    setRolling(true);
    setError(null);

    try {
      if (local) {
        await rollLocally(userId);
        return;
      }
      // The sequenced parts (persist + stress consequences) are ENGINE use-cases; the panel
      // realizes the dice and phrases the feed copy.
      if (mode === 'resistance') {
        const opt = resistOptions.find(o => o.name === resist) ?? resistOptions[0];
        const { count, zeroDice } = rollPool({ mode, rating: opt?.rating ?? 0, bonus });
        const results = realize(count);
        const {
          roll: created,
          stress,
          stressError,
        } = await resistanceRoll.mutateAsync({
          userId,
          ...(characterId !== undefined ? { characterId } : {}),
          ...(opt?.name !== undefined ? { label: opt.name } : {}),
          dice: count,
          results,
          zeroDice,
          ...(bonusNote ? { note: bonusNote } : {}),
          traumaLog,
        });
        setLast({ outcome: created.outcome, results: created.results, stress });
        setDesperateNote(null);
        setStressNotes(
          stressError
            ? [t('components.rollPanel.stressNotMarked', { count: stress, reason: stressError })]
            : []
        );
        resetOneShots('resistance');
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
        bonus: isActionRoll ? bonus : 0,
      });
      const results = realize(count);
      // Record the moves so the feed shows what was spent / accepted.
      const notes: string[] = [];
      if (isActionRoll && appliedHarmPenalty > 0)
        notes.push(t('components.rollPanel.harmPenaltyNote'));
      if (isActionRoll && push) notes.push(t('components.rollPanel.pushedNote'));
      if (assistant) notes.push(t('components.rollPanel.assistNote', { name: assistant.name }));
      if (isActionRoll && bonusNote) notes.push(bonusNote);
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
        // RAW: a desperate action roll marks XP in this action's attribute (engine-applied) —
        // and logs it, so the GM sees it in the campaign log too (round 5 P2-8).
        ...(isActionRoll
          ? {
              action,
              desperateXpLog: (track: string | null, amount: number) =>
                track
                  ? t('components.rollPanel.desperateXpLogNote', {
                      count: amount,
                      attribute: attributeName(track),
                    })
                  : t('components.rollPanel.desperateXpLogNotePool', { count: amount }),
            }
          : {}),
        dice: count,
        results,
        zeroDice,
        ...(isActionRoll ? { position, effect } : {}),
        ...(notes.length > 0 ? { note: notes.join(' · ') } : {}),
        // Pushing yourself costs 2 stress, applied win or lose (the engine charges it).
        pushed: isActionRoll && push,
        // Assist (F10): the engine charges the helper's 1 stress when the roller may write them;
        // otherwise the note above tells the helper to self-mark.
        ...(assistant
          ? {
              assist: {
                characterId: assistant.id,
                logNote: t('components.rollPanel.assistChargedLogNote', { name: assistant.name }),
              },
            }
          : {}),
        traumaLog,
      });
      setLast({ outcome: created.outcome, results: created.results, kind: mode });
      // The roll is saved either way; a desperate-XP side-effect failure is its own note.
      setDesperateNote(desperateCopy(created.desperateXp, created.desperateXpError));
      setStressNotes(
        [
          created.stressError
            ? t('components.rollPanel.stressNotMarked', { count: 2, reason: created.stressError })
            : null,
          assistant && created.assist ? assistCopy(assistant.name, created.assist) : null,
        ].filter((n): n is string => n !== null)
      );
      resetOneShots(mode);
    } catch (e) {
      setError((e as Error).message ?? t('components.rollPanel.rollFailed'));
    } finally {
      setRolling(false);
    }
  };

  // F102 — the pool the Roll button will throw, shown beside it, so every modifier (ability dice,
  // push / bargain, assist, harm) visibly changes the count ("Hunt (0d)" + "+2d" used to read 0d).
  // Same `rollPool` inputs as `roll` / `rollLocally` (standalone sheets have no assist).
  const isActionMode = mode === 'action';
  const pool =
    mode === 'resistance'
      ? rollPool({
          mode,
          rating: (resistOptions.find(o => o.name === resist) ?? resistOptions[0])?.rating ?? 0,
          bonus,
        })
      : rollPool({
          mode,
          rating: isActionMode ? (actions?.find(a => a.name === action)?.rating ?? 0) : fortune,
          push,
          bargain,
          assist: !local && isActionMode && !!teammates?.some(tm => tm.id === assistId),
          harmPenalty: isActionMode ? appliedHarmPenalty : 0,
          fortune,
          bonus: isActionMode ? bonus : 0,
        });
  const poolDice = pool.zeroDice ? 0 : pool.count;
  // A 0-dice pool rolls 2 and takes the lowest — surface that so it doesn't read as a bug.
  const isZeroDiceAction = mode !== 'fortune' && pool.zeroDice;

  return (
    <Stack direction='column' gap='sm'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}
      {/* min-w-0/max-w-full on every child + full-width selects: long option labels shrink
          inside the card instead of running past it at 360px (pixel review #7). */}
      <Stack
        direction='row'
        gap='sm'
        align='center'
        className='flex-wrap [&>*]:min-w-0 [&>*]:max-w-full [&_select]:max-w-full'
      >
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
            {/* RAW: the bonus die comes from pushing OR a devil's bargain — "you can't get dice
                for both" — so ticking one clears the other. */}
            <label className='flex cursor-pointer items-center gap-1.5 text-sm'>
              <input
                type='checkbox'
                checked={push}
                onChange={e => {
                  setPush(e.target.checked);
                  if (e.target.checked) setBargain(false);
                }}
              />
              {t('components.rollPanel.push')}
            </label>
            <label className='flex cursor-pointer items-center gap-1.5 text-sm'>
              <input
                type='checkbox'
                checked={bargain}
                onChange={e => {
                  setBargain(e.target.checked);
                  if (e.target.checked) setPush(false);
                }}
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
        {(mode === 'action' || mode === 'resistance') && (
          // Round 4 — the bot's `bonus:` on the web: dice an ability or upgrade adds/removes.
          <Select
            aria-label={t('components.rollPanel.bonusLabel')}
            title={t('components.rollPanel.bonusHint')}
            selectSize='sm'
            value={bonus}
            onChange={e => setBonus(Number(e.target.value))}
          >
            {BONUS_DICE.map(n => (
              <option key={n} value={n}>
                {n === 0
                  ? t('components.rollPanel.bonusNone')
                  : n < 0
                    ? t('components.rollPanel.bonusPenaltyOption', { signed: signedDice(n) })
                    : t('components.rollPanel.bonusOption', { signed: signedDice(n) })}
              </option>
            ))}
          </Select>
        )}
        <span className='inline-flex items-center gap-2'>
          <Button variant='ember' onClick={roll} loading={rolling}>
            {mode === 'resistance'
              ? t('components.rollPanel.resistButton')
              : t('components.rollPanel.rollButton')}
          </Button>
          <Text as='span' size='sm' variant='muted' data-testid='roll-pool'>
            {t('components.rollPanel.poolPreview', { count: poolDice })}
          </Text>
        </span>
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
      {/* Always-mounted polite live region: the newest result is ANNOUNCED to screen-reader users
          (the app's core action had no feedback for them — review item 8). */}
      {/* F99 — the desperate-XP note rides INSIDE the live region, directly under the result (it
          rendered last, below the "not saved" note — under the phone thumb bar and unannounced).
          `scroll-mb-20` + the effect below bring a new result above that bar on phones. */}
      <div
        ref={resultRef}
        role='status'
        aria-live='polite'
        aria-atomic='true'
        data-testid='roll-result'
        className='flex scroll-mb-20 flex-col gap-2'
      >
        {last && (
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
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
        {desperateNote && last?.kind === 'action' && (
          // Announced by the enclosing live region — not a nested one of its own.
          <Alert
            variant='info'
            size='sm'
            role='note'
            aria-live='off'
            data-testid='desperate-xp-note'
          >
            {desperateNote}
          </Alert>
        )}
        {last &&
          stressNotes.map(note => (
            <Alert
              key={note}
              variant='info'
              size='sm'
              role='note'
              aria-live='off'
              data-testid='roll-stress-note'
            >
              {note}
            </Alert>
          ))}
      </div>
      {local && (
        <Text size='sm' variant='muted' data-testid='roll-local-note'>
          {t('components.rollPanel.localNote')}
        </Text>
      )}
      {local && history.length > 1 && (
        <div>
          <Text as='strong' size='sm'>
            {t('components.rollPanel.localHistory')}
          </Text>
          <ol className='mt-1 space-y-0.5 text-sm text-foreground-muted' data-testid='roll-history'>
            {history.map(h => (
              <li key={h.id}>
                {h.label} · {t(OUTCOME_KEY[h.outcome])} [{h.results.join(', ')}]
              </li>
            ))}
          </ol>
        </div>
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
