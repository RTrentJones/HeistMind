'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useInvitesByGame } from '@/features/invitations/data/queries';
import { useCreateInviteCode } from '@/features/invitations/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';

/** GM-only: generate + share public join codes for a campaign. Players redeem them on /games. */
export function InviteCodeSection({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const { t } = useComponentTranslation();
  const invites = useInvitesByGame(gameId);
  const createInvite = useCreateInviteCode(gameId);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const codes = useMemo(
    () => (invites.data ?? []).filter(inv => inv.inviteCode && inv.status === 'pending'),
    [invites.data]
  );

  const create = () => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    createInvite.mutate(
      { userId },
      { onError: () => setError(t('inviteSection.generateFailed')) }
    );
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — the code is still shown to copy by hand.
    }
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3'>{t('inviteSection.title')}</Heading>
        <Text variant='muted' size='sm'>
          {t('inviteSection.description')}
        </Text>

        {codes.length === 0 ? (
          <Text variant='muted' size='sm'>
            {t('inviteSection.noCodes')}
          </Text>
        ) : (
          <Stack direction='column' gap='xs'>
            {codes.map(inv => {
              const codeValue = inv.inviteCode ?? '';
              return (
                <Stack key={inv.id} direction='row' gap='sm' align='center'>
                  <code className='rounded bg-background-tertiary px-2 py-1 font-mono tracking-widest'>
                    {codeValue}
                  </code>
                  <Button variant='ghost' size='sm' onClick={() => copy(codeValue)}>
                    {copied === codeValue ? t('inviteSection.copied') : t('inviteSection.copy')}
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        )}

        <Button
          variant='outline'
          size='sm'
          onClick={create}
          loading={createInvite.isPending}
          className='self-start'
        >
          {t('inviteSection.generate')}
        </Button>
        {error && (
          <Text variant='muted' size='sm' className='text-semantic-error'>
            {error}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
