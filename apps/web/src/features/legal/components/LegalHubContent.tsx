'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal chrome. */
import Link from 'next/link';
import { Card, Container, Heading, Stack, Text } from '@heist-mind/ui';

const DOCS = [
  {
    href: '/legal/terms',
    title: 'Terms of Service',
    blurb: 'The agreement covering your account, your content, and use of the Service.',
  },
  {
    href: '/legal/privacy',
    title: 'Privacy Policy',
    blurb: 'What we collect (very little), who processes it, and how to delete it.',
  },
  {
    href: '/legal/dmca',
    title: 'DMCA & Copyright Policy',
    blurb: 'How to report copyright infringement, and how counter-notices work.',
  },
  {
    href: '/legal/acceptable-use',
    title: 'Acceptable Use Policy',
    blurb: 'What you may upload, and the lines you may not cross.',
  },
  {
    href: '/legal/licenses',
    title: 'Content Licenses & Attributions',
    blurb: 'The licenses behind the built-in rulesets and the application code.',
  },
];

export function LegalHubContent() {
  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Heading level='h1' variant='hero'>
          Legal
        </Heading>
        <Stack direction='column' gap='md'>
          {DOCS.map(doc => (
            <Card key={doc.href} variant='outline'>
              <Stack direction='column' gap='sm'>
                <Link href={doc.href} className='underline'>
                  <Heading level='h2' variant='primary' className='text-xl'>
                    {doc.title}
                  </Heading>
                </Link>
                <Text variant='muted' size='sm'>
                  {doc.blurb}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
