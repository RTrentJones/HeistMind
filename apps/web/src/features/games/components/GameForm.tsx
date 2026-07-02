'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ErrorDisplay, Input, LoadingSpinner, Select, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCreateGame } from '@/features/games/data/mutations';
import { useRulesetsByCreator } from '@/features/rulesets/data/queries';
import { errorCode, errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/** Create a campaign from one of the GM's rulesets. */
export function GameForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const preselect = useSearchParams().get('ruleset') ?? '';

  const rulesetsQuery = useRulesetsByCreator(user?.id);
  const rulesets = rulesetsQuery.data ?? null;
  const createGame = useCreateGame();
  const [rulesetId, setRulesetId] = useState(preselect);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Default the picker to the first ruleset once loaded (unless a ?ruleset= preselect or a prior pick).
  useEffect(() => {
    setRulesetId(prev => prev || (rulesets?.[0]?.id ?? ''));
  }, [rulesets]);

  const onSubmit = async () => {
    setError(null);
    const userId = user?.id;
    if (!userId) return setError(t('forms.gameForm.signInRequired'));
    if (!rulesetId) return setError(t('forms.gameForm.pickRuleset'));
    if (!name.trim()) return setError(t('forms.gameForm.nameRequired'));

    try {
      const created = await createGame.mutateAsync({
        userId,
        data: { rulesetId, name: name.trim(), description: description.trim() || undefined },
      });
      router.push(`/games/${created.id}`);
    } catch (err) {
      // A game name is unique per creator; translate the raw constraint error to a clear prompt.
      const raw = errorMessage(err);
      const duplicate = errorCode(err) === '23505' || /duplicate|already exists|unique/i.test(raw);
      setError(
        duplicate
          ? t('forms.gameForm.duplicate', { name: name.trim() })
          : raw || t('forms.gameForm.createFailed')
      );
    }
  };

  if (rulesetsQuery.isLoading) return <LoadingSpinner />;
  if (rulesetsQuery.isError) {
    return (
      <ErrorDisplay
        title={t('forms.gameForm.errorTitle')}
        message={rulesetsQuery.error?.message ?? t('forms.gameForm.loadRulesetsFailed')}
      />
    );
  }
  if (!rulesets || rulesets.length === 0) {
    return <Text variant='muted'>{t('forms.gameForm.needRuleset')}</Text>;
  }

  return (
    <Stack direction='column' gap='md'>
      <Input
        label={t('forms.gameForm.nameLabel')}
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t('forms.gameForm.namePlaceholder')}
      />
      <Input
        label={t('forms.gameForm.descriptionLabel')}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder={t('forms.gameForm.descriptionPlaceholder')}
      />
      <Select
        label={t('forms.gameForm.rulesetLabel')}
        value={rulesetId}
        onChange={e => setRulesetId(e.target.value)}
        className='w-full rounded-lg bg-background-tertiary px-3 py-2'
      >
        {rulesets.map(rs => (
          <option key={rs.id} value={rs.id}>
            {t('forms.gameForm.rulesetOption', { name: rs.name, version: rs.version })}
          </option>
        ))}
      </Select>

      {error && <ErrorDisplay title={t('forms.gameForm.errorTitle')} message={error} />}

      <Button variant='ember' onClick={onSubmit} loading={createGame.isPending}>
        {t('forms.gameForm.createCta')}
      </Button>
    </Stack>
  );
}
