'use client';

import Link from 'next/link';
import {
  Button,
  Card,
  Container,
  ErrorDisplay,
  Grid,
  Heading,
  LoadingSpinner,
  Stack,
  Text,
} from '@heist-mind/ui';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';
import type { TranslationFunction } from '@/lib/i18n/translations';
import { CharacterCard } from '@/features/characters/components/CharacterCard';
import { GameCard } from '@/features/games/components/GameCard';
import {
  useDashboardData,
  type DashboardActivity,
  type DashboardCampaign,
} from '@/features/dashboard/hooks/use-dashboard-data';

const MAX_SHOWN = 6;

/** Coarse, locale-friendly relative time — mirrors the campaign log's feed. */
function relativeTime(date: Date, now: number, t: TranslationFunction): string {
  const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (sec < 60) return t('components.rollLog.justNow');
  const min = Math.round(sec / 60);
  if (min < 60) return t('components.rollLog.minutesAgo', { count: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return t('components.rollLog.hoursAgo', { count: hr });
  return t('components.rollLog.daysAgo', { count: Math.round(hr / 24) });
}

/**
 * The logged-in home, rendered at `/` for authenticated users (marketing `HomePage` shows when
 * logged out). The OAuth callback already redirects to `/`, so this is the natural landing after
 * sign-in. AppShell steps aside on `/`, so this component renders its own header + `<main>` landmark.
 * Surfaces the user's campaigns, their characters ("My Characters"), and a merged recent-activity feed.
 */
export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { loading, error, campaigns, characters, activity } = useDashboardData(user?.id);

  const name = user?.profile?.displayName || user?.profile?.username || user?.email || '';
  const gameNameById = new Map(campaigns.map(c => [c.game.id, c.game.name]));
  const charNameById = new Map(characters.map(c => [c.id, c.name]));
  const now = Date.now();

  const campaignCard = (c: DashboardCampaign) => (
    <GameCard key={c.game.id} game={c.game} role={c.role} />
  );

  const characterCard = (ch: (typeof characters)[number]) => (
    <CharacterCard
      key={ch.id}
      character={ch}
      meta={t('pages.dashboard.characterMeta', {
        playbook: ch.playbookType,
        campaign: ch.gameId ? (gameNameById.get(ch.gameId) ?? '') : t('pages.dashboard.standalone'),
      })}
      actions={
        <Button asChild variant='outline' size='sm'>
          {/* Standalone characters (Phase 5) open at /characters/[id]; in-campaign ones at the game route. */}
          <Link
            href={ch.gameId ? `/games/${ch.gameId}/characters/${ch.id}` : `/characters/${ch.id}`}
          >
            {t('pages.dashboard.view')}
          </Link>
        </Button>
      }
    />
  );

  const activityRow = (a: DashboardActivity) => {
    const who = a.roll.characterId
      ? (charNameById.get(a.roll.characterId) ?? '')
      : a.roll.kind === 'fortune'
        ? t('components.rollLog.fortune')
        : t('components.rollLog.gm');
    const inCampaign = t('pages.dashboard.activityIn', { campaign: a.gameName });
    const meta = who ? `${inCampaign} · ${who}` : inCampaign;
    return (
      <Card key={a.roll.id} variant='outline'>
        <Stack direction='row' justify='between' align='center' className='flex-wrap'>
          <div>
            <Stack direction='row' gap='xs' align='center' className='flex-wrap'>
              <Text as='strong' size='sm'>
                {a.roll.label ?? a.roll.kind}
              </Text>
              <Text variant='muted' size='sm'>
                {meta}
              </Text>
            </Stack>
            {a.roll.note && (
              <Text variant='muted' size='sm' className='block italic'>
                {a.roll.note}
              </Text>
            )}
          </div>
          <Text variant='muted' size='sm'>
            {relativeTime(new Date(a.roll.createdAt), now, t)}
          </Text>
        </Stack>
      </Card>
    );
  };

  return (
    <div className='min-h-screen'>
      <AuthHeader />
      <main id='main-content'>
        <Container maxWidth='4xl' padding='lg'>
          <Stack direction='column' gap='lg'>
            {/* Welcome */}
            <Stack direction='column' gap='xs'>
              <Heading level='h1' variant='hero'>
                {t('pages.dashboard.welcome', { name })}
              </Heading>
              <Text variant='muted'>{t('pages.dashboard.subtitle')}</Text>
            </Stack>

            {/* Quick actions */}
            <Stack direction='row' gap='sm' className='flex-wrap'>
              <Button asChild variant='ember'>
                <Link href='/games/new'>{t('pages.dashboard.actions.createGame')}</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/games'>{t('pages.dashboard.actions.joinGame')}</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/characters/new'>{t('pages.dashboard.newCharacter')}</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/rulesets'>{t('pages.dashboard.actions.rulesets')}</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/rulesets/new'>{t('pages.dashboard.actions.uploadRuleset')}</Link>
              </Button>
            </Stack>

            {error && <ErrorDisplay title={t('pages.gamesList.loadError')} message={error} />}

            {/* Your campaigns */}
            <Stack direction='row' justify='between' align='center'>
              <Heading level='h2' variant='primary'>
                {t('pages.dashboard.yourCampaigns')}
              </Heading>
              {campaigns.length > 0 && (
                <Button asChild variant='ghost' size='sm'>
                  <Link href='/games'>{t('pages.dashboard.viewAll')}</Link>
                </Button>
              )}
            </Stack>
            {loading ? (
              <LoadingSpinner />
            ) : campaigns.length === 0 ? (
              <Card variant='outline'>
                <Stack direction='column' gap='sm' align='start'>
                  <Text variant='muted'>{t('pages.dashboard.noCampaigns')}</Text>
                  <Button asChild variant='ember' size='sm'>
                    <Link href='/games/new'>{t('pages.dashboard.createFirstCampaign')}</Link>
                  </Button>
                </Stack>
              </Card>
            ) : (
              <Grid cols={2} gap='md'>
                {campaigns.slice(0, MAX_SHOWN).map(campaignCard)}
              </Grid>
            )}

            {/* Your characters */}
            <Stack direction='row' justify='between' align='center'>
              <Heading level='h2' variant='primary'>
                {t('pages.dashboard.yourCharacters')}
              </Heading>
              <Button asChild variant='ghost' size='sm'>
                <Link href='/characters'>{t('pages.dashboard.manageCharacters')}</Link>
              </Button>
            </Stack>
            {loading ? null : characters.length === 0 ? (
              <Card variant='outline'>
                <Stack direction='column' gap='sm' align='start'>
                  <Text variant='muted'>{t('pages.dashboard.noCharacters')}</Text>
                  <Button asChild variant='ember' size='sm'>
                    <Link href='/characters/new'>{t('pages.dashboard.newCharacter')}</Link>
                  </Button>
                </Stack>
              </Card>
            ) : (
              <Grid cols={2} gap='md'>
                {characters.slice(0, MAX_SHOWN).map(characterCard)}
              </Grid>
            )}

            {/* Recent activity */}
            <Heading level='h2' variant='primary'>
              {t('pages.dashboard.recentActivity')}
            </Heading>
            {loading ? null : activity.length === 0 ? (
              <Text variant='muted'>{t('pages.dashboard.noActivity')}</Text>
            ) : (
              <Stack direction='column' gap='sm'>
                {activity.map(activityRow)}
              </Stack>
            )}
          </Stack>
        </Container>
      </main>
    </div>
  );
}
