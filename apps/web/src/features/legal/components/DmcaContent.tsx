'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal text; structure adapted from
   GitHub's DMCA Takedown Policy (CC0/public domain), trimmed to a free hobby service. */
import { Paragraph } from '@heist-mind/ui';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export function DmcaContent() {
  return (
    <LegalPageLayout title='DMCA & Copyright Policy' effectiveDate='July 5, 2026'>
      <Paragraph variant='description'>
        HeistMind hosts rulesets and campaign content uploaded by users. If you believe content on
        HeistMind infringes your copyright, this page explains how to tell us, and what happens
        next. We take valid notices seriously and act on them quickly.
      </Paragraph>

      <LegalSection title='1. Before you file'>
        <Paragraph variant='description'>
          A note on scope: copyright protects specific <em>expression</em> (text, art), not game
          mechanics or rules concepts — and much Forged-in-the-Dark material is openly licensed
          (e.g. the Blades in the Dark SRD under CC BY 3.0). Before filing, consider whether the
          material is actually your protected expression, whether it is licensed, and whether its
          use is fair use. Knowingly misrepresenting that material is infringing can make you liable
          for damages under 17 U.S.C. § 512(f).
        </Paragraph>
      </LegalSection>

      <LegalSection title='2. How to file a takedown notice'>
        <Paragraph variant='description'>
          Send a notice containing all of the following (per 17 U.S.C. § 512(c)(3)) to our
          designated agent below:
        </Paragraph>
        <ol className='list-decimal pl-6 space-y-1 text-foreground-secondary'>
          <li>Your physical or electronic signature.</li>
          <li>Identification of the copyrighted work you claim is infringed.</li>
          <li>
            Identification of the infringing material and information reasonably sufficient for us
            to locate it (a link to the campaign/ruleset, or enough description to find it).
          </li>
          <li>Your contact information (address, telephone number, email).</li>
          <li>
            A statement that you have a good-faith belief the use is not authorized by the copyright
            owner, its agent, or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information in the notice is accurate
            and that you are the copyright owner or authorized to act on the owner&rsquo;s behalf.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title='3. Designated agent'>
        <Paragraph variant='description'>
          Trent Jones (HeistMind)
          <br />
          Email: legal@heistmind.com
        </Paragraph>
        <Paragraph variant='description'>
          Postal address and telephone number are as listed in our registration in the{' '}
          <a
            href='https://dmca.copyright.gov/osp/publish/search.html'
            className='underline'
            rel='noopener noreferrer'
          >
            U.S. Copyright Office&rsquo;s DMCA Designated Agent Directory
          </a>{' '}
          (search &ldquo;HeistMind&rdquo;). Email is the fastest way to reach the agent.
        </Paragraph>
      </LegalSection>

      <LegalSection title='4. What we do with a valid notice'>
        <Paragraph variant='description'>
          We remove or disable access to the identified material expeditiously, notify the user who
          uploaded it, and give them a copy of the notice.
        </Paragraph>
      </LegalSection>

      <LegalSection title='5. Counter-notices'>
        <Paragraph variant='description'>
          If your content was removed and you believe that was a mistake or misidentification, you
          may send a counter-notice to the same agent containing: your signature; identification of
          the removed material and where it appeared; a statement under penalty of perjury that you
          have a good-faith belief the removal was a mistake or misidentification; your name,
          address, and phone number; and consent to the jurisdiction of the federal district court
          for your address (or, if outside the US, any judicial district in which HeistMind may be
          found), and that you will accept service of process from the person who filed the original
          notice. Unless the original claimant files a court action, we restore the material in
          10–14 business days.
        </Paragraph>
      </LegalSection>

      <LegalSection title='6. Repeat infringers'>
        <Paragraph variant='description'>
          We terminate the accounts of users who repeatedly infringe copyright, in appropriate
          circumstances.
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
