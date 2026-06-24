'use client';

import { useState } from 'react';
import { diceForRating } from '@heist-mind/database';
import { Alert, Badge, Button, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

interface ActionOption {
  name: string;
  rating: number;
}

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

const sel =
  'rounded-md border border-border-primary bg-background-secondary px-2 py-1 text-sm text-foreground-primary';

/**
 * Roll dice for a character action (or a GM fortune roll) and persist it to the campaign's log.
 * Dice are realized client-side; the repository recomputes the outcome from the faces.
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
  const isAction = !!actions?.length;
  const [action, setAction] = useState(actions?.[0]?.name ?? '');
  const [fortune, setFortune] = useState(1);
  const [position, setPosition] = useState('risky');
  const [effect, setEffect] = useState('standard');
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    outcome: keyof typeof OUTCOME_LABEL;
    results: number[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roll = async () => {
    const userId = user?.id;
    if (!userId) return;
    const rating = isAction ? (actions!.find(a => a.name === action)?.rating ?? 0) : fortune;
    const { count, zeroDice } = isAction
      ? diceForRating(rating)
      : { count: Math.max(fortune, 1), zeroDice: false };
    const results = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
    setRolling(true);
    const r = await getRepositories().rolls.create(userId, {
      gameId,
      characterId,
      kind: isAction ? 'action' : 'fortune',
      label: isAction ? action : 'Fortune',
      dice: count,
      results,
      zeroDice,
      position: isAction ? position : undefined,
      effect: isAction ? effect : undefined,
    });
    setRolling(false);
    if (!r.success) {
      setError(r.error?.message ?? 'Roll failed.');
      return;
    }
    setError(null);
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
        {isAction ? (
          <>
            <select
              aria-label='Action'
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
              aria-label='Position'
              className={sel}
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value='controlled'>Controlled</option>
              <option value='risky'>Risky</option>
              <option value='desperate'>Desperate</option>
            </select>
            <select
              aria-label='Effect'
              className={sel}
              value={effect}
              onChange={e => setEffect(e.target.value)}
            >
              <option value='limited'>Limited</option>
              <option value='standard'>Standard</option>
              <option value='great'>Great</option>
            </select>
          </>
        ) : (
          <select
            aria-label='Fortune dice'
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
        <Button variant='ember' onClick={roll} loading={rolling}>
          Roll
        </Button>
      </Stack>
      {last && (
        <Stack direction='row' gap='sm' align='center'>
          <Badge variant={OUTCOME_VARIANT[last.outcome]}>{OUTCOME_LABEL[last.outcome]}</Badge>
          <Text variant='muted' size='sm'>
            [{last.results.join(', ')}]
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
