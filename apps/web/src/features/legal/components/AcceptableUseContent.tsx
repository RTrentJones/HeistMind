'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal text; structure adapted from
   GitHub's Acceptable Use Policies (CC0/public domain), cut to one screen. */
import Link from 'next/link';
import { Paragraph } from '@heist-mind/ui';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export function AcceptableUseContent() {
  return (
    <LegalPageLayout title='Acceptable Use Policy' effectiveDate='July 5, 2026'>
      <Paragraph variant='description'>
        Short version: upload only what you have the right to upload, keep shared spaces decent, and
        don&rsquo;t attack the Service. This policy is part of the{' '}
        <Link href='/legal/terms' className='underline'>
          Terms of Service
        </Link>
        .
      </Paragraph>

      <LegalSection title='1. Respect intellectual property'>
        <ul className='list-disc pl-6 space-y-1 text-foreground-secondary'>
          <li>
            Only upload content you own, wrote yourself, or are licensed to use. Original hacks and
            homebrew, SRD-derived material used within its license, and your own table notes are all
            welcome.
          </li>
          <li>
            Do <strong>not</strong> upload text copied from commercial game books (playbook text,
            ability descriptions, setting chapters) or other material you don&rsquo;t have rights
            to. Game <em>mechanics</em> can be reimplemented in your own words; a book&rsquo;s{' '}
            <em>text</em> cannot be copied.
          </li>
          <li>
            Keep required attribution notices (e.g. CC BY) intact inside rulesets that carry them.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title='2. Keep shared content decent'>
        <ul className='list-disc pl-6 space-y-1 text-foreground-secondary'>
          <li>No unlawful content.</li>
          <li>No harassment or hate directed at real people in content shared with other users.</li>
          <li>Nothing that sexualizes minors — anywhere, in any form.</li>
        </ul>
      </LegalSection>

      <LegalSection title='3. Don&rsquo;t attack the Service'>
        <ul className='list-disc pl-6 space-y-1 text-foreground-secondary'>
          <li>
            Don&rsquo;t try to access other users&rsquo; campaigns or data, probe tenant isolation,
            or bypass access controls.
          </li>
          <li>Don&rsquo;t scrape, spam, or disrupt the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection title='4. Enforcement'>
        <Paragraph variant='description'>
          Violations can lead to content removal, suspension, or account termination. Copyright
          complaints go through the{' '}
          <Link href='/legal/dmca' className='underline'>
            DMCA policy
          </Link>
          ; report anything else to legal@heistmind.com.
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
