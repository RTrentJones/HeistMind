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
import { Badge, Button, Card, Heading, Stack, StressTracker, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The Experience card (track rulesets): the playbook + attribute XP tracks with the ruleset's
 * trigger shortcuts. One concept surface — the sheet renders it live; pass `canEdit: false` to show
 * a read-only view (other players see the marks but can't change them — F42). Renders nothing for
 * point-buy rulesets (they use the flat XP badge instead).
 */
export function XpTracksCard({
  content,
  data,
  busy,
  canEdit,
  onMarkXp,
}: {
  content: RulesetContent;
  data: CharacterData;
  busy: boolean;
  canEdit: boolean;
  onMarkXp: (track: string, value: number) => void;
}) {
  const { t } = useTranslation();
  if (!usesXpTracks(content)) return null;
  const triggers = content.advancement?.xpTriggers ?? [];
  const pbFull = xpTrackFull(content, data, PLAYBOOK_TRACK);
  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Heading level='h3'>{t('components.characterSheet.experience')}</Heading>
        <Text variant='muted' size='sm'>
          {t('components.characterSheet.markXpPre')}
          <strong>{t('components.characterSheet.markXpBold')}</strong>
          {t('components.characterSheet.markXpPost')}
        </Text>

        <div data-testid='xp-track-playbook'>
          <Stack direction='row' gap='sm' align='center'>
            <Text as='strong'>{t('components.characterSheet.playbook')}</Text>
            {pbFull && (
              <Badge variant='gold'>{t('components.characterSheet.fullReadyToAdvance')}</Badge>
            )}
          </Stack>
          <StressTracker
            current={xpMarks(data, PLAYBOOK_TRACK)}
            max={xpTrackSize(content, PLAYBOOK_TRACK)}
            interactive={canEdit}
            showNumbers
            showLabel={false}
            onChange={v => void onMarkXp(PLAYBOOK_TRACK, v)}
          />
        </div>

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

        {content.attributes.map(attr => (
          <div key={attr.id} data-testid={`xp-track-${attr.id}`}>
            <Stack direction='row' gap='sm' align='center'>
              <Text as='strong'>{attr.name}</Text>
              {xpTrackFull(content, data, attr.id) && (
                <Badge variant='gold'>{t('components.characterSheet.fullReadyToAdvance')}</Badge>
              )}
            </Stack>
            <StressTracker
              current={xpMarks(data, attr.id)}
              max={xpTrackSize(content, attr.id)}
              interactive={canEdit}
              showNumbers
              showLabel={false}
              onChange={v => void onMarkXp(attr.id, v)}
            />
          </div>
        ))}
      </Stack>
    </Card>
  );
}
