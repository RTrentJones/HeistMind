'use client';

import {
  usesXpTracks,
  xpMarks,
  xpTrackFull,
  xpTrackSize,
  PLAYBOOK_TRACK,
  type CharacterData,
  type RulesetContent,
} from '@heist-mind/core';
import { Button, Card, Heading, Stack, Text, XpTrack } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The Experience card (track rulesets): the playbook + attribute XP tracks with the ruleset's
 * trigger shortcuts. One concept surface — the sheet renders it live; pass `canEdit: false` to show
 * a read-only view (other players see the marks but can't change them — F42). A FULL track grows a
 * "Take advance" CTA (via `onAdvance`) that jumps straight to the editor's Advancement tab — the
 * spend used to be discoverable only through prose. Renders nothing for point-buy rulesets (they
 * use the flat XP badge instead).
 */
export function XpTracksCard({
  content,
  data,
  busy,
  canEdit,
  onMarkXp,
  onAdvance,
}: {
  content: RulesetContent;
  data: CharacterData;
  busy: boolean;
  canEdit: boolean;
  onMarkXp: (track: string, value: number) => void;
  onAdvance?: () => void;
}) {
  const { t } = useTranslation();
  if (!usesXpTracks(content)) return null;
  const triggers = content.advancement?.xpTriggers ?? [];
  const pbFull = xpTrackFull(content, data, PLAYBOOK_TRACK);

  const advanceCta =
    canEdit && onAdvance ? (
      <Button variant='ember' size='sm' disabled={busy} onClick={onAdvance}>
        {t('components.characterSheet.takeAdvance')}
      </Button>
    ) : undefined;

  const track = (id: string, label: string) => (
    <XpTrack
      key={id}
      data-testid={`xp-track-${id === PLAYBOOK_TRACK ? 'playbook' : id}`}
      label={label}
      current={xpMarks(data, id)}
      size={xpTrackSize(content, id)}
      interactive={canEdit}
      disabled={busy}
      readyLabel={t('components.characterSheet.fullReadyToAdvance')}
      action={advanceCta}
      markLabel={v => t('components.characterSheet.markXpAria', { count: v })}
      unmarkLabel={v => t('components.characterSheet.unmarkXpAria', { count: v })}
      onChange={v => void onMarkXp(id, v)}
    />
  );

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Heading level='h3'>{t('components.characterSheet.experience')}</Heading>
        <Text variant='muted' size='sm'>
          {t('components.characterSheet.markXpPre')}
          <strong>{t('components.characterSheet.markXpBold')}</strong>
          {t('components.characterSheet.markXpPost')}
        </Text>

        {track(PLAYBOOK_TRACK, t('components.characterSheet.playbook'))}

        {triggers.length > 0 && (
          <Stack direction='column' gap='xs'>
            {triggers.map(trigger => (
              <Stack key={trigger.id} direction='row' gap='sm' align='center' justify='between'>
                <Text variant='muted' size='sm'>
                  {trigger.description}
                </Text>
                {canEdit && (
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={busy || pbFull}
                    onClick={() =>
                      void onMarkXp(PLAYBOOK_TRACK, xpMarks(data, PLAYBOOK_TRACK) + trigger.value)
                    }
                  >
                    +{trigger.value}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {content.attributes.map(attr => track(attr.id, attr.name))}
      </Stack>
    </Card>
  );
}
