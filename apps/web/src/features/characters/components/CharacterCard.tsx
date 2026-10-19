import type { ReactNode } from 'react';
import type { Character, CharacterStatus } from '@heist-mind/core';
import { Badge, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';
import { characterStatusLabel } from '@/features/rolls/lib/labels';

/**
 * Canonical character status → badge variant mapping. Previously duplicated (and diverged) across the
 * roster and the dashboard; this is the single source of truth.
 */
export const characterStatusVariant: Record<
  CharacterStatus,
  'success' | 'outline' | 'steel' | 'crimson'
> = {
  active: 'success',
  inactive: 'outline',
  retired: 'steel',
  dead: 'crimson',
};

export interface CharacterCardProps {
  character: Pick<Character, 'id' | 'name' | 'status' | 'gameId'>;
  /** Secondary line under the name (playbook / campaign / xp — varies by surface). */
  meta?: ReactNode;
  /** Right-aligned action controls (view / retire / duplicate — varies by surface). */
  actions?: ReactNode;
  /** When provided, shows this label as a badge for standalone (no-campaign) characters. */
  standaloneLabel?: string;
  /** The name's heading level: h3 under a section h2 (roster, dashboard), h2 straight under a
   * page h1 (My Characters) — axe heading-order (F94). */
  headingLevel?: 'h2' | 'h3';
}

/**
 * The one character summary card, shared by the campaign roster, the dashboard, and My Characters.
 * Surface-specific bits (the meta line, the action buttons, the standalone badge) come in as props so
 * the card itself stays a single implementation.
 */
export function CharacterCard({
  character,
  meta,
  actions,
  standaloneLabel,
  headingLevel = 'h3',
}: CharacterCardProps) {
  const { t } = useTranslation();
  return (
    <Card variant='character' data-testid='character-card'>
      {/* Round 6 P2-10 — the identity block takes the row (min 12rem, its name wraps INSIDE it)
          and the actions never shrink: whether they sit beside it or drop below now depends on
          the actions' width, not the name's length — so cards in one list share one layout
          ("Mara Thistle" kept View inline while "Asher Vane · …" dropped it, at 360). */}
      <Stack direction='row' justify='between' align='center' className='flex-wrap'>
        <div className='min-w-0 flex-1 basis-48'>
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <Heading level='h3' as={headingLevel}>
              {character.name}
            </Heading>
            {character.status !== 'active' && (
              <Badge variant={characterStatusVariant[character.status]}>
                {characterStatusLabel(character.status, t)}
              </Badge>
            )}
            {standaloneLabel && !character.gameId && (
              <Badge variant='outline'>{standaloneLabel}</Badge>
            )}
          </Stack>
          {meta && (
            <Text variant='muted' size='sm'>
              {meta}
            </Text>
          )}
        </div>
        {actions && (
          <Stack direction='row' gap='sm' align='center' className='shrink-0 flex-wrap'>
            {actions}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
