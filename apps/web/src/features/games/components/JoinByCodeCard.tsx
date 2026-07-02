'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Heading, Input, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useJoinViaCode } from '@/features/invitations/data/mutations';
import { usePageTranslation } from '@/lib/i18n/hooks';

/** Redeem a GM's invite code and jump into the campaign (the multiplayer front door, F2). */
export function JoinByCodeCard() {
  const { user } = useAuth();
  const { t } = usePageTranslation();
  const router = useRouter();
  const join = useJoinViaCode();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const onJoin = async () => {
    const userId = user?.id;
    if (!userId || !code.trim()) return;
    setJoinError(null);
    try {
      const member = await join.mutateAsync({ userId, inviteCode: code.trim() });
      setCode('');
      router.push(`/games/${member.gameId}`);
    } catch {
      setJoinError(t('gamesList.joinFailed'));
    }
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3'>{t('gamesList.joinTitle')}</Heading>
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Input
            label={t('gamesList.codeLabel')}
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={t('gamesList.joinPlaceholder')}
          />
          <Button
            variant='default'
            onClick={() => void onJoin()}
            loading={join.isPending}
            disabled={!code.trim()}
          >
            {t('gamesList.joinCta')}
          </Button>
        </Stack>
        {joinError && (
          <Text variant='muted' size='sm' className='text-semantic-error'>
            {joinError}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
