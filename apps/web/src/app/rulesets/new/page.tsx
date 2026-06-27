'use client';

import { useRouter } from 'next/navigation';
import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { RulesetUpload } from '@/features/rulesets/components/RulesetUpload';
import { LoadDefaultRulesetButton } from '@/features/rulesets/components/LoadDefaultRulesetButton';
import { usePageTranslation } from '@/lib/i18n/hooks';

export default function NewRulesetPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { t } = usePageTranslation();

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {t('uploadRuleset.title')}
          </Heading>
          <Text variant='muted'>{t('uploadRuleset.subtitle')}</Text>
        </Stack>
        {isAuthenticated ? (
          <Stack direction='column' gap='lg'>
            <RulesetUpload />
            <Stack direction='column' gap='xs' align='start'>
              <Text variant='muted' size='sm'>
                {t('uploadRuleset.starterPrompt')}
              </Text>
              <LoadDefaultRulesetButton
                variant='outline'
                onLoaded={() => router.push('/rulesets')}
              />
            </Stack>
          </Stack>
        ) : (
          <Text variant='muted'>{t('uploadRuleset.authPrompt')}</Text>
        )}
      </Stack>
    </Container>
  );
}
