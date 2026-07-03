'use client';

// 404 surface (client so it shares the i18n hooks + DS like every other page).
import Link from 'next/link';
import { Button, Card, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Container maxWidth='md' padding='lg'>
      <Card variant='outline'>
        <Stack direction='column' gap='md' align='start'>
          <Heading level='h2' variant='primary'>
            {t('errors.notFoundTitle')}
          </Heading>
          <Text variant='muted'>{t('errors.notFound')}</Text>
          <Button asChild variant='ember'>
            <Link href='/'>{t('errors.backHome')}</Link>
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
