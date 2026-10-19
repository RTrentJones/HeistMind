'use client';

import Link from 'next/link';
import { Button, Card, Container, Grid, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { PageShell } from '@/shared/components/AppShell';
import { discordAppId } from '@/lib/discord-install';
import { DiscordInstallLinks } from '@/shared/components/DiscordInstallLinks';
import { QueryError, QueryLoading } from '@/shared/components/QueryStates';
import { entryParts } from '@/features/rolls/lib/labels';
import { playbookLabel } from '@/features/characters/lib/playbook-label';
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
 * sign-in. AppShell steps aside on `/` (marketing owns its layout), so the dashboard renders the
 * same `PageShell` chrome every inner page gets (F96 — header gap, pinned footer, skip link).
 * Surfaces the user's campaigns, their characters ("My Characters"), and a merged recent-activity feed.
 */
export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    campaigns,
    characters,
    characterNames,
    activity,
    campaignsStatus,
    charactersStatus,
    activityStatus,
  } = useDashboardData(user?.id);

  const gameNameById = new Map(campaigns.map(c => [c.game.id, c.game.name]));
  // Own characters plus every roster character an activity row mentions (P2-15: the GM's feed
  // read "Prowess in … · resisted" with no who for a player's character).
  const charNameById = new Map([
    ...Object.entries(characterNames ?? {}),
    ...characters.map(c => [c.id, c.name] as const),
  ]);
  const now = Date.now();
  // First run = both lists loaded, no errors, nothing yet. "Welcome back" is only for people who
  // have something to come back to (F94); a newcomer gets "Start here" INSTEAD of three empty
  // sections that repeated it.
  const settled = !campaignsStatus.loading && !charactersStatus.loading;
  const loaded = settled && !campaignsStatus.error && !charactersStatus.error;
  const returning = campaigns.length > 0 || characters.length > 0;
  const firstRun = loaded && !returning;
  // F96 — first run leads with Start here; the quick actions (which repeat its steps) are for
  // returning users, and wait for the lists so they never flash in and then vanish. F99 — while
  // the lists load they hold their space INVISIBLY (inert, hidden from AT) instead of being
  // inserted above the lists afterwards: the late insert shoved every section ~224px down at 360
  // (CLS 0.26). Returning users are the majority; a first-run user loses a blank band for <1s.
  const showQuickActions = !firstRun;
  const quickActionsPending = !settled;
  const hasDiscordInstall = discordAppId() !== null;

  const campaignCard = (c: DashboardCampaign) => (
    <GameCard key={c.game.id} game={c.game} role={c.role} />
  );

  const characterCard = (ch: (typeof characters)[number]) => (
    <CharacterCard
      key={ch.id}
      character={ch}
      meta={t('pages.dashboard.characterMeta', {
        playbook: playbookLabel(ch.playbookType),
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
    const parts = entryParts(
      a.roll,
      a.roll.characterId
        ? (charNameById.get(a.roll.characterId) ?? '')
        : a.roll.kind === 'fortune'
          ? t('components.rollLog.fortune')
          : t('components.rollLog.gm'),
      t
    );
    const who = parts.who;
    const inCampaign = t('pages.dashboard.activityIn', { campaign: a.gameName });
    const meta = who ? `${inCampaign} · ${who}` : inCampaign;
    return (
      <Card key={a.roll.id} variant='outline'>
        <Stack direction='row' justify='between' align='center' className='flex-wrap'>
          <div>
            <Stack direction='row' gap='xs' align='center' className='flex-wrap'>
              <Text as='strong' size='sm'>
                {parts.title}
              </Text>
              <Text variant='muted' size='sm'>
                {meta}
              </Text>
            </Stack>
            {parts.note && (
              <Text variant='muted' size='sm' className='block italic'>
                {parts.note}
              </Text>
            )}
            {/* Crew XP marks used to flood the feed one row each — a run of crew updates in one
                campaign shows as its newest row plus a count (round 4 P2-N6). */}
            {a.collapsed ? (
              <Text variant='muted' size='sm' className='block' data-testid='activity-collapsed'>
                {t('pages.dashboard.activityMoreCrew', { count: a.collapsed })}
              </Text>
            ) : null}
          </div>
          <Text variant='muted' size='sm'>
            {relativeTime(new Date(a.roll.createdAt), now, t)}
          </Text>
        </Stack>
      </Card>
    );
  };

  return (
    <PageShell>
      <Container maxWidth='4xl' padding='lg'>
        <Stack direction='column' gap='lg'>
          {/* The page title — distinct from the header's "Welcome, <name>" greeting (F96: the
                name appeared twice). The subtitle waits for the lists so it never flips. */}
          <Stack direction='column' gap='xs'>
            <Heading level='h1' variant='hero'>
              {t('pages.dashboard.title')}
            </Heading>
            <Text variant='muted' className='min-h-6' data-testid='dashboard-subtitle'>
              {loaded
                ? firstRun
                  ? t('pages.dashboard.subtitleNew')
                  : t('pages.dashboard.subtitle')
                : ''}
            </Text>
          </Stack>

          {/* Quick actions */}
          {showQuickActions && (
            <Stack
              direction='row'
              gap='sm'
              className={quickActionsPending ? 'invisible flex-wrap' : 'flex-wrap'}
              data-testid='dashboard-quick-actions'
              aria-hidden={quickActionsPending || undefined}
              inert={quickActionsPending || undefined}
            >
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
              <Button asChild variant='outline'>
                <Link href='/discord'>{t('pages.dashboard.actions.discord')}</Link>
              </Button>
            </Stack>
          )}

          {/* Brand-new user (no campaigns, no characters): one guided "start here" instead of
                three disconnected empty cards (F37, F94). Each step is a real link. */}
          {firstRun && (
            <Card variant='outline' data-testid='dashboard-start-here'>
              <Stack direction='column' gap='sm' align='start'>
                <Heading level='h2' variant='primary'>
                  {t('pages.dashboard.startHere.title')}
                </Heading>
                <Text variant='muted' size='sm'>
                  {t('pages.dashboard.startHere.intro')}
                </Text>
                <ol className='flex list-decimal flex-col gap-1 pl-5 text-sm'>
                  <li>
                    <Link href='/characters/new' className='underline'>
                      {t('pages.dashboard.startHere.step1')}
                    </Link>{' '}
                    {t('pages.dashboard.startHere.step1Note')}
                  </li>
                  <li>
                    <Link href='/games/new' className='underline'>
                      {t('pages.dashboard.startHere.step2')}
                    </Link>{' '}
                    {t('pages.dashboard.startHere.step2Note')}
                  </li>
                  <li>
                    <Link href='/games#join' className='underline'>
                      {t('pages.dashboard.startHere.step3')}
                    </Link>{' '}
                    {t('pages.dashboard.startHere.step3Note')}
                  </li>
                  <li>
                    <Link href='/discord' className='underline'>
                      {t('pages.dashboard.startHere.step4')}
                    </Link>{' '}
                    {hasDiscordInstall
                      ? t('pages.dashboard.startHere.step4Note')
                      : t('pages.dashboard.startHere.step4NoteNoInstall')}
                  </li>
                </ol>
                <DiscordInstallLinks size='sm' showUserInstall />
              </Stack>
            </Card>
          )}

          {!firstRun && (
            <>
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
              {campaignsStatus.loading ? (
                <GridSkeleton testId='dashboard-campaigns-loading' />
              ) : campaignsStatus.error ? (
                <QueryError
                  testId='dashboard-campaigns-error'
                  title={t('components.asyncState.campaignsLoadFailed')}
                  message={campaignsStatus.error}
                  onRetry={campaignsStatus.retry}
                />
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
              {charactersStatus.loading ? (
                <GridSkeleton testId='dashboard-characters-loading' />
              ) : charactersStatus.error ? (
                <QueryError
                  testId='dashboard-characters-error'
                  title={t('components.asyncState.charactersLoadFailed')}
                  message={charactersStatus.error}
                  onRetry={charactersStatus.retry}
                />
              ) : characters.length === 0 ? (
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
              {activityStatus.loading ? (
                <QueryLoading testId='dashboard-activity-loading' />
              ) : activityStatus.error ? (
                <QueryError
                  testId='dashboard-activity-error'
                  title={t('components.asyncState.activityLoadFailed')}
                  message={activityStatus.error}
                  onRetry={activityStatus.retry}
                />
              ) : activity.length === 0 ? (
                <Text variant='muted' data-testid='dashboard-activity-empty'>
                  {t('pages.dashboard.noActivity')}
                </Text>
              ) : (
                <Stack direction='column' gap='sm' data-testid='dashboard-activity-list'>
                  {activity.map(activityRow)}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Container>
    </PageShell>
  );
}

/**
 * F102 — loading placeholder for a card grid, sized like its first row (one card on phones, two
 * from `md`, ~a card tall). A one-line spinner/"Loading…" grew to the grid when the lists landed
 * and pushed every section below it ~90–180px at 768 (CLS 0.03–0.13). Announced once as busy.
 */
function GridSkeleton({ testId }: { testId: string }) {
  const { t } = useTranslation();
  return (
    <div role='status' aria-busy='true' data-testid={testId}>
      <span className='sr-only'>{t('components.asyncState.loading')}</span>
      <Grid cols={2} gap='md' aria-hidden='true'>
        {[0, 1].map(i => (
          <div
            key={i}
            className='h-28 animate-pulse rounded-lg border border-border-primary bg-background-secondary motion-reduce:animate-none max-md:[&:nth-child(2)]:hidden'
          />
        ))}
      </Grid>
    </div>
  );
}
