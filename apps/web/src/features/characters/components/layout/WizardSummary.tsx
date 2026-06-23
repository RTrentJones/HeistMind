'use client';

import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useCharacterSummary } from '../../lib/use-character-summary';

const LABEL_STYLE = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  marginBottom: 8,
};

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-foreground-muted" style={LABEL_STYLE}>
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Right-hand live character sheet for the `rail` layout — updates as the player
 * builds. Shares `useCharacterSummary` with the Review step so the two agree.
 */
export function WizardSummary() {
  const { charName, playbookName, attrBadges, abilityBadges, identityBadges } =
    useCharacterSummary();
  const { name, draft } = useCharacterCreationStore(
    useShallow(s => ({ name: s.name, draft: s.draft }))
  );

  const checks = [
    !!name.trim(),
    !!draft.playbook,
    Object.values(draft.attributes).some(v => v > 0),
    draft.specialAbilities.length > 0,
    !!(draft.heritage || draft.background || draft.vice),
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <aside
      className="flex flex-col gap-4"
      aria-label="Character summary"
      style={{
        position: 'sticky',
        top: 24,
        alignSelf: 'start',
        padding: '22px 20px',
        borderRadius: 16,
        border: '1px solid var(--color-border-primary)',
        background: 'color-mix(in oklab, var(--color-background-secondary) 70%, transparent)',
      }}
    >
      <div>
        <div className="font-display" style={{ fontSize: 19, lineHeight: 1.05 }}>
          {charName}
        </div>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-game-ember)',
          }}
        >
          {playbookName ?? 'No playbook'}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--color-border-primary)' }} />

      <Row title="Attributes">
        {attrBadges.length > 0 ? (
          attrBadges.map(b => (
            <Badge key={b} variant="steel" size="sm">
              {b}
            </Badge>
          ))
        ) : (
          <span className="text-foreground-muted" style={{ fontSize: 13 }}>
            No points assigned.
          </span>
        )}
      </Row>

      <Row title="Abilities">
        {abilityBadges.length > 0 ? (
          abilityBadges.map(b => (
            <Badge key={b} variant="success" size="sm">
              {b}
            </Badge>
          ))
        ) : (
          <span className="text-foreground-muted" style={{ fontSize: 13 }}>
            None chosen.
          </span>
        )}
      </Row>

      <Row title="Identity">
        {identityBadges.length > 0 ? (
          identityBadges.map(b => (
            <Badge key={b} variant="outline" size="sm">
              {b}
            </Badge>
          ))
        ) : (
          <span className="text-foreground-muted" style={{ fontSize: 13 }}>
            Not set.
          </span>
        )}
      </Row>

      <div
        style={{
          padding: 13,
          borderRadius: 12,
          background: 'var(--color-background-tertiary)',
          border: '1px solid var(--color-border-primary)',
        }}
      >
        <div
          className="flex justify-between"
          style={{ fontSize: 12, color: 'var(--color-foreground-muted)', marginBottom: 7 }}
        >
          <span>Completion</span>
          <span style={{ color: 'var(--color-game-ember)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div
          style={{
            height: 7,
            borderRadius: 5,
            background: 'var(--color-background-elevated)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{ height: '100%', width: `${pct}%`, background: 'var(--color-game-ember)' }}
          />
        </div>
      </div>
    </aside>
  );
}
