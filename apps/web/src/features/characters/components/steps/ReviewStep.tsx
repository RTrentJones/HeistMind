'use client';

import type { ReactNode } from 'react';
import { Badge, Card, Heading } from '@heist-mind/ui';
import { useCharacterSummary } from '../../lib/use-character-summary';
import { useTranslation } from '@/lib/i18n/hooks';

const LABEL_STYLE = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  marginBottom: 9,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className='text-foreground-muted' style={LABEL_STYLE}>
        {title}
      </div>
      <div className='flex flex-wrap gap-2'>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <span className='text-foreground-muted' style={{ fontSize: 13 }}>
      {children}
    </span>
  );
}

/** Read-only character-sheet summary, ported from the spec design. */
export function ReviewStep() {
  const { t } = useTranslation();
  const { charName, playbookName, attrBadges, abilityBadges, identityBadges } =
    useCharacterSummary();

  return (
    <Card variant='character'>
      <div className='flex flex-col gap-1' style={{ marginBottom: 18 }}>
        <Heading level='h2' variant='gradient'>
          {charName}
        </Heading>
        <div className='text-foreground-muted' style={{ fontSize: 14 }}>
          {playbookName ?? t('components.steps.review.noPlaybook')}
        </div>
      </div>

      <div className='flex flex-col gap-[18px]'>
        <Section title={t('components.steps.review.attributes')}>
          {attrBadges.length > 0 ? (
            attrBadges.map(b => (
              <Badge key={b} variant='steel'>
                {b}
              </Badge>
            ))
          ) : (
            <Empty>{t('components.steps.review.noPoints')}</Empty>
          )}
        </Section>

        <Section title={t('components.steps.review.abilities')}>
          {abilityBadges.length > 0 ? (
            abilityBadges.map(b => (
              <Badge key={b} variant='success'>
                {b}
              </Badge>
            ))
          ) : (
            <Empty>{t('components.steps.review.noneChosen')}</Empty>
          )}
        </Section>

        <Section title={t('components.steps.review.identity')}>
          {identityBadges.length > 0 ? (
            identityBadges.map(b => (
              <Badge key={b} variant='outline'>
                {b}
              </Badge>
            ))
          ) : (
            <Empty>{t('components.steps.review.identityNotSet')}</Empty>
          )}
        </Section>
      </div>
    </Card>
  );
}
