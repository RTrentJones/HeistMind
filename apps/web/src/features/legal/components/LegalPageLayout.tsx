'use client';

/* eslint-disable i18next/no-literal-string -- canonical English legal chrome; deliberately
   untranslated (the documents' governing language is English). */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Container, Heading, Stack, Text } from '@heist-mind/ui';

/**
 * Shared frame for the /legal/* documents: heading, effective date, body. The prose itself is
 * hardcoded English TSX (see the *Content components) — legal text has one canonical wording,
 * so it deliberately bypasses i18n.
 */
export function LegalPageLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <div>
          <Text variant='muted' size='sm'>
            <Link href='/legal' className='underline'>
              Legal
            </Link>
          </Text>
          <Heading level='h1' variant='hero'>
            {title}
          </Heading>
          <Text variant='muted' size='sm' className='mt-1'>
            Last updated: {effectiveDate}
          </Text>
        </div>
        <div className='space-y-4'>{children}</div>
      </Stack>
    </Container>
  );
}

/** A numbered/titled section within a legal document. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='space-y-2'>
      <Heading level='h2' variant='primary' className='text-xl'>
        {title}
      </Heading>
      {children}
    </section>
  );
}
