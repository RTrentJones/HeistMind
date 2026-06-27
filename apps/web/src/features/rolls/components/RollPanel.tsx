'use client';

import { useState } from 'react';
import { diceForRating, resistanceStress, stressBounds } from '@heist-mind/database';
import { Alert, Badge, Button, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
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
const OUTCOME_LABEL = {
  crit: 'Critical!',
  success: 'Success',
  partial: 'Partial',
  bad: 'Bad outcome',
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

const sel =
  'rounded-md border border-border-primary bg-background-secondary px-2 py-1 text-sm text-foreground-primary';

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
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    outcome: keyof typeof OUTCOME_LABEL;
    results: number[];
    stress?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const realize = (count: number) =>
    Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));

  // Add the resist's stress cost to the character, clamped to the ruleset's stress max.
  const applyStress = async (userId: string, stress: number) => {
    if (!characterId || stress <= 0) return;
    const charRes = await getRepositories().characters.findWithDetails(characterId);
    if (!charRes.success || !charRes.data) return;
    const char = charRes.data;
    const max = stressBounds(char.ruleset.content).max;
    const current = char.characterData?.stress ?? 0;
    const next = Math.max(0, Math.min(current + stress, max));
    if (next === current) return;
    await getRepositories().characterManagement.updateCharacterWithValidation(characterId, userId, {
      characterData: { ...char.characterData, stress: next },
    });
  };

  const roll = async () => {
    const userId = user?.id;
    if (!userId) return;
    setRolling(true);
    setError(null);

    if (mode === 'resistance') {
      const opt = resistOptions.find(o => o.name === resist) ?? resistOptions[0];
      const { count, zeroDice } = diceForRating(opt?.rating ?? 0);
      const results = realize(count);
      const stress = resistanceStress(results);
      const r = await getRepositories().rolls.create(userId, {
        gameId,
        characterId,
        kind: 'resistance',
        label: opt?.name,
        dice: count,
        results,
        zeroDice,
      });
      if (!r.success) {
        setRolling(false);
        setError(r.error?.message ?? t('components.rollPanel.rollFailed'));
        return;
      }
      await applyStress(userId, stress);
      setRolling(false);
      setLast({ outcome: r.data.outcome, results: r.data.results, stress });
      onRolled?.();
      return;
    }

    const isActionRoll = mode === 'action';
    const rating = isActionRoll ? (actions!.find(a => a.name === action)?.rating ?? 0) : fortune;
    const { count, zeroDice } = isActionRoll
      ? diceForRating(rating)
      : { count: Math.max(fortune, 1), zeroDice: false };
    const results = realize(count);
    const r = await getRepositories().rolls.create(userId, {
      gameId,
      characterId,
      kind: isActionRoll ? 'action' : 'fortune',
      label: isActionRoll ? action : 'Fortune',
      dice: count,
      results,
      zeroDice,
      position: isActionRoll ? position : undefined,
      effect: isActionRoll ? effect : undefined,
    });
    setRolling(false);
    if (!r.success) {
      setError(r.error?.message ?? t('components.rollPanel.rollFailed'));
      return;
    }
    setLast({ outcome: r.data.outcome, results: r.data.results });
    onRolled?.();
  };

  return (
    <Stack direction='column' gap='sm'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}
      <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
        {modes.length > 1 && (
          <select
            aria-label={t('components.rollPanel.modeLabel')}
            className={sel}
            value={mode}
            onChange={e => setMode(e.target.value as RollMode)}
          >
            {modes.map(m => (
              <option key={m} value={m}>
                {t(MODE_KEY[m])}
              </option>
            ))}
          </select>
        )}
        {mode === 'action' && (
          <>
            <select
              aria-label={t('components.rollPanel.actionLabel')}
              className={sel}
              value={action}
              onChange={e => setAction(e.target.value)}
            >
              {actions!.map(a => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.rating}d)
                </option>
              ))}
            </select>
            <select
              aria-label={t('components.rollPanel.positionLabel')}
              className={sel}
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value='controlled'>Controlled</option>
              <option value='risky'>Risky</option>
              <option value='desperate'>Desperate</option>
            </select>
            <select
              aria-label={t('components.rollPanel.effectLabel')}
              className={sel}
              value={effect}
              onChange={e => setEffect(e.target.value)}
            >
              <option value='limited'>Limited</option>
              <option value='standard'>Standard</option>
              <option value='great'>Great</option>
            </select>
          </>
        )}
        {mode === 'fortune' && (
          <select
            aria-label={t('components.rollPanel.fortuneLabel')}
            className={sel}
            value={fortune}
            onChange={e => setFortune(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                {n}d
              </option>
            ))}
          </select>
        )}
        {mode === 'resistance' && (
          <select
            aria-label={t('components.rollPanel.resistLabel')}
            className={sel}
            value={resist}
            onChange={e => setResist(e.target.value)}
          >
            {resistOptions.map(o => (
              <option key={o.name} value={o.name}>
                {o.name} ({o.rating}d)
              </option>
            ))}
          </select>
        )}
        <Button variant='ember' onClick={roll} loading={rolling}>
          {mode === 'resistance'
            ? t('components.rollPanel.resistButton')
            : t('components.rollPanel.rollButton')}
        </Button>
      </Stack>
      {last && (
        <Stack direction='row' gap='sm' align='center'>
          {last.stress != null ? (
            <Badge variant='stress-critical'>
              {t('components.rollPanel.stressTaken', { count: last.stress })}
            </Badge>
          ) : (
            <Badge variant={OUTCOME_VARIANT[last.outcome]}>{OUTCOME_LABEL[last.outcome]}</Badge>
          )}
          <Text variant='muted' size='sm'>
            [{last.results.join(', ')}]
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
