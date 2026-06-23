'use client';

import { useEffect, useState } from 'react';
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

export default function RulesetsPage() {
  const { user, isAuthenticated } = useAuth();
  const [rulesets, setRulesets] = useState<Ruleset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    getRepositories()
      .rulesets.findByCreator(userId)
      .then(result => {
        if (!active) return;
        if (!result.success) setError(result.error?.message ?? 'Failed to load rulesets');
        else setRulesets(result.data);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

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
          <Button asChild variant='ember'>
            <Link href='/rulesets/new'>Upload ruleset</Link>
          </Button>
        </Stack>

        {error && <ErrorDisplay title="Couldn't load rulesets" message={error} />}

        {rulesets === null ? (
          <LoadingSpinner />
        ) : rulesets.length === 0 ? (
          <Text variant='muted'>No rulesets yet. Upload one to get started.</Text>
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
