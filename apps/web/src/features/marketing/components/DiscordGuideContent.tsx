'use client';

/* eslint-disable i18next/no-literal-string -- command names, option syntax, and the reference
   table are product-literal strings (they must match the registered Discord commands exactly);
   mirrors packages/discord/README.md's command reference and `/heist help`. */
import Link from 'next/link';
import { Card, Container, Heading, Stack, Text } from '@heist-mind/ui';

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
 * The player-facing guide to the Discord bot (F67): what it is, the three-step start, and the
 * command reference — the page a GM sends their players. Content mirrors `/heist help` and
 * packages/discord/README.md's command table; update all three together.
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
        </Stack>

        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h2'>Getting started</Heading>
            <ol className='list-decimal space-y-2 pl-5 text-sm'>
              <li>
                <Text as='span'>
                  <strong>Try the dice first — no account needed.</strong> In a server with the bot,{' '}
                  <code>/roll dice:3</code> makes a FitD action roll; <code>/fortune</code> and{' '}
                  <code>/dice 2d6+1</code> work too.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>Sign in with Discord on this site once</strong> — that sign-in IS the
                  account link; there is no separate pairing step. Then build or claim a character
                  and select it in Discord with <code>/character use</code>.
                </Text>
              </li>
              <li>
                <Text as='span'>
                  <strong>Roll from your sheet.</strong> <code>/roll action:Skirmish</code> uses
                  your character&rsquo;s real rating (moderate harm costs a die, pushing adds one
                  and charges 2 stress). In a channel the GM has linked with{' '}
                  <code>/heist link</code>, rolls and every mechanical change land in the shared
                  campaign log.
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
                <Row
                  command='/roll dice:N · /fortune · /dice'
                  needs='nothing'
                  does='Manual FitD rolls — no account, nothing stored'
                />
                <Row
                  command='/character use|show|unset'
                  needs='signed in'
                  does='Pick which of your characters the bot acts as'
                />
                <Row
                  command='/roll action: [push|bargain] [assist]'
                  needs='active character'
                  does='Action roll from your sheet rating; push OR a devil’s bargain (+1d), plus an assist; harm −1d applies; persists in a linked channel'
                />
                <Row
                  command='/resist dice: [attribute]'
                  needs='active character'
                  does='Resistance roll — stress is 6 − highest die; a crit clears 1'
                />
                <Row
                  command='/stress add|clear'
                  needs='active character'
                  does='Mark or clear stress on your sheet'
                />
                <Row
                  command='/harm take|clear'
                  needs='active character'
                  does='Take harm (full tracks escalate, RAW) or clear a wound — feed-logged'
                />
                <Row
                  command='/vice indulge'
                  needs='active character'
                  does='Downtime: roll your vice, clear stress (overindulgence flagged)'
                />
                <Row
                  command='/xp mark|advance'
                  needs='active character'
                  does='Mark XP (playbook or attribute track) and spend a full track on an advance'
                />
                <Row
                  command='/heist link|status|log'
                  needs='member / GM, in a guild'
                  does='Link a campaign to the channel · campaign at a glance · record a settled result'
                />
                <Row
                  command='/score start|end'
                  needs='GM, linked channel'
                  does='Operation lifecycle — feed events tagged to the score'
                />
                <Row
                  command='/crew heat|tier|incarcerate'
                  needs='GM, linked channel'
                  does='Add/reduce heat (→ wanted cascade) · full Rep: hold weak→strong, or pay new Tier × 8 coin · Wanted −1 + Heat cleared'
                />
                <Row
                  command='/crew xp|advance'
                  needs='GM, linked channel'
                  does='Mark crew advancement XP · spend a full track on a new crew ability'
                />
                <Row
                  command='/clock tick'
                  needs='GM, linked channel'
                  does='Advance or wind back a clock; filling it announces the milestone'
                />
                <Row
                  command='/faction status'
                  needs='GM, linked channel'
                  does='Set a faction’s standing toward the crew (−3 war … +3 allies)'
                />
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
