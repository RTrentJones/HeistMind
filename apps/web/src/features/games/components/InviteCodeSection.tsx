'use client';

import { useMemo, useState } from 'react';
import type { CampaignCapacity } from '@heist-mind/core';
import { Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useInvitesByGame } from '@/features/invitations/data/queries';
import { useCreateInviteCode, useRevokeInviteCode } from '@/features/invitations/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { QueryError, QueryLoading } from '@/shared/components/QueryStates';
import { seatSummary } from './PlayerLimitControl';

/**
 * GM-only: create, share and revoke a campaign's join codes. Each code is shareable two ways — the
 * bare code (typed on /games) or an invite LINK (/join/<code>) that also survives sign-in (F94).
 * Shows uses left; revoking is a two-click confirm and stops the code working immediately.
 */
const COPY_FLASH_MS = 1500;

export function joinLinkFor(origin: string, code: string): string {
  return `${origin}/join/${encodeURIComponent(code)}`;
}

export function InviteCodeSection({
  gameId,
  capacity,
}: {
  gameId: string;
  /** Seats taken / open (round 4): a code only lets someone in while a player seat is open. */
  capacity?: CampaignCapacity;
}) {
  const { user } = useAuth();
  const { t } = useComponentTranslation();
  const invites = useInvitesByGame(gameId);
  const createInvite = useCreateInviteCode(gameId);
  const revokeInvite = useRevokeInviteCode(gameId);
  const [error, setError] = useState<string | null>(null);
  // Which copy button last succeeded: `${inviteId}:code` | `${inviteId}:link`.
  const [copied, setCopied] = useState<string | null>(null);

  const codes = useMemo(
    () => (invites.data ?? []).filter(inv => inv.inviteCode && inv.status === 'pending'),
    [invites.data]
  );

  const create = () => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    createInvite.mutate({ userId }, { onError: () => setError(t('inviteSection.generateFailed')) });
  };

  const revoke = (invitationId: string) => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    revokeInvite.mutate(
      { invitationId, userId },
      { onError: () => setError(t('inviteSection.revokeFailed')) }
    );
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), COPY_FLASH_MS);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — say so; the code is still shown to
      // copy by hand.
      setError(t('asyncState.clipboardFailed'));
    }
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3' as='h2'>
          {t('inviteSection.title')}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('inviteSection.description')}
        </Text>
        {capacity && (
          // The error TEXT token (-fg), not the fill: the fill failed dark-mode contrast (F102).
          <Text variant={capacity.full ? 'error' : 'muted'} size='sm' data-testid='invite-seats'>
            {capacity.full
              ? t('inviteSection.seatsFull', { summary: seatSummary(t, capacity, false) })
              : t('inviteSection.seatsOpen', {
                  summary: seatSummary(t, capacity, false),
                  open: capacity.open,
                })}
          </Text>
        )}

        {invites.isPending ? (
          <QueryLoading />
        ) : invites.isError ? (
          <QueryError
            title={t('asyncState.invitesLoadFailed')}
            message={invites.error.message}
            onRetry={() => void invites.refetch()}
          />
        ) : codes.length === 0 ? (
          <Text variant='muted' size='sm'>
            {t('inviteSection.noCodes')}
          </Text>
        ) : (
          <ul className='flex flex-col gap-2' aria-label={t('inviteSection.listLabel')}>
            {codes.map(inv => {
              const codeValue = inv.inviteCode ?? '';
              const usesLeft = Math.max(0, (inv.maxUses ?? 1) - (inv.usedCount ?? 0));
              const link =
                typeof window === 'undefined' ? '' : joinLinkFor(window.location.origin, codeValue);
              return (
                <li key={inv.id} data-testid='join-code-row' className='flex flex-col gap-2'>
                  {/* Row 1: the code + uses. Then the actions: on phones a full-width "Copy
                      invite link" over an even Copy code / Revoke pair (the old single wrapping
                      row left "Revoke" alone on a line like a stray link); one row from `sm`. */}
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <code className='rounded bg-background-tertiary px-2 py-1 font-mono tracking-widest'>
                      {codeValue}
                    </code>
                    <Text as='span' variant='muted' size='sm'>
                      {t('inviteSection.usesLeft', { count: usesLeft, max: inv.maxUses ?? 1 })}
                    </Text>
                  </div>
                  <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='max-sm:col-span-2'
                      onClick={() => void copy(link, `${inv.id}:link`)}
                    >
                      {copied === `${inv.id}:link`
                        ? t('inviteSection.copied')
                        : t('inviteSection.copyLink')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => void copy(codeValue, `${inv.id}:code`)}
                    >
                      {copied === `${inv.id}:code`
                        ? t('inviteSection.copied')
                        : t('inviteSection.copy')}
                    </Button>
                    <ConfirmButton
                      size='sm'
                      variant='danger-ghost'
                      confirmLabel={t('inviteSection.confirmRevoke')}
                      reserveWidth
                      loading={
                        revokeInvite.isPending && revokeInvite.variables?.invitationId === inv.id
                      }
                      aria-label={t('inviteSection.revokeAria', { code: codeValue })}
                      onConfirm={() => revoke(inv.id)}
                    >
                      {t('inviteSection.revoke')}
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
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
          <Text variant='error' size='sm' role='alert'>
            {error}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
