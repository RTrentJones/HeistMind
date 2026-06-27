'use client';

import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Section,
  Grid,
  Stack,
  Heading,
  Paragraph,
  Text,
} from '@heist-mind/ui';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { usePageTranslation } from '@/lib/i18n/hooks';

export default function HomePage() {
  const { t } = usePageTranslation();

  return (
    <Section variant='hero' padding='none' width='full' className='min-h-screen' as='div'>
      <AuthHeader />

      <Section as='main' variant='default' padding='xl' width='container'>
        <Container maxWidth='7xl'>
          <Stack gap='xl' align='center'>
            {/* Hero Section */}
            <Stack gap='lg' align='center'>
              <Heading level='h1' variant='hero' animate>
                {t('landing.hero.welcomePrefix')}
                <span className='text-brand-primary'>Heist</span>Mind
              </Heading>

              <Paragraph variant='lead' maxWidth='2xl' align='center' animate>
                {t('landing.hero.lead')}
              </Paragraph>
            </Stack>

            {/* Features Grid */}
            <Grid cols={3} gap='lg' animateChildren staggerDelay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.features.creation.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.features.creation.body')}</Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.features.management.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.features.management.body')}</Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('landing.features.collaboration.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>{t('landing.features.collaboration.body')}</Text>
                </CardContent>
              </Card>
            </Grid>

            {/* Call to Action */}
            <Stack gap='md' align='center'>
              <Heading level='h2' variant='primary' animate>
                {t('landing.cta.heading')}
              </Heading>
              <Text variant='secondary' animate>
                {t('landing.cta.body')}
              </Text>
            </Stack>
          </Stack>
        </Container>
      </Section>
    </Section>
  );
}
