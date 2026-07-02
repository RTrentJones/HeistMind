import type { ReactNode } from 'react';
import type { Character, CharacterStatus } from '@heist-mind/core';
import { Badge, Card, Heading, Stack, Text } from '@heist-mind/ui';

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
}

/**
 * The one character summary card, shared by the campaign roster, the dashboard, and My Characters.
 * Surface-specific bits (the meta line, the action buttons, the standalone badge) come in as props so
 * the card itself stays a single implementation.
 */
export function CharacterCard({ character, meta, actions, standaloneLabel }: CharacterCardProps) {
  return (
    <Card variant='character'>
      <Stack direction='row' justify='between' align='center' className='flex-wrap'>
        <div>
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <Heading level='h3'>{character.name}</Heading>
            {character.status !== 'active' && (
              <Badge variant={characterStatusVariant[character.status]} className='capitalize'>
                {character.status}
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
          <Stack direction='row' gap='sm' align='center'>
            {actions}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
