'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Container, Heading, LoadingSpinner, Stack, Text } from '@heist-mind/ui';
import { ClickwrapNotice } from '@/features/auth/components/ClickwrapNotice';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { useAuth, useAuthPending, useAuthStore } from '@/features/auth/stores/auth-store';
import {
  joinFailureReason,
  normalizeJoinCode,
  useJoinViaCode,
  type JoinFailure,
} from '@/features/invitations/data/mutations';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { useNotificationStore } from '@/shared/stores/notification-store';

/** The join-code shape we hand out (8 of the unambiguous alphabet); anything else can't exist. */
const CODE_SHAPE = /^[A-Z0-9]{4,32}$/;

/**
 * The invite-link landing (F94). Signed OUT: what this is + a Discord sign-in that RETURNS here
 * (the `next` intent survives OAuth). Signed IN: redeem once, then land on the campaign hub — or
 * a specific, actionable error (not found / revoked / expired / used up / removed).
 */
export function JoinInvite({ rawCode }: { rawCode: string }) {
  const code = normalizeJoinCode(rawCode);
  const { t } = usePageTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  // F98: a browser that looks signed in waits for the session check rather than flash the
  // signed-out invite card.
  const pending = useAuthPending();
  const { signIn, isSigningIn } = useSignIn();
  const join = useJoinViaCode();
  const [failure, setFailure] = useState<JoinFailure | null>(null);
  const attempted = useRef(false);

  const redeem = async () => {
    const userId = user?.id;
    if (!userId) return;
    setFailure(null);
    if (!CODE_SHAPE.test(code)) {
      setFailure('notFound');
      return;
    }
    try {
      const member = await join.mutateAsync({ userId, inviteCode: code });
      useNotificationStore.getState().success(t('join.joinedToast'));
      // `?joined=1` → the hub's one-time "You're in" banner (the toast is gone by the time it settles).
      router.replace(`/games/${member.gameId}?joined=1`);
    } catch (err) {
      setFailure(joinFailureReason(err));
    }
  };

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user?.id || attempted.current) return;
    attempted.current = true;
    void redeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redeem once per mount, on sign-in
  }, [hasHydrated, isAuthenticated, user?.id]);

  if (pending) {
    return (
      <Container maxWidth='md' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }

  // A link whose code can't exist says so up front — signed in or out — instead of inviting the
  // visitor to sign in first and only failing afterwards.
  if (!CODE_SHAPE.test(code)) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Card variant='outline' data-testid='join-invalid'>
          <Stack direction='column' gap='md' align='start'>
            <Heading level='h2' as='h1' variant='primary'>
              {t('join.invalidTitle')}
            </Heading>
            <Text>{t('join.invalidBody')}</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              <Button asChild variant='default'>
                <Link href='/games#join'>{t('join.enterCode')}</Link>
              </Button>
              <Button asChild variant='ghost'>
                <Link href='/'>{t('join.backHome')}</Link>
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Card variant='outline'>
          <Stack direction='column' gap='md' align='start'>
            <Heading level='h2' as='h1' variant='primary'>
              {t('join.invitedTitle')}
            </Heading>
            <Text>{t('join.invitedBody')}</Text>
            <Text variant='muted' size='sm'>
              {t('join.codeLabel')}{' '}
              <code className='rounded bg-background-tertiary px-2 py-0.5 font-mono tracking-widest'>
                {code}
              </code>
            </Text>
            <Button
              variant='default'
              onClick={() => void signIn({ next: `/join/${encodeURIComponent(code)}` })}
              loading={isSigningIn}
            >
              {t('join.signInCta')}
            </Button>
            <ClickwrapNotice />
            <Text variant='muted' size='sm'>
              {t('join.whatIs')}{' '}
              <Link href='/' className='underline'>
                {t('join.learnMore')}
              </Link>
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (failure) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Card variant='outline'>
          <Stack direction='column' gap='md' align='start'>
            <Heading level='h2' as='h1' variant='primary'>
              {t('join.failedTitle')}
            </Heading>
            <Text role='alert' data-testid='join-error' data-reason={failure}>
              {t(`join.errors.${failure}`)}
            </Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {failure === 'generic' && (
                <Button variant='default' onClick={() => void redeem()} loading={join.isPending}>
                  {t('join.retry')}
                </Button>
              )}
              {/* A removed member can't rejoin with any code — don't offer that dead end. */}
              {failure !== 'removed' && (
                <Button asChild variant='outline'>
                  <Link href='/games#join'>{t('join.enterCode')}</Link>
                </Button>
              )}
              <Button asChild variant='ghost'>
                <Link href='/'>{t('join.backHome')}</Link>
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth='md' padding='lg'>
      <Stack direction='column' gap='md' align='center' role='status'>
        <LoadingSpinner />
        <Heading level='h2' as='h1' variant='primary'>
          {t('join.joining')}
        </Heading>
      </Stack>
    </Container>
  );
}
