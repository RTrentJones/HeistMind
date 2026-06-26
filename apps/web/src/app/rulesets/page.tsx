'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Ruleset } from '@heist-mind/database';
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import {
  Badge,
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
import { LoadBuiltinRulesetButton } from '@/features/rulesets/components/LoadBuiltinRulesetButton';

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
          <Button asChild variant='ember'>
            <Link href='/rulesets/new'>Upload ruleset</Link>
          </Button>
        </Stack>

        {error && <ErrorDisplay title="Couldn't load rulesets" message={error} />}

        {/* Built-in catalog — load any system with one click (creates an editable copy you own). */}
        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <div>
              <Heading level='h2'>Starter rulesets</Heading>
              <Text variant='muted' size='sm'>
                New here? Add a ready-made system to start playing right away — each one becomes an
                editable copy in your rulesets that you can reskin freely.
              </Text>
            </div>
            <Stack direction='column' gap='sm'>
              {BUILTIN_RULESETS.map(b => (
                <Card key={b.id} variant='default'>
                  <Stack
                    direction='row'
                    justify='between'
                    align='center'
                    className='flex-wrap gap-2'
                  >
                    <div className='min-w-0'>
                      <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                        <Heading level='h3'>{b.content.metadata.name}</Heading>
                        <Badge variant={b.tier === 'starter' ? 'gold' : 'steel'}>{b.tier}</Badge>
                        {b.license && <Badge variant='steel'>{b.license}</Badge>}
                      </Stack>
                      {b.blurb && (
                        <Text variant='muted' size='sm'>
                          {b.blurb}
                        </Text>
                      )}
                      {b.attribution && (
                        <Text variant='muted' size='sm' className='mt-1 italic'>
                          {b.attribution}
                        </Text>
                      )}
                    </div>
                    <LoadBuiltinRulesetButton
                      builtin={b}
                      variant='outline'
                      onLoaded={loadRulesets}
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>

        {rulesets === null ? (
          <LoadingSpinner />
        ) : rulesets.length === 0 ? (
          <Text variant='muted'>
            No rulesets of your own yet. Add a starter above, or upload your own.
          </Text>
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
