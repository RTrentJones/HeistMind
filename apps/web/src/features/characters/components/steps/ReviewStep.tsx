'use client';

import type { ReactNode } from 'react';
import { Badge, Card, Heading } from '@heist-mind/ui';
import { useCharacterSummary } from '../../lib/use-character-summary';

const LABEL_STYLE = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  marginBottom: 9,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-foreground-muted" style={LABEL_STYLE}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <span className="text-foreground-muted" style={{ fontSize: 13 }}>
      {children}
    </span>
  );
}

/** Read-only character-sheet summary, ported from the spec design. */
export function ReviewStep() {
  const { charName, playbookName, attrBadges, abilityBadges, identityBadges } =
    useCharacterSummary();

  return (
    <Card variant="character">
      <div className="flex flex-col gap-1" style={{ marginBottom: 18 }}>
        <Heading level="h2" variant="gradient">
          {charName}
        </Heading>
        <div className="text-foreground-muted" style={{ fontSize: 14 }}>
          {playbookName ?? 'No playbook chosen'}
        </div>
      </div>

      <div className="flex flex-col gap-[18px]">
        <Section title="Attributes">
          {attrBadges.length > 0 ? (
            attrBadges.map(b => (
              <Badge key={b} variant="steel">
                {b}
              </Badge>
            ))
          ) : (
            <Empty>No points assigned.</Empty>
          )}
        </Section>

        <Section title="Special Abilities">
          {abilityBadges.length > 0 ? (
            abilityBadges.map(b => (
              <Badge key={b} variant="success">
                {b}
              </Badge>
            ))
          ) : (
            <Empty>None chosen.</Empty>
          )}
        </Section>

        <Section title="Identity">
          {identityBadges.length > 0 ? (
            identityBadges.map(b => (
              <Badge key={b} variant="outline">
                {b}
              </Badge>
            ))
          ) : (
            <Empty>Identity not set.</Empty>
          )}
        </Section>
      </div>
    </Card>
  );
}
