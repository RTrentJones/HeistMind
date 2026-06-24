'use client';

import { useState } from 'react';
import { Button, Stack, Text } from '@heist-mind/ui';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

/**
 * One-click "load the built-in starter ruleset". Creates a copy owned by the signed-in GM via
 * the same `rulesets.create` path as the uploader, so it satisfies RLS and shows up in their
 * list. Handles the already-loaded case (UNIQUE name+creator) gracefully.
 */
export function LoadDefaultRulesetButton({
  variant = 'ember',
  onLoaded,
}: {
  variant?: 'ember' | 'outline';
  onLoaded?: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    const userId = user?.id;
    if (!userId) {
      setMessage('You must be signed in to load the starter ruleset.');
      return;
    }
    setMessage(null);
    setLoading(true);
    const created = await getRepositories().rulesets.create(userId, {
      name: DEFAULT_RULESET.metadata.name,
      version: DEFAULT_RULESET.metadata.version,
      description: DEFAULT_RULESET.metadata.description,
      content: DEFAULT_RULESET,
    });
    setLoading(false);

    if (created.success) {
      onLoaded?.();
      return;
    }

    const raw = created.error?.message ?? '';
    const duplicate =
      created.error?.code === '23505' || /duplicate|already exists|unique/i.test(raw);
    setMessage(
      duplicate
        ? `You already have the “${DEFAULT_RULESET.metadata.name}” starter ruleset.`
        : raw || 'Failed to load the starter ruleset.'
    );
  };

  return (
    <Stack direction='column' gap='xs' align='start'>
      <Button variant={variant} onClick={onClick} loading={loading}>
        {`Load the ${DEFAULT_RULESET.metadata.name} starter ruleset`}
      </Button>
      {message && (
        <Text variant='muted' size='sm'>
          {message}
        </Text>
      )}
    </Stack>
  );
}
