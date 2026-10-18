'use client';

import Link from 'next/link';
import { Card, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { discordAppId } from '@/lib/discord-install';
import { useTranslation } from '@/lib/i18n/hooks';
import type { TranslationKey } from '@/lib/i18n/translations';
import { DiscordInstallLinks } from '@/shared/components/DiscordInstallLinks';

/**
 * The command reference as ONE responsive definition list (F93). It used to be a 3-column table in
 * an `overflow-x-auto` box: on phones only the Command column fit, Needs/Does hid in a sideways
 * scroller nobody could see (and keyboard users couldn't scroll — axe scrollable-region-focusable).
 * Now each command is a stacked card below `md` (command, then "Needs" + "Does" labelled) and a
 * table-like 3-column grid from `md` up — same DOM, nothing scrolls.
 */
const GRID = 'md:grid md:grid-cols-[minmax(0,15rem)_9rem_minmax(0,1fr)] md:gap-x-4';

// Static keys so they stay inside the typed TranslationKey union (never template-built).
const NEEDS = {
  nothing: 'pages.discordGuide.needs.nothing',
  signedIn: 'pages.discordGuide.needs.signedIn',
  activeCharacter: 'pages.discordGuide.needs.activeCharacter',
  gmServer: 'pages.discordGuide.needs.gmServer',
  memberLinked: 'pages.discordGuide.needs.memberLinked',
  gmLinked: 'pages.discordGuide.needs.gmLinked',
} as const satisfies Record<string, TranslationKey>;

function Row({
  command,
  needs,
  does,
}: {
  command: string;
  needs: TranslationKey;
  does: TranslationKey;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-lg border border-border-primary p-3 max-md:space-y-1.5 md:rounded-none md:border-0 md:border-b md:px-0 md:py-2 md:last:border-b-0 ${GRID}`}
    >
      <dt>
        <code className='rounded bg-background-secondary px-1.5 py-0.5 text-xs break-words'>
          {command}
        </code>
      </dt>
      <dd className='text-sm text-foreground-muted'>
        <span className='font-medium text-foreground-secondary md:sr-only'>
          {t('pages.discordGuide.needsLabel')}{' '}
        </span>
        {t(needs)}
      </dd>
      <dd className='text-sm'>
        <span className='font-medium text-foreground-secondary md:sr-only'>
          {t('pages.discordGuide.doesLabel')}{' '}
        </span>
        {t(does)}
      </dd>
    </div>
  );
}

/**
 * The command reference, row for row with packages/discord/README.md and `/heist help` (the
 * manifest in packages/discord/src/commands/manifest.ts is the source of truth — the unit test
 * checks every row against it, both ways). `command` is product-literal (it must match the
 * registered slash commands exactly); `needs` / `does` are i18n keys (F96 — the guide's copy was
 * hard-coded English outside the translation layer).
 */
export const COMMANDS: Array<{ command: string; needs: TranslationKey; does: TranslationKey }> = [
  {
    command: '/roll dice:N · /fortune · /dice',
    needs: NEEDS.nothing,
    does: 'pages.discordGuide.does.manualDice',
  },
  { command: '/resist dice:N', needs: NEEDS.nothing, does: 'pages.discordGuide.does.resist' },
  {
    command: '/heist help · /heist about',
    needs: NEEDS.nothing,
    does: 'pages.discordGuide.does.help',
  },
  { command: '/heist account', needs: NEEDS.signedIn, does: 'pages.discordGuide.does.account' },
  {
    command: '/character use|show|unset',
    needs: NEEDS.signedIn,
    does: 'pages.discordGuide.does.character',
  },
  {
    command: '/roll action: [push|bargain] [assist] [bonus]',
    needs: NEEDS.activeCharacter,
    does: 'pages.discordGuide.does.rollAction',
  },
  {
    command: '/resist attribute: [bonus]',
    needs: NEEDS.activeCharacter,
    does: 'pages.discordGuide.does.resistAttribute',
  },
  {
    command: '/stress add|clear',
    needs: NEEDS.activeCharacter,
    does: 'pages.discordGuide.does.stress',
  },
  {
    command: '/harm take|clear [armor]',
    needs: NEEDS.activeCharacter,
    does: 'pages.discordGuide.does.harm',
  },
  { command: '/vice indulge', needs: NEEDS.activeCharacter, does: 'pages.discordGuide.does.vice' },
  {
    command: '/xp mark|advance',
    needs: NEEDS.activeCharacter,
    does: 'pages.discordGuide.does.xp',
  },
  { command: '/heist link|unlink', needs: NEEDS.gmServer, does: 'pages.discordGuide.does.link' },
  {
    command: '/heist status',
    needs: NEEDS.memberLinked,
    does: 'pages.discordGuide.does.status',
  },
  { command: '/log text:', needs: NEEDS.memberLinked, does: 'pages.discordGuide.does.log' },
  { command: '/score start|end', needs: NEEDS.gmLinked, does: 'pages.discordGuide.does.score' },
  {
    command: '/crew heat|tier|incarcerate',
    needs: NEEDS.gmLinked,
    does: 'pages.discordGuide.does.crewHeat',
  },
  {
    command: '/crew xp|advance',
    needs: NEEDS.gmLinked,
    does: 'pages.discordGuide.does.crewXp',
  },
  { command: '/clock tick', needs: NEEDS.gmLinked, does: 'pages.discordGuide.does.clock' },
  { command: '/faction status', needs: NEEDS.gmLinked, does: 'pages.discordGuide.does.faction' },
];

/**
 * The player-facing guide to the Discord bot (F67, F94): what it is, how to add it, the setup
 * order (campaign + join on the web FIRST, then link the channel), and the command reference —
 * the page a GM sends their players. Reachable from the signed-in nav and the campaign hub.
 * Step 1 only points at "the button above" when the deployment actually renders one (F96).
 */
export function DiscordGuideContent() {
  const { t } = useTranslation();
  const hasInstall = discordAppId() !== null;
  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {t('pages.discordGuide.title')}
          </Heading>
          <Text variant='muted'>{t('pages.discordGuide.intro')}</Text>
          <DiscordInstallLinks showUserInstall />
        </Stack>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2'>{t('pages.discordGuide.setupTitle')}</Heading>
            <ol className='list-decimal space-y-2 pl-5 text-sm' data-testid='discord-setup-steps'>
              <li>
                <Text as='span'>
                  <strong>{t('pages.discordGuide.step1Title')}</strong>{' '}
                  {hasInstall
                    ? t('pages.discordGuide.step1Body')
                    : t('pages.discordGuide.step1BodyNoInstall')}{' '}
                  <code>/roll dice:3</code>, <code>/fortune</code>, <code>/dice 2d6+1</code>.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>{t('pages.discordGuide.step2Title')}</strong>{' '}
                  <Link href='/games/new' className='underline'>
                    {t('pages.discordGuide.step2Link')}
                  </Link>
                  {t('pages.discordGuide.step2Mid')} <code>/heist link campaign:</code>{' '}
                  {t('pages.discordGuide.step2Tail')}
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>{t('pages.discordGuide.step3Title')}</strong>{' '}
                  {t('pages.discordGuide.step3Lead')}{' '}
                  <Link href='/games' className='underline'>
                    {t('pages.discordGuide.step3Link')}
                  </Link>{' '}
                  {t('pages.discordGuide.step3Mid')} <code>/character use</code>.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>{t('pages.discordGuide.step4Title')}</strong>{' '}
                  <code>/roll action:Skirmish</code> {t('pages.discordGuide.step4Body')}
                </Text>
              </li>
            </ol>
          </Stack>
        </Card>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2'>{t('pages.discordGuide.referenceTitle')}</Heading>
            <Text variant='muted' size='sm'>
              <code>/heist help</code> {t('pages.discordGuide.referenceHint')}
            </Text>
            <div>
              {/* Visual column headings for the desktop grid; each row names its own cells for
                  assistive tech (the sr-only "Needs:" / "Does:" labels). */}
              <div
                aria-hidden='true'
                className={`border-b border-border-primary py-2 text-sm font-medium text-foreground-muted max-md:hidden ${GRID}`}
              >
                <span>{t('pages.discordGuide.colCommand')}</span>
                <span>{t('pages.discordGuide.colNeeds')}</span>
                <span>{t('pages.discordGuide.colDoes')}</span>
              </div>
              <dl className='flex flex-col gap-2 md:gap-0'>
                {COMMANDS.map(row => (
                  <Row key={row.command} {...row} />
                ))}
              </dl>
            </div>
          </Stack>
        </Card>

        <Text variant='muted' size='sm'>
          {t('pages.discordGuide.footerLead')}{' '}
          <Link href='/' className='underline'>
            {t('pages.discordGuide.footerLink')}
          </Link>
          {t('pages.discordGuide.footerTail')}
        </Text>
      </Stack>
    </Container>
  );
}
