'use client';

import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { RulesetUpload } from '@/features/rulesets/components/RulesetUpload';

export default function NewRulesetPage() {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            Upload a Ruleset
          </Heading>
          <Text variant='muted'>Import a Forged-in-the-Dark ruleset as JSON.</Text>
        </Stack>
        {isAuthenticated ? (
          <RulesetUpload />
        ) : (
          <Text variant='muted'>Please sign in to upload a ruleset.</Text>
        )}
      </Stack>
    </Container>
  );
}
