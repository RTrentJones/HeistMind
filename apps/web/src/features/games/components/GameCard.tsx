'use client';

import Link from 'next/link';
import type { Game } from '@heist-mind/core';
import { Badge, Button, Card, Heading, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';
import { gameStateLabel } from '@/features/rolls/lib/labels';

/**
 * One campaign as a list row: name/description, the viewer's role badge (single source of the
 * gm→ember / player→steel mapping), state badge, and an open link. Used by the campaigns page and
 * the dashboard (which duplicated this card — and the role mapping — before).
 */
export function GameCard({ game, role }: { game: Game; role: 'gm' | 'player' }) {
  const { t } = useTranslation();
  return (
    <Card variant='outline'>
      <Stack direction='row' justify='between' align='center' className='flex-wrap'>
        <div>
          <Heading level='h3'>{game.name}</Heading>
          {game.description && (
            <Text variant='muted' size='sm'>
              {game.description}
            </Text>
          )}
        </div>
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          {/* Brand, not ember: the crimson GM badge read as an error state (UX r3). */}
          <Badge variant={role === 'gm' ? 'default' : 'steel'}>
            {role === 'gm' ? t('pages.gamesList.gmBadge') : t('pages.gamesList.playerBadge')}
          </Badge>
          <Tooltip variant='dark' size='lg' content={t('pages.gamesList.stateLegend')}>
            <span tabIndex={0} className='cursor-help'>
              <Badge variant='outline'>{gameStateLabel(game.state, t)}</Badge>
            </span>
          </Tooltip>
          <Button asChild variant='outline' size='sm'>
            <Link href={`/games/${game.id}`}>{t('pages.gamesList.open')}</Link>
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
