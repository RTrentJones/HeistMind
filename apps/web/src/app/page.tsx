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

export default function HomePage() {
  return (
    <Section variant='hero' padding='none' width='full' className='min-h-screen' as='div'>
      <AuthHeader />

      <Section as='main' variant='default' padding='xl' width='container'>
        <Container maxWidth='7xl'>
          <Stack gap='xl' align='center'>
            {/* Hero Section */}
            <Stack gap='lg' align='center' className='text-center'>
              <Heading level='h1' variant='hero' animate>
                Welcome to{' '}
                <Text as='span' variant='accent'>
                  Heist
                </Text>
                Mind
              </Heading>

              <Paragraph variant='lead' maxWidth='2xl' align='center' animate>
                The ultimate character management platform for Forged in the Dark tabletop RPGs.
                Create, manage, and advance your scoundrels across multiple campaigns.
              </Paragraph>
            </Stack>

            {/* Features Grid */}
            <Grid cols={3} gap='lg' className='mt-12' animateChildren staggerDelay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle>Dynamic Character Creation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>
                    Build characters using any Forged in the Dark ruleset. Upload custom rules or
                    use community-created content.
                  </Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-Game Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>
                    Organize characters across multiple games and campaigns. Track advancement,
                    stress, and relationships.
                  </Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seamless Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text variant='secondary'>
                    Share characters with GMs, clone builds for new games, and collaborate on crew
                    sheets and faction relationships.
                  </Text>
                </CardContent>
              </Card>
            </Grid>

            {/* Call to Action */}
            <Stack gap='md' align='center' className='mt-16 text-center'>
              <Heading level='h2' variant='primary' animate>
                Ready to start your next heist?
              </Heading>
              <Text variant='secondary' animate>
                Sign up with Discord to begin managing your scoundrels and join the community.
              </Text>
            </Stack>
          </Stack>
        </Container>
      </Section>
    </Section>
  );
}
