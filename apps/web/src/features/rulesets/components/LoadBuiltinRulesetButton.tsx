'use client';

import { useState } from 'react';
import { Button, Stack, Text } from '@heist-mind/ui';
import { BUILTIN_RULESETS, type BuiltinRuleset } from '@heist-mind/shared';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * One-click "add a built-in ruleset to my rulesets". Creates a copy owned by the signed-in GM via
 * the same `rulesets.create` path as the uploader, so it satisfies RLS and shows up in their list.
 * If they already have it (UNIQUE name+creator), this REFRESHES that copy's content to the latest
 * bundle — otherwise a ruleset loaded before a content update (e.g. crew/factions/ability rules)
 * would stay frozen and those pickers would be empty.
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { content } = builtin;

  const onClick = async () => {
    const userId = user?.id;
    if (!userId) {
      setMessage(t('components.builtinRuleset.signInRequired'));
      return;
    }
    setMessage(null);
    setLoading(true);
    const repos = getRepositories();
    const created = await repos.rulesets.create(userId, {
      name: content.metadata.name,
      version: content.metadata.version,
      description: content.metadata.description,
      content,
    });

    if (created.success) {
      setLoading(false);
      onLoaded?.();
      return;
    }

    const raw = created.error?.message ?? '';
    const duplicate =
      created.error?.code === '23505' || /duplicate|already exists|unique/i.test(raw);

    // Already have it → refresh that copy's content to the latest bundle, so a ruleset loaded
    // before a content update picks up the new mechanics (crew, factions, ability rules, …).
    if (duplicate) {
      const mine = await repos.rulesets.findByCreator(userId);
      const existing = mine.success
        ? mine.data.find(r => r.name === content.metadata.name)
        : undefined;
      if (existing) {
        const updated = await repos.rulesets.update(existing.id, userId, {
          version: content.metadata.version,
          description: content.metadata.description,
          content,
        });
        setLoading(false);
        if (updated.success) {
          setMessage(t('components.builtinRuleset.refreshed', { name: content.metadata.name }));
          onLoaded?.();
        } else {
          setMessage(updated.error?.message ?? t('components.builtinRuleset.refreshFailed'));
        }
        return;
      }
    }

    setLoading(false);
    setMessage(raw || t('components.builtinRuleset.addFailed'));
  };

  return (
    <Stack direction='column' gap='xs' align='start'>
      <Button
        variant={variant}
        onClick={onClick}
        loading={loading}
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
