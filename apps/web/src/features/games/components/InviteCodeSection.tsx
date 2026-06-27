'use client';

import { useEffect, useState } from 'react';
import type { Invitation } from '@heist-mind/database';
import { Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useComponentTranslation } from '@/lib/i18n/hooks';

/** GM-only: generate + share public join codes for a campaign. Players redeem them on /games. */
export function InviteCodeSection({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const { t } = useComponentTranslation();
  const [codes, setCodes] = useState<Invitation[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    getRepositories()
      .invitations.findByGame(gameId)
      .then(result => {
        if (result.success) {
          setCodes(result.data.filter(inv => inv.inviteCode && inv.status === 'pending'));
        }
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const create = async () => {
    const userId = user?.id;
    if (!userId) return;
    setCreating(true);
    setError(null);
    const result = await getRepositories().invitations.create(userId, { gameId, maxUses: 20 });
    setCreating(false);
    if (result.success) load();
    else setError(t('inviteSection.generateFailed'));
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
          loading={creating}
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
