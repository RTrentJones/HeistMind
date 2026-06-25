'use client';

import { useState } from 'react';
import { Button, Stack, Text } from '@heist-mind/ui';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

/**
 * One-click "load the built-in starter ruleset". Creates a copy owned by the signed-in GM via
 * the same `rulesets.create` path as the uploader, so it satisfies RLS and shows up in their
 * list. If they already have it (UNIQUE name+creator), this REFRESHES that copy's content to the
 * latest bundle — otherwise a starter loaded before a content update (e.g. crew/factions/ability
 * rules) would stay frozen and those pickers would be empty.
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
    const repos = getRepositories();
    const created = await repos.rulesets.create(userId, {
      name: DEFAULT_RULESET.metadata.name,
      version: DEFAULT_RULESET.metadata.version,
      description: DEFAULT_RULESET.metadata.description,
      content: DEFAULT_RULESET,
    });

    if (created.success) {
      setLoading(false);
      onLoaded?.();
      return;
    }

    const raw = created.error?.message ?? '';
    const duplicate =
      created.error?.code === '23505' || /duplicate|already exists|unique/i.test(raw);

    // Already have it → refresh that copy's content to the latest bundle, so a starter loaded
    // before a content update picks up the new mechanics (crew, factions, ability rules, …).
    if (duplicate) {
      const mine = await repos.rulesets.findByCreator(userId);
      const existing = mine.success
        ? mine.data.find(r => r.name === DEFAULT_RULESET.metadata.name)
        : undefined;
      if (existing) {
        const updated = await repos.rulesets.update(existing.id, userId, {
          version: DEFAULT_RULESET.metadata.version,
          description: DEFAULT_RULESET.metadata.description,
          content: DEFAULT_RULESET,
        });
        setLoading(false);
        if (updated.success) {
          setMessage(
            `Refreshed your “${DEFAULT_RULESET.metadata.name}” starter to the latest content.`
          );
          onLoaded?.();
        } else {
          setMessage(updated.error?.message ?? 'Failed to refresh the starter ruleset.');
        }
        return;
      }
    }

    setLoading(false);
    setMessage(raw || 'Failed to load the starter ruleset.');
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
