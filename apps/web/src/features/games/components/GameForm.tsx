'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Ruleset } from '@heist-mind/database';
import { Button, ErrorDisplay, Input, LoadingSpinner, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

/** Create a campaign from one of the GM's rulesets. */
export function GameForm() {
  const router = useRouter();
  const { user } = useAuth();
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
          setError(result.error?.message ?? 'Failed to load rulesets');
          return;
        }
        setRulesets(result.data);
        setRulesetId(prev => prev || (result.data[0]?.id ?? ''));
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const onSubmit = async () => {
    setError(null);
    const userId = user?.id;
    if (!userId) return setError('You must be signed in.');
    if (!rulesetId) return setError('Pick a ruleset first.');
    if (!name.trim()) return setError('Give your campaign a name.');

    setSubmitting(true);
    const created = await getRepositories().games.create(userId, {
      rulesetId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!created.success) {
      setError(created.error?.message ?? 'Failed to create campaign');
      return;
    }
    router.push(`/games/${created.data.id}`);
  };

  if (rulesets === null) return <LoadingSpinner />;
  if (rulesets.length === 0) {
    return <Text variant='muted'>Upload a ruleset first, then create a campaign.</Text>;
  }

  return (
    <Stack direction='column' gap='md'>
      <Input
        label='Campaign name'
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder='e.g. The Lampblack Job'
      />
      <Input
        label='Description'
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder='Optional'
      />
      <div>
        <label htmlFor='ruleset-select' className='mb-2 block text-foreground-secondary'>
          Ruleset
        </label>
        <select
          id='ruleset-select'
          aria-label='Ruleset'
          value={rulesetId}
          onChange={e => setRulesetId(e.target.value)}
          className='w-full rounded-lg border border-border-primary bg-background-tertiary px-3 py-2 text-foreground-primary'
        >
          {rulesets.map(rs => (
            <option key={rs.id} value={rs.id}>
              {rs.name} (v{rs.version})
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorDisplay title="Couldn't create campaign" message={error} />}

      <Button variant='ember' onClick={onSubmit} loading={submitting}>
        Create campaign
      </Button>
    </Stack>
  );
}
