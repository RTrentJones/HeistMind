'use client';

import { useRouter } from 'next/navigation';
import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { RulesetUpload } from '@/features/rulesets/components/RulesetUpload';
import { LoadDefaultRulesetButton } from '@/features/rulesets/components/LoadDefaultRulesetButton';

export default function NewRulesetPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

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
          <Stack direction='column' gap='lg'>
            <RulesetUpload />
            <Stack direction='column' gap='xs' align='start'>
              <Text variant='muted' size='sm'>
                Don&apos;t have a ruleset? Start with the built-in one:
              </Text>
              <LoadDefaultRulesetButton
                variant='outline'
                onLoaded={() => router.push('/rulesets')}
              />
            </Stack>
          </Stack>
        ) : (
          <Text variant='muted'>Please sign in to upload a ruleset.</Text>
        )}
      </Stack>
    </Container>
  );
}
