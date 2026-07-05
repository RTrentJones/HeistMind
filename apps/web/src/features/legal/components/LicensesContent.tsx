'use client';

/* eslint-disable i18next/no-literal-string -- canonical English licensing text. The catalog rows
   render live from BUILTIN_RULESETS so this page can never drift from what actually ships. */
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import { Badge, Card, Heading, Paragraph, Stack, Text } from '@heist-mind/ui';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export function LicensesContent() {
  return (
    <LegalPageLayout title='Content Licenses & Attributions' effectiveDate='[EFFECTIVE DATE]'>
      <Paragraph variant='description'>
        HeistMind&rsquo;s code and its built-in game content carry different licenses. The
        application code is open source under the MIT License. The built-in rulesets below each
        carry their own content license, shown here and on their catalog cards.
      </Paragraph>

      <LegalSection title='Built-in rulesets'>
        <Stack direction='column' gap='md'>
          {BUILTIN_RULESETS.map(b => (
            <Card key={b.id} variant='outline'>
              <Stack direction='column' gap='sm'>
                <Stack direction='row' gap='sm' align='center'>
                  <Heading level='h3' variant='default' className='text-lg'>
                    {b.content.metadata.name}
                  </Heading>
                  {b.license ? <Badge variant='steel'>{b.license}</Badge> : null}
                </Stack>
                {b.blurb ? (
                  <Text variant='muted' size='sm'>
                    {b.blurb}
                  </Text>
                ) : null}
                {b.attribution ? (
                  <Text variant='muted' size='sm' className='italic'>
                    {b.attribution}
                  </Text>
                ) : null}
              </Stack>
            </Card>
          ))}
        </Stack>
      </LegalSection>

      <LegalSection title='Blades in the Dark (CC BY 3.0)'>
        <Paragraph variant='description'>
          This work is based on Blades in the Dark (found at bladesinthedark.com), product of One
          Seven Design, developed and authored by John Harper, and licensed for our use under the
          Creative Commons Attribution 3.0 Unported license. The license covers the SRD system;
          HeistMind&rsquo;s implementation deliberately contains none of the Duskwall setting, its
          factions or NPCs, artwork, or maps, and all rules text is original wording.
        </Paragraph>
      </LegalSection>

      <LegalSection title='Wicked Ones (CC0)'>
        <Paragraph variant='description'>
          Adapted from Wicked Ones by Bandit Camp, released into the public domain under Creative
          Commons Zero (CC0 1.0).
        </Paragraph>
      </LegalSection>

      <LegalSection title='Brackwater (CC BY 4.0)'>
        <Paragraph variant='description'>
          Brackwater is original HeistMind content, © 2026 Trent Jones, licensed under Creative
          Commons Attribution 4.0: copy, reskin, and adapt it freely with attribution to HeistMind.
        </Paragraph>
      </LegalSection>

      <LegalSection title='Trademarks & affiliation'>
        <Paragraph variant='description'>
          &ldquo;Blades in the Dark&rdquo; is a trademark of One Seven Design. HeistMind is an
          independent project and is not affiliated with, endorsed, or sponsored by One Seven
          Design, Evil Hat Productions, or Bandit Camp. &ldquo;Forged in the Dark&rdquo; is used per
          One Seven Design&rsquo;s published licensing terms.
        </Paragraph>
      </LegalSection>

      <LegalSection title='Application code (MIT)'>
        <Paragraph variant='description'>
          The HeistMind application code is licensed under the MIT License, © 2026 Trent Jones.
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
