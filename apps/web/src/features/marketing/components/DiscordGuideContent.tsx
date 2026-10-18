'use client';

/* eslint-disable i18next/no-literal-string -- command names, option syntax, and the reference
   table are product-literal strings (they must match the registered Discord commands exactly);
   mirrors packages/discord/README.md's command reference and `/heist help`. */
import Link from 'next/link';
import { Card, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { DiscordInstallLinks } from '@/shared/components/DiscordInstallLinks';

/**
 * The command reference as ONE responsive definition list (F93). It used to be a 3-column table in
 * an `overflow-x-auto` box: on phones only the Command column fit, Needs/Does hid in a sideways
 * scroller nobody could see (and keyboard users couldn't scroll — axe scrollable-region-focusable).
 * Now each command is a stacked card below `md` (command, then "Needs" + "Does" labelled) and a
 * table-like 3-column grid from `md` up — same DOM, nothing scrolls.
 */
const GRID = 'md:grid md:grid-cols-[minmax(0,15rem)_9rem_minmax(0,1fr)] md:gap-x-4';

function Row({ command, needs, does }: { command: string; needs: string; does: string }) {
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
        <span className='font-medium text-foreground-secondary md:sr-only'>Needs: </span>
        {needs}
      </dd>
      <dd className='text-sm'>
        <span className='font-medium text-foreground-secondary md:sr-only'>Does: </span>
        {does}
      </dd>
    </div>
  );
}

/**
 * The command reference, row for row with packages/discord/README.md and `/heist help` (the
 * manifest in packages/discord/src/commands/manifest.ts is the source of truth — update all four
 * together; discord-page.spec.ts checks a few load-bearing rows).
 */
export const COMMANDS: Array<{ command: string; needs: string; does: string }> = [
  {
    command: '/roll dice:N · /fortune · /dice',
    needs: 'nothing',
    does: 'Manual FitD action/fortune rolls and plain NdM dice — no account, nothing stored',
  },
  {
    command: '/resist dice:N',
    needs: 'nothing',
    does: 'Resistance roll — stress is 6 − highest die; a critical clears 1',
  },
  {
    command: '/heist help · /heist about',
    needs: 'nothing',
    does: 'Every command, grouped by what it needs · what the bot is, privacy, and the deployed version',
  },
  {
    command: '/heist account',
    needs: 'signed in',
    does: 'Your linked HeistMind account and active character',
  },
  {
    command: '/character use|show|unset',
    needs: 'signed in',
    does: 'Pick, show (or share) and clear the character the bot acts as — one at a time',
  },
  {
    command: '/roll action: [push|bargain] [assist] [bonus]',
    needs: 'active character',
    does: 'Action roll from your sheet rating; push (+1d, 2 stress) OR a devil’s bargain (+1d), plus an assist (+1d, the helper marks 1 stress); bonus adds or removes an ability’s dice (Ambush +1); moderate harm costs a die; persists in a linked channel',
  },
  {
    command: '/resist attribute: [bonus]',
    needs: 'active character',
    does: 'Resist with your sheet’s attribute rating (in a linked campaign), plus any ability dice (bonus:1 for Iron Will, bonus:-1 for Daredevil); the stress cost lands on your sheet',
  },
  {
    command: '/stress add|clear',
    needs: 'active character',
    does: 'Mark or clear stress on your sheet',
  },
  {
    command: '/harm take|clear [armor]',
    needs: 'active character',
    does: 'Take harm (full tracks escalate, RAW; armor:true soaks a level) or clear a wound — logged',
  },
  {
    command: '/vice indulge',
    needs: 'active character',
    does: 'Downtime: roll your vice, clear stress (overindulgence flagged)',
  },
  {
    command: '/xp mark|advance',
    needs: 'active character',
    does: 'Mark XP (playbook or attribute track) and spend a full track on an advance',
  },
  {
    command: '/heist link|unlink',
    needs: 'GM, in a server',
    does: 'Link one of your campaigns to this channel, its category, or the whole server (needs Manage Channels; Manage Server for server-wide) · remove the link',
  },
  {
    command: '/heist status',
    needs: 'member, linked channel',
    does: 'The linked campaign at a glance: score, crew, clocks',
  },
  {
    command: '/log text:',
    needs: 'member, linked channel',
    does: 'Record a settled result in the campaign log — attributed to you, tagged to the active score',
  },
  {
    command: '/score start|end',
    needs: 'GM, linked channel',
    does: 'Operation lifecycle — log entries are tagged to the score',
  },
  {
    command: '/crew heat|tier|incarcerate',
    needs: 'GM, linked channel',
    does: 'Add/reduce heat (→ wanted cascade) · full Rep: hold weak→strong, or pay new Tier × 8 coin · Wanted −1 + Heat cleared',
  },
  {
    command: '/crew xp|advance',
    needs: 'GM, linked channel',
    does: 'Mark crew advancement XP · spend a full track on a new crew ability',
  },
  {
    command: '/clock tick',
    needs: 'GM, linked channel',
    does: 'Advance or wind back a clock; filling it announces the milestone',
  },
  {
    command: '/faction status',
    needs: 'GM, linked channel',
    does: 'Set a faction’s standing toward the crew (−3 war … +3 allies)',
  },
];

/**
 * The player-facing guide to the Discord bot (F67, F94): what it is, how to add it, the setup
 * order (campaign + join on the web FIRST, then link the channel), and the command reference —
 * the page a GM sends their players. Reachable from the signed-in nav and the campaign hub.
 */
export function DiscordGuideContent() {
  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            HeistMind on Discord
          </Heading>
          <Text variant='muted'>
            Sheet-rated rolls, stress, harm, XP, clocks, and GM controls as slash commands — the
            live mechanical layer for async play-by-post, right in your server. The story stays in
            your channels; the mechanics and shared truth live in HeistMind.
          </Text>
          <DiscordInstallLinks showUserInstall />
        </Stack>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2'>Getting started</Heading>
            <ol className='list-decimal space-y-2 pl-5 text-sm' data-testid='discord-setup-steps'>
              <li>
                <Text as='span'>
                  <strong>Add the bot.</strong> Someone with Manage Server adds HeistMind to your
                  Discord server (the button above). Then try the dice — no account needed:{' '}
                  <code>/roll dice:3</code>, <code>/fortune</code>, <code>/dice 2d6+1</code>.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>GM: create the campaign on this site, then link it.</strong>{' '}
                  <Link href='/games/new' className='underline'>
                    Create a campaign
                  </Link>
                  , then in the channel you play in run <code>/heist link campaign:</code> and pick
                  it (needs Manage Channels). Copy the campaign&rsquo;s invite link from its page
                  for your players.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>Players: sign in, join, build.</strong> Sign in with Discord on this site
                  once — that sign-in IS the account link; there is no separate pairing step. Open
                  the GM&rsquo;s invite link (or enter the join code on the{' '}
                  <Link href='/games' className='underline'>
                    Campaigns
                  </Link>{' '}
                  page), build a character in the campaign, and pick it in Discord with{' '}
                  <code>/character use</code>.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>Play.</strong> <code>/roll action:Skirmish</code> rolls your
                  character&rsquo;s real rating. In the linked channel, rolls and every mechanical
                  change land in the shared campaign log — the same log the campaign page shows.
                </Text>
              </li>
            </ol>
          </Stack>
        </Card>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2'>Command reference</Heading>
            <Text variant='muted' size='sm'>
              <code>/heist help</code> shows this in Discord, grouped by what each command needs.
            </Text>
            <div>
              {/* Visual column headings for the desktop grid; each row names its own cells for
                  assistive tech (the sr-only "Needs:" / "Does:" labels). */}
              <div
                aria-hidden='true'
                className={`border-b border-border-primary py-2 text-sm font-medium text-foreground-muted max-md:hidden ${GRID}`}
              >
                <span>Command</span>
                <span>Needs</span>
                <span>Does</span>
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
          Build characters, campaigns, and rulesets on{' '}
          <Link href='/' className='underline'>
            the web app
          </Link>
          ; every mechanical change — from either side — lands in the same campaign log.
        </Text>
      </Stack>
    </Container>
  );
}
