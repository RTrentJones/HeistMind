'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  Grid,
  Heading,
  Paragraph,
  Section,
  Stack,
  Text,
} from '@heist-mind/ui';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { usePageTranslation } from '@/lib/i18n/hooks';

/**
 * Logged-out landing. Leads with the dual value prop (one product, two modes): a rules-valid
 * character/crew sheet you bring anywhere (Mode 1), and the async mechanical layer for play-by-post
 * on Discord — "Avrae for Forged in the Dark" (Mode 2). The dual CTA kicks off Discord OAuth; after
 * the callback redirects to `/`, an authenticated user lands on the dashboard (see `Dashboard`).
 */
export function HomePage() {
  const { t } = usePageTranslation();
  const { signIn: signInFlow } = useSignIn();
  const signIn = () => void signInFlow();

  const dualCta = (size: 'lg' | 'default') => (
    <Stack direction='row' gap='md' align='center' className='flex-wrap justify-center'>
      <Button variant='ember' size={size} onClick={signIn}>
        {t('landing.cta.gm')}
      </Button>
      <Button variant='outline' size={size} onClick={signIn}>
        {t('landing.cta.player')}
      </Button>
    </Stack>
  );

  return (
    <Section variant='hero' padding='none' width='full' className='min-h-screen' as='div'>
      <AuthHeader />

      <Section as='main' variant='default' padding='xl' width='container'>
        <Container maxWidth='7xl'>
          <Stack gap='xl' align='center'>
            {/* Hero */}
            <Stack gap='lg' align='center'>
              <Text variant='secondary' size='lg' className='font-display tracking-wide'>
                <span className='text-brand-primary'>Heist</span>Mind
              </Text>
              <Heading level='h1' variant='hero' animate className='text-center'>
                {t('landing.hero.title')}
              </Heading>
              <Paragraph variant='lead' maxWidth='2xl' align='center' animate>
                {t('landing.hero.lead')}
              </Paragraph>
              {dualCta('lg')}
            </Stack>

            {/* Two "how you'll use it" tracks — let the visitor self-identify */}
            <Stack gap='md' align='center' className='w-full'>
              <Heading level='h2' variant='primary' animate>
                {t('landing.tracks.heading')}
              </Heading>
              <Grid cols={2} gap='lg' animateChildren staggerDelay={0.15}>
                <Card variant='elevated'>
                  <CardHeader>
                    <CardTitle>{t('landing.tracks.table.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Text variant='secondary'>{t('landing.tracks.table.body')}</Text>
                  </CardContent>
                </Card>
                <Card variant='elevated'>
                  <CardHeader>
                    <CardTitle>{t('landing.tracks.pbp.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack gap='sm' align='start'>
                      <Text variant='secondary'>{t('landing.tracks.pbp.body')}</Text>
                      <Badge variant='gold'>{t('landing.tracks.pbp.tag')}</Badge>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Stack>

            {/* Three pillars — the cross-cutting "why HeistMind" */}
            <Grid cols={3} gap='lg' animateChildren staggerDelay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.pillars.rules.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.pillars.rules.body')}</Text>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.pillars.anywhere.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.pillars.anywhere.body')}</Text>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.pillars.alacarte.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.pillars.alacarte.body')}</Text>
                </CardContent>
              </Card>
            </Grid>

            {/* Call to action */}
            <Stack gap='md' align='center'>
              <Heading level='h2' variant='primary' animate>
                {t('landing.cta.heading')}
              </Heading>
              <Text variant='secondary' animate>
                {t('landing.cta.body')}
              </Text>
              {dualCta('default')}
            </Stack>
          </Stack>
        </Container>
      </Section>
    </Section>
  );
}
