'use client';

/* eslint-disable i18next/no-literal-string -- a temporary English-only holding page; literal text
   keeps it independent of the message catalog (it is deleted at launch). It is in the
   server-rendered HTML either way (i18n initializes synchronously). Matches the legal pages'
   literal-text approach. */
import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { Footer } from '@/shared/components/Footer';

/**
 * The prod holding page shown at `/` when the coming-soon gate is on (see lib/coming-soon.ts).
 * Deliberately has no sign-in affordance — it IS the disabled front door. Keeps the Footer so the
 * legal pages (still reachable during the gate) stay one click away. `'use client'` only so it can
 * use the ui barrel; the literal copy still renders in the initial server HTML.
 */
export function ComingSoon() {
  return (
    <div className='flex min-h-screen flex-col'>
      <main id='main-content' className='flex flex-1 items-center justify-center'>
        <Container maxWidth='lg' padding='lg' center>
          <Stack direction='column' gap='md' align='center'>
            <Text variant='secondary' size='lg' className='font-display tracking-wide'>
              <span className='text-brand-primary'>Heist</span>Mind
            </Text>
            <Heading level='h1' variant='hero' align='center'>
              Coming soon
            </Heading>
            <Text variant='muted' align='center'>
              HeistMind — the rules-driven character &amp; crew manager for Forged in the Dark — is
              almost ready. Check back shortly.
            </Text>
          </Stack>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
