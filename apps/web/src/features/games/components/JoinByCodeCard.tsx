'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Heading, Input, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import {
  joinFailureReason,
  normalizeJoinCode,
  useJoinViaCode,
} from '@/features/invitations/data/mutations';
import { usePageTranslation } from '@/lib/i18n/hooks';

/**
 * Redeem a GM's join code and jump into the campaign (the multiplayer front door, F2). Codes are
 * case-insensitive and pasted invite links work too (F94); failures say WHY (revoked, used up…).
 */
export function JoinByCodeCard() {
  const { user } = useAuth();
  const { t } = usePageTranslation();
  const router = useRouter();
  const join = useJoinViaCode();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const onJoin = async () => {
    const userId = user?.id;
    // A pasted invite link (…/join/ABCD2345) works as well as the bare code.
    const inviteCode = normalizeJoinCode(code.split('/join/').pop() ?? code);
    if (!userId || !inviteCode) return;
    setJoinError(null);
    try {
      const member = await join.mutateAsync({ userId, inviteCode });
      setCode('');
      router.push(`/games/${member.gameId}`);
    } catch (err) {
      setJoinError(t(`join.errors.${joinFailureReason(err)}`));
    }
  };

  return (
    <Card variant='outline' id='join'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3' as='h2'>
          {t('gamesList.joinTitle')}
        </Heading>
        {/* A real form: Enter submits (review item 11). */}
        <form
          onSubmit={e => {
            e.preventDefault();
            void onJoin();
          }}
        >
          <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
            <Input
              label={t('gamesList.codeLabel')}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t('gamesList.joinPlaceholder')}
              autoCapitalize='characters'
              autoComplete='off'
              spellCheck={false}
            />
            <Button
              type='submit'
              variant='default'
              loading={join.isPending}
              disabled={!code.trim()}
            >
              {t('gamesList.joinCta')}
            </Button>
          </Stack>
        </form>
        {joinError && (
          <Text variant='error' size='sm' role='alert'>
            {joinError}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
