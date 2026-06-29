'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Ruleset } from '@heist-mind/database';
import { Button, ErrorDisplay, Input, LoadingSpinner, Select, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/** Create a campaign from one of the GM's rulesets. */
export function GameForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const preselect = useSearchParams().get('ruleset') ?? '';

  const [rulesets, setRulesets] = useState<Ruleset[] | null>(null);
  const [rulesetId, setRulesetId] = useState(preselect);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    getRepositories()
      .rulesets.findByCreator(userId)
      .then(result => {
        if (!active) return;
        if (!result.success) {
          setError(result.error?.message ?? t('forms.gameForm.loadRulesetsFailed'));
          return;
        }
        setRulesets(result.data);
        setRulesetId(prev => prev || (result.data[0]?.id ?? ''));
      });
    return () => {
      active = false;
    };
  }, [user?.id, t]);

  const onSubmit = async () => {
    setError(null);
    const userId = user?.id;
    if (!userId) return setError(t('forms.gameForm.signInRequired'));
    if (!rulesetId) return setError(t('forms.gameForm.pickRuleset'));
    if (!name.trim()) return setError(t('forms.gameForm.nameRequired'));

    setSubmitting(true);
    const created = await getRepositories().games.create(userId, {
      rulesetId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!created.success) {
      // A game name is unique per creator; translate the raw constraint error to a clear prompt.
      const raw = created.error?.message ?? '';
      const duplicate =
        created.error?.code === '23505' || /duplicate|already exists|unique/i.test(raw);
      setError(
        duplicate
          ? t('forms.gameForm.duplicate', { name: name.trim() })
          : raw || t('forms.gameForm.createFailed')
      );
      return;
    }
    router.push(`/games/${created.data.id}`);
  };

  if (rulesets === null) return <LoadingSpinner />;
  if (rulesets.length === 0) {
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

      <Button variant='ember' onClick={onSubmit} loading={submitting}>
        {t('forms.gameForm.createCta')}
      </Button>
    </Stack>
  );
}
