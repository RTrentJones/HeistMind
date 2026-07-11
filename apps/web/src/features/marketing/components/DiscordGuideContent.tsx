'use client';

/* eslint-disable i18next/no-literal-string -- command names, option syntax, and the reference
   table are product-literal strings (they must match the registered Discord commands exactly);
   mirrors packages/discord/README.md's command reference and `/heist help`. */
import Link from 'next/link';
import { Card, Container, Heading, Stack, Text } from '@heist-mind/ui';

/** One row of the command reference. */
function Row({ command, needs, does }: { command: string; needs: string; does: string }) {
  return (
    <tr className='border-b border-border-primary last:border-b-0'>
      <td className='whitespace-nowrap py-2 pr-4 align-top'>
        <code className='rounded bg-background-secondary px-1.5 py-0.5 text-xs'>{command}</code>
      </td>
      <td className='whitespace-nowrap py-2 pr-4 align-top text-sm text-foreground-muted'>
        {needs}
      </td>
      <td className='py-2 align-top text-sm'>{does}</td>
    </tr>
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
            <div className='overflow-x-auto'>
              <table className='w-full text-left'>
                <thead>
                  <tr className='border-b border-border-primary text-sm text-foreground-muted'>
                    <th className='py-2 pr-4 font-medium'>Command</th>
                    <th className='py-2 pr-4 font-medium'>Needs</th>
                    <th className='py-2 font-medium'>Does</th>
                  </tr>
                </thead>
                <tbody>
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
                    command='/roll action: [extra] [push]'
                    needs='active character'
                    does='Action roll from your sheet rating; harm −1d applies; persists in a linked channel'
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
                    does='Heat→wanted cascade · spend a full Rep track · Wanted −1 + Heat cleared'
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
                    does='Set a faction’s standing toward the crew (−3 war … +3 allied)'
                  />
                </tbody>
              </table>
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
