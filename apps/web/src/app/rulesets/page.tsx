'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Ruleset } from '@heist-mind/database';
import {
  Button,
  Card,
  Container,
  ErrorDisplay,
  Heading,
  LoadingSpinner,
  Stack,
  Text,
} from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { LoadDefaultRulesetButton } from '@/features/rulesets/components/LoadDefaultRulesetButton';

export default function RulesetsPage() {
  const { user, isAuthenticated } = useAuth();
  const [rulesets, setRulesets] = useState<Ruleset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRulesets = useCallback(() => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    getRepositories()
      .rulesets.findByCreator(userId)
      .then(result => {
        if (!result.success) setError(result.error?.message ?? 'Failed to load rulesets');
        else setRulesets(result.data);
      });
  }, [user?.id]);

  useEffect(() => {
    loadRulesets();
  }, [loadRulesets]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>Please sign in to view your rulesets.</Text>
      </Container>
    );
  }

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='row' justify='between' align='center'>
          <Heading level='h1' variant='hero'>
            Rulesets
          </Heading>
          <Stack direction='row' gap='sm' align='center'>
            {/* Only in the header when the list is non-empty — the empty state has its own,
                so the two don't show at once. */}
            {rulesets !== null && rulesets.length > 0 && (
              <LoadDefaultRulesetButton variant='outline' onLoaded={loadRulesets} />
            )}
            <Button asChild variant='ember'>
              <Link href='/rulesets/new'>Upload ruleset</Link>
            </Button>
          </Stack>
        </Stack>

        {error && <ErrorDisplay title="Couldn't load rulesets" message={error} />}

        {rulesets === null ? (
          <LoadingSpinner />
        ) : rulesets.length === 0 ? (
          <Stack direction='column' gap='sm' align='start'>
            <Text variant='muted'>
              No rulesets yet. New here? Load the built-in starter ruleset to start playing right
              away, or upload your own.
            </Text>
            <LoadDefaultRulesetButton onLoaded={loadRulesets} />
          </Stack>
        ) : (
          <Stack direction='column' gap='md'>
            {rulesets.map(rs => (
              <Card key={rs.id} variant='outline'>
                <Stack direction='row' justify='between' align='center'>
                  <div>
                    <Heading level='h3'>{rs.name}</Heading>
                    <Text variant='muted' size='sm'>
                      v{rs.version}
                      {rs.content?.metadata?.system ? ` · ${rs.content.metadata.system}` : ''}
                    </Text>
                  </div>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/games/new?ruleset=${rs.id}`}>Create game</Link>
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
