'use client';

// The App Router error boundary for every route below the root layout: a render/data throw lands
// here instead of blanking the tree. Reported through the telemetry seam; the copy offers a retry
// (Next re-renders the segment via `reset`).
import { useEffect } from 'react';
import { captureError } from '@heist-mind/telemetry';
import { Button, Card, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    captureError(error, { 'error.digest': error.digest, 'error.surface': 'route' });
  }, [error]);

  return (
    <Container maxWidth='md' padding='lg'>
      <Card variant='outline'>
        <Stack direction='column' gap='md' align='start'>
          <Heading level='h2' variant='primary'>
            {t('errors.boundary.title')}
          </Heading>
          <Text variant='muted'>{t('errors.boundary.fallback')}</Text>
          <Button variant='ember' onClick={reset}>
            {t('errors.boundary.tryAgain')}
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
