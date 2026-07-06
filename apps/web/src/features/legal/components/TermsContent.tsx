'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal text; structure adapted from
   GitHub's site-policy documents (CC0/public domain), trimmed to a free hobby service. */
import Link from 'next/link';
import { Paragraph } from '@heist-mind/ui';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

const OPERATOR = 'HeistMind, operated by Trent Jones';

export function TermsContent() {
  return (
    <LegalPageLayout title='Terms of Service' effectiveDate='July 5, 2026'>
      <Paragraph variant='description'>
        These terms are an agreement between you and {OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        about your use of heistmind and its related services (the &ldquo;Service&rdquo;) — a free
        tool for managing Forged-in-the-Dark tabletop RPG characters, crews, and campaigns. By
        creating an account or using the Service, you agree to these terms.
      </Paragraph>

      <LegalSection title='1. Eligibility and accounts'>
        <Paragraph variant='description'>
          You must be at least 13 years old to use the Service. Signing in requires a Discord
          account; you are responsible for keeping that account secure, and for everything done
          through your HeistMind account. One account per person.
        </Paragraph>
      </LegalSection>

      <LegalSection title='2. Your content'>
        <Paragraph variant='description'>
          &ldquo;Your Content&rdquo; is anything you create or upload in the Service: rulesets,
          campaigns, characters, crew and faction records, rolls, notes, and log entries.{' '}
          <strong>You own Your Content.</strong> You grant us a non-exclusive, worldwide,
          royalty-free license to host, store, reproduce, and display it solely as needed to run the
          Service — including showing it to the members of your campaigns and, where you connect a
          campaign to a Discord server, transmitting it there.
        </Paragraph>
        <Paragraph variant='description'>
          You represent and warrant that you own Your Content or have the rights needed to upload
          it, and that it does not infringe anyone else&rsquo;s intellectual property or other
          rights. Do not upload text copied from commercial game books or other material you
          don&rsquo;t have rights to — see the{' '}
          <Link href='/legal/acceptable-use' className='underline'>
            Acceptable Use Policy
          </Link>
          .
        </Paragraph>
      </LegalSection>

      <LegalSection title='3. Content visibility'>
        <Paragraph variant='description'>
          Your Content is private by default: it is visible only to you and to the members of the
          campaigns it belongs to. There is no public browsing of user content. Campaign content you
          post to a connected Discord server is governed by that server&rsquo;s own rules and
          Discord&rsquo;s terms.
        </Paragraph>
      </LegalSection>

      <LegalSection title='4. Acceptable use'>
        <Paragraph variant='description'>
          Use of the Service is subject to the{' '}
          <Link href='/legal/acceptable-use' className='underline'>
            Acceptable Use Policy
          </Link>
          , which is part of these terms.
        </Paragraph>
      </LegalSection>

      <LegalSection title='5. Copyright and DMCA'>
        <Paragraph variant='description'>
          We respond to copyright complaints under our{' '}
          <Link href='/legal/dmca' className='underline'>
            DMCA &amp; Copyright Policy
          </Link>
          , which is part of these terms. We will terminate the accounts of repeat infringers in
          appropriate circumstances.
        </Paragraph>
      </LegalSection>

      <LegalSection title='6. Third-party services'>
        <Paragraph variant='description'>
          The Service is built on third-party services — Discord (sign-in and the optional bot),
          Supabase (database and authentication), Vercel (hosting), Sentry (error monitoring), and
          Cloudflare (DNS) — each governed by its own terms. Your use of Discord, including
          interacting with the HeistMind bot in a Discord server, is also subject to Discord&rsquo;s
          terms of service.
        </Paragraph>
      </LegalSection>

      <LegalSection title='7. The Service is free, and provided as-is'>
        <Paragraph variant='description'>
          The Service is free to use and comes with no service-level commitment. Features may change
          or be discontinued at any time. We will make reasonable efforts to give notice before
          discontinuing the Service so you can export what matters to you.
        </Paragraph>
      </LegalSection>

      <LegalSection title='8. Termination'>
        <Paragraph variant='description'>
          You can delete your account at any time from{' '}
          <Link href='/settings' className='underline'>
            Settings
          </Link>{' '}
          — deletion is permanent and removes your profile and Your Content. We may suspend or
          terminate accounts that violate these terms.
        </Paragraph>
      </LegalSection>

      <LegalSection title='9. Disclaimer of warranties'>
        <Paragraph variant='description'>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranty of any kind — express or implied — including warranties of merchantability,
          fitness for a particular purpose, and non-infringement. We do not warrant that the Service
          will be uninterrupted, error-free, or that data will never be lost. Keep copies of
          anything you can&rsquo;t afford to lose.
        </Paragraph>
      </LegalSection>

      <LegalSection title='10. Limitation of liability'>
        <Paragraph variant='description'>
          To the maximum extent permitted by law, {OPERATOR} will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of data, use, or
          goodwill, arising from your use of the Service. Our total liability for any claim relating
          to the Service is limited to US $50 (reflecting that the Service is free).
        </Paragraph>
      </LegalSection>

      <LegalSection title='11. Indemnification'>
        <Paragraph variant='description'>
          You agree to indemnify and hold us harmless from claims arising out of Your Content or
          your violation of these terms — including claims that content you uploaded infringes
          someone else&rsquo;s rights.
        </Paragraph>
      </LegalSection>

      <LegalSection title='12. Governing law and forum'>
        <Paragraph variant='description'>
          These terms are governed by the laws of the State of California, USA, without regard to
          conflict of law principles. Any dispute arising out of or relating to these terms or the
          Service that is not otherwise resolved will be brought exclusively in the state or federal
          courts located in Los Angeles County, California, and you and {OPERATOR} each consent to
          the personal jurisdiction of those courts and waive any objection to venue there. The
          governing language of these terms is English.
        </Paragraph>
      </LegalSection>

      <LegalSection title='13. Changes to these terms'>
        <Paragraph variant='description'>
          We may update these terms; material changes will be announced on the site with an updated
          effective date. Continuing to use the Service after a change takes effect means you accept
          the updated terms.
        </Paragraph>
      </LegalSection>

      <LegalSection title='14. Contact'>
        <Paragraph variant='description'>
          Questions about these terms: legal@heistmind.com.
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
