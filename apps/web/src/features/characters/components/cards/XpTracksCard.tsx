'use client';

import { useState } from 'react';
import {
  desperateRollTrigger,
  sessionXpTriggers,
  usesXpTracks,
  xpMarks,
  xpTrackFull,
  xpTrackSize,
  PLAYBOOK_TRACK,
  type CharacterData,
  type RulesetContent,
} from '@heist-mind/core';
import { Button, Card, Heading, Select, Stack, Text, XpTrack } from '@heist-mind/ui';
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
  // RAW: end-of-session XP goes on ANY track the player wants (playbook or an attribute).
  const [sessionTrack, setSessionTrack] = useState<string>(PLAYBOOK_TRACK);
  if (!usesXpTracks(content)) return null;
  // The playbook's own trigger first, then the common ones; the desperate-roll trigger is not a
  // session trigger — the engine marks it with the roll, in the rolled action's attribute.
  const triggers = sessionXpTriggers(content, data.playbook);
  const desperate = desperateRollTrigger(content);
  const targetFull = xpTrackFull(content, data, sessionTrack);
  const trackName = (id: string) =>
    id === PLAYBOOK_TRACK
      ? t('components.characterSheet.playbook')
      : (content.attributes.find(a => a.id === id)?.name ?? id);

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
      interactive={canEdit && !busy}
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
        <Heading level='h3' as='h2'>
          {t('components.characterSheet.experience')}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('components.characterSheet.markXpPre')}
          <strong>{t('components.characterSheet.markXpBold')}</strong>
          {t('components.characterSheet.markXpPost')}
        </Text>

        {track(PLAYBOOK_TRACK, t('components.characterSheet.playbook'))}

        {triggers.length > 0 && (
          <Stack direction='column' gap='xs' data-testid='xp-session-triggers'>
            <Text as='strong' size='sm'>
              {t('components.characterSheet.sessionTriggersHeading')}
            </Text>
            {canEdit && (
              <Select
                label={t('components.characterSheet.sessionTrackLabel')}
                selectSize='sm'
                value={sessionTrack}
                onChange={e => setSessionTrack(e.target.value)}
              >
                {[PLAYBOOK_TRACK, ...content.attributes.map(a => a.id)].map(id => (
                  <option key={id} value={id}>
                    {trackName(id)}
                  </option>
                ))}
              </Select>
            )}
            {triggers.map(trigger => (
              <Stack key={trigger.id} direction='row' gap='sm' align='center' justify='between'>
                <Text variant='muted' size='sm'>
                  {trigger.description}
                </Text>
                {canEdit && (
                  <Stack direction='row' gap='xs'>
                    {[1, 2].map(times => (
                      <Button
                        key={times}
                        variant='outline'
                        size='sm'
                        disabled={busy || targetFull}
                        aria-label={t('components.characterSheet.markTriggerAria', {
                          count: trigger.value * times,
                          track: trackName(sessionTrack),
                          trigger: trigger.description,
                        })}
                        onClick={() =>
                          void onMarkXp(
                            sessionTrack,
                            xpMarks(data, sessionTrack) + trigger.value * times
                          )
                        }
                      >
                        +{trigger.value * times}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Stack>
            ))}
            <Text variant='muted' size='sm'>
              {t('components.characterSheet.sessionTriggersHelp')}
            </Text>
          </Stack>
        )}
        {desperate && (
          <Text variant='muted' size='sm' data-testid='xp-desperate-trigger'>
            {desperate.description} {t('components.characterSheet.desperateAuto')}
          </Text>
        )}

        {content.attributes.map(attr => track(attr.id, attr.name))}
      </Stack>
    </Card>
  );
}
