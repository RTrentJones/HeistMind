'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Container, Heading, Input, Stack, Text } from '@heist-mind/ui';
import { captureError } from '@heist-mind/telemetry';
import { useAuth, useAuthActions, useAuthStore } from '@/features/auth/stores/auth-store';
import { deleteAccount } from '@/features/profiles/data/api';
import { useTranslation } from '@/lib/i18n/hooks';
import { errorMessage } from '@/lib/query/result';

/**
 * The /settings account panel: who you're signed in as, plus the danger zone. Deletion is
 * type-to-confirm (the exact confirm word gates the button) and permanent — the auth user is
 * deleted server-side and every owned row cascades. After success the local session is cleared
 * and the user lands back on the marketing home.
 */
export function AccountSettings() {
  const { user, profile } = useAuth();
  const { signOut } = useAuthActions();
  const { t } = useTranslation();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t('pages.settings.confirmWord');
  const confirmed = confirmText.trim() === confirmWord;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // The auth user is gone; clear the local session regardless of whether the sign-out
      // round-trip still succeeds against the deleted account.
      await signOut().catch(() => useAuthStore.getState().reset());
      router.push('/');
    } catch (err) {
      captureError(err, { 'error.surface': 'account.delete-ui' });
      setError(errorMessage(err) || t('pages.settings.deleteFailed'));
      setIsDeleting(false);
    }
  };

  return (
    <Container maxWidth='md' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Heading level='h1' variant='hero'>
          {t('pages.settings.title')}
        </Heading>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2' variant='primary'>
              {t('pages.settings.accountHeading')}
            </Heading>
            <Text variant='muted'>
              {t('pages.settings.signedInAs', {
                name: profile?.displayName || profile?.username || user?.email || '',
              })}
            </Text>
          </Stack>
        </Card>

        <Card variant='danger'>
          <Stack direction='column' gap='md'>
            <Heading level='h2' variant='primary'>
              {t('pages.settings.dangerHeading')}
            </Heading>
            <Text variant='muted'>{t('pages.settings.dangerBody')}</Text>
            <Input
              label={t('pages.settings.confirmLabel', { word: confirmWord })}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoComplete='off'
            />
            {error ? (
              <Text variant='muted' size='sm' className='text-semantic-error'>
                {error}
              </Text>
            ) : null}
            <div>
              <Button
                variant='destructive'
                aria-label={t('pages.settings.deleteCta')}
                disabled={!confirmed || isDeleting}
                loading={isDeleting}
                onClick={() => void handleDelete()}
              >
                {t('pages.settings.deleteCta')}
              </Button>
            </div>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
