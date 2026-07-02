'use client';

import { useState } from 'react';
import { Button, Stack, Text } from '@heist-mind/ui';
import { BUILTIN_RULESETS, type BuiltinRuleset } from '@heist-mind/shared';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useLoadBuiltinRuleset } from '@/features/rulesets/data/mutations';
import { errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * One-click "add a built-in ruleset to my rulesets". Creates a copy owned by the signed-in GM via
 * the same `rulesets.create` path as the uploader, so it satisfies RLS and shows up in their list.
 * If they already have it (UNIQUE name+creator), this REFRESHES that copy's content to the latest
 * bundle — the create-or-refresh flow lives in `useLoadBuiltinRuleset`, which invalidates the
 * rulesets queries so lists refresh on their own. `onLoaded` is for genuine post-success side
 * effects (e.g. `/rulesets/new` navigates to the list), not refetching.
 */
export function LoadBuiltinRulesetButton({
  builtin,
  variant = 'ember',
  onLoaded,
}: {
  builtin: BuiltinRuleset;
  variant?: 'ember' | 'outline';
  onLoaded?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const loadBuiltin = useLoadBuiltinRuleset();
  const [message, setMessage] = useState<string | null>(null);
  const { content } = builtin;

  const onClick = async () => {
    const userId = user?.id;
    if (!userId) {
      setMessage(t('components.builtinRuleset.signInRequired'));
      return;
    }
    setMessage(null);
    try {
      const outcome = await loadBuiltin.mutateAsync({ userId, content });
      if (outcome === 'refreshed') {
        setMessage(t('components.builtinRuleset.refreshed', { name: content.metadata.name }));
      }
      onLoaded?.();
    } catch (err) {
      setMessage(errorMessage(err) || t('components.builtinRuleset.addFailed'));
    }
  };

  return (
    <Stack direction='column' gap='xs' align='start'>
      <Button
        variant={variant}
        onClick={onClick}
        loading={loadBuiltin.isPending}
        title={t('components.builtinRuleset.addTitle', { name: content.metadata.name })}
      >
        {t('components.builtinRuleset.addCta', { name: content.metadata.name })}
      </Button>
      {message && (
        <Text variant='muted' size='sm'>
          {message}
        </Text>
      )}
    </Stack>
  );
}

/** The original brackwater-starter entry, for convenience where a single default is wanted. */
export const BRACKWATER_BUILTIN =
  BUILTIN_RULESETS.find(r => r.id === 'brackwater') ?? BUILTIN_RULESETS[0]!;
