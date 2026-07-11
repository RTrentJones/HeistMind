'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal text; structure adapted from
   GitHub's site-policy documents (CC0/public domain), trimmed to what HeistMind actually collects. */
import Link from 'next/link';
import { Paragraph } from '@heist-mind/ui';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export function PrivacyContent() {
  return (
    <LegalPageLayout title='Privacy Policy' effectiveDate='July 5, 2026'>
      <Paragraph variant='description'>
        HeistMind is a free, personal hobby project operated by Trent Jones. This policy describes
        exactly what we collect and why — which is deliberately little. We show no ads, run no
        analytics trackers, and never sell your data.
      </Paragraph>

      <LegalSection title='1. What we collect'>
        <ul className='list-disc pl-6 space-y-1 text-foreground-secondary'>
          <li>
            <strong>Discord sign-in profile</strong> — when you sign in with Discord we receive your
            Discord ID, username, email address, and avatar, stored with our authentication provider
            (Supabase Auth).
          </li>
          <li>
            <strong>Your game content</strong> — the rulesets, campaigns, characters, rolls, notes,
            and log entries you create.
          </li>
          <li>
            <strong>Error reports</strong> — when something breaks, our error monitoring (Sentry)
            may capture technical context such as your IP address, browser user-agent, and the state
            of the request that failed.
          </li>
        </ul>
        <Paragraph variant='description'>
          That&rsquo;s the whole list. No ad identifiers, no behavioral analytics, no tracking
          pixels.
        </Paragraph>
      </LegalSection>

      <LegalSection title='2. Cookies'>
        <Paragraph variant='description'>
          The Service uses only strictly-necessary authentication/session storage for keeping you
          signed in. There are no advertising or analytics cookies, which is why there is no
          cookie-consent banner.
        </Paragraph>
      </LegalSection>

      <LegalSection title='3. How we use your data'>
        <Paragraph variant='description'>
          To run the Service: authenticate you, show your content to you and to your campaign
          members, operate the optional Discord bot for campaigns you connect, and debug errors.
          Nothing else.
        </Paragraph>
      </LegalSection>

      <LegalSection title='4. Who processes it'>
        <Paragraph variant='description'>
          We rely on a small set of processors: Supabase (database, authentication, storage), Vercel
          (application hosting and CDN), Sentry (error monitoring), Discord (OAuth sign-in and bot
          interactions), and Cloudflare (DNS). Each processes data only to provide its service to
          us.
        </Paragraph>
      </LegalSection>

      <LegalSection title='5. Sharing'>
        <Paragraph variant='description'>
          Your content is shared only as the product works: with the members of your campaigns, and
          with a Discord server when you connect a campaign to it. We may disclose data if legally
          compelled to. We do not sell or rent personal data — to anyone, ever.
        </Paragraph>
      </LegalSection>

      <LegalSection title='6. Retention and deletion'>
        <Paragraph variant='description'>
          We keep your data while your account exists. You can{' '}
          <Link href='/settings' className='underline'>
            delete your account
          </Link>{' '}
          yourself at any time — deletion is immediate and permanent, removing your profile and all
          your content. You can also email legal@heistmind.com and we will delete it for you.
        </Paragraph>
      </LegalSection>

      <LegalSection title='7. Your rights'>
        <Paragraph variant='description'>
          Depending on where you live (e.g. GDPR in the EU, CCPA in California), you may have rights
          to access, correct, export, or erase your personal data, and to object to or restrict
          processing. Email legal@heistmind.com and we will honor these requests for all users
          regardless of jurisdiction.
        </Paragraph>
      </LegalSection>

      <LegalSection title='8. Children'>
        <Paragraph variant='description'>
          The Service is not directed at children under 13, and we do not knowingly collect data
          from them. If you believe a child under 13 has an account, contact legal@heistmind.com and
          we will delete it.
        </Paragraph>
      </LegalSection>

      <LegalSection title='9. International transfers'>
        <Paragraph variant='description'>
          Our processors operate in the United States (and their own hosting regions); by using the
          Service you understand your data is processed there.
        </Paragraph>
      </LegalSection>

      <LegalSection title='10. Changes'>
        <Paragraph variant='description'>
          Material changes to this policy will be announced on the site with an updated effective
          date.
        </Paragraph>
      </LegalSection>

      <LegalSection title='11. Contact'>
        <Paragraph variant='description'>
          Privacy questions or requests: legal@heistmind.com.
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
