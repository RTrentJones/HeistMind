'use client';

import { useEffect, useState } from 'react';
import {
  clampStress,
  stressBounds,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  PLAYBOOK_TRACK,
  type CharacterData,
  type CharacterWithDetails,
  type CrewContext,
} from '@heist-mind/database';
import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Input,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';
import { useCrewByGame } from '@/features/crews/data/queries';
import { useCharacterAdvancement } from '@/features/characters/lib/use-character-advancement';
import { HarmCard } from './cards/HarmCard';
import { GearCard } from './cards/GearCard';
import { CrewBenefits } from './advancement/CrewBenefits';
import { AdvancementOptions } from './advancement/AdvancementOptions';
import { ActionDotOptions } from './advancement/ActionDotOptions';
import { useTranslation } from '@/lib/i18n/hooks';

type Section = 'build' | 'stress' | 'gear' | 'advancement';

/**
 * Validity-gated character editor — a thin composition over the shared concept cards (`HarmCard`,
 * `GearCard`) and `useCharacterAdvancement` (validated saves + XP-spend advancement). Every save
 * runs the same ruleset rules the server enforces, so the editor can only ever persist a legal
 * config. Writes invalidate the character queries, so the sheet's detail query refetches and the
 * fresh `character` prop resyncs the draft below — no save callback needed.
 */
export function CharacterEditor({ character }: { character: CharacterWithDetails }) {
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const bounds = stressBounds(content);

  const [section, setSection] = useState<Section>('build');
  const [draft, setDraft] = useState<CharacterData>(() => structuredClone(character.characterData));

  // The campaign's crew, so level-ups validate in context: its abilities RAISE the live bounds —
  // Mastery lifts the action cap (so a member can advance an action to 4), Deadly grants bonus dots,
  // Mule raises load. A standalone character (Phase 5) has no crew → validates against the ruleset alone.
  const crewQuery = useCrewByGame(character.gameId ?? undefined);
  const crew: CrewContext | null = crewQuery.data
    ? { crewAbilities: crewQuery.data.crewAbilities }
    : null;

  const { saving, error, saveBuild, buyAbility, advanceAction } = useCharacterAdvancement(
    character,
    crew
  );

  // Resync the editable draft whenever the character reloads (e.g. after an advancement),
  // keeping the active section. Saves persist, so clobbering unsaved edits here is acceptable.
  useEffect(() => {
    setDraft(structuredClone(character.characterData));
  }, [character.id, character.updatedAt]);

  const patch = (p: Partial<CharacterData>) => setDraft(d => ({ ...d, ...p }));

  // Loadout moved off the build to the character sheet (it's a per-score choice, not a build/advance).
  const playbook = content.playbooks.find(p => p.id === draft.playbook);
  const playbookContacts = playbook?.contacts ?? [];

  const tab = (id: Section, label: string) => (
    <Button variant={section === id ? 'ember' : 'outline'} size='sm' onClick={() => setSection(id)}>
      {label}
    </Button>
  );

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='md'>
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          {tab('build', t('components.characterEditor.tabBuild'))}
          {tab('stress', t('components.characterEditor.tabStress'))}
          {tab('gear', t('components.characterEditor.tabGear'))}
          {tab('advancement', t('components.characterEditor.tabAdvancement'))}
        </Stack>

        {error && (
          <Alert variant='destructive' size='sm'>
            {error}
          </Alert>
        )}

        {section === 'build' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>{t('components.characterEditor.identity')}</Heading>
            <Stack direction='column' gap='sm' className='max-w-md'>
              <Input
                label={t('components.characterEditor.heritage')}
                value={draft.heritage ?? ''}
                onChange={e => patch({ heritage: e.target.value })}
              />
              <Input
                label={t('components.characterEditor.background')}
                value={draft.background ?? ''}
                onChange={e => patch({ background: e.target.value })}
              />
              <Input
                label={t('components.characterEditor.vice')}
                value={draft.vice ?? ''}
                onChange={e => patch({ vice: e.target.value })}
              />
            </Stack>

            <Heading level='h3'>{t('components.characterEditor.attributes')}</Heading>
            <Text variant='muted' size='sm'>
              {t('components.characterEditor.attributesNote')}
            </Text>
            {content.attributes.map(attr => (
              <Card key={attr.id} variant='default'>
                <div className='flex flex-wrap items-center justify-between gap-2.5'>
                  <span className='font-display' style={{ fontSize: 18 }}>
                    {attr.name}
                  </span>
                </div>
                <StressTracker
                  current={draft.attributes[attr.id] ?? 0}
                  max={attr.maxValue ?? 4}
                  interactive
                  showNumbers
                  showLabel={false}
                  size='lg'
                  onChange={v =>
                    patch({ attributes: { ...draft.attributes, [attr.id]: Math.max(0, v) } })
                  }
                />
              </Card>
            ))}

            <Button variant='ember' onClick={() => void saveBuild(draft)} loading={saving}>
              {t('components.characterEditor.saveBuild')}
            </Button>
          </Stack>
        )}

        {section === 'stress' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>{t('components.characterEditor.stress')}</Heading>
            <StressTracker
              current={draft.stress}
              max={bounds.max}
              interactive
              showNumbers
              size='lg'
              onChange={v => patch({ stress: clampStress(content, v) })}
            />
            {draft.stress >= bounds.max && (
              <Alert variant='warning' size='sm'>
                {t('components.characterEditor.stressMaxed')}
              </Alert>
            )}

            <HarmCard content={content} data={draft} edit={{ onPatch: patch }} />

            <Button variant='ember' onClick={() => void saveBuild(draft)} loading={saving}>
              {t('components.characterEditor.saveStress')}
            </Button>
          </Stack>
        )}

        {section === 'gear' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>{t('components.characterEditor.loadout')}</Heading>
            <Text variant='muted' size='sm'>
              {t('components.characterEditor.loadoutMoved')}
            </Text>

            <GearCard data={draft} edit={{ playbookContacts, onPatch: patch }} />

            <Button variant='ember' onClick={() => void saveBuild(draft)} loading={saving}>
              {t('components.characterEditor.saveGear')}
            </Button>
          </Stack>
        )}

        {section === 'advancement' && (
          <CrewBenefits content={content} data={character.characterData} crew={crew} />
        )}
        {section === 'advancement' &&
          (usesXpTracks(content) ? (
            <Stack direction='column' gap='md'>
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                <Badge
                  variant={
                    xpTrackFull(content, character.characterData, PLAYBOOK_TRACK) ? 'gold' : 'steel'
                  }
                >
                  {t('components.characterEditor.playbookTrack', {
                    marks: xpMarks(character.characterData, PLAYBOOK_TRACK),
                    size: xpTrackSize(content, PLAYBOOK_TRACK),
                  })}
                </Badge>
                {content.attributes.map(a => (
                  <Badge
                    key={a.id}
                    variant={xpTrackFull(content, character.characterData, a.id) ? 'gold' : 'steel'}
                  >
                    {a.name} {xpMarks(character.characterData, a.id)}/{xpTrackSize(content, a.id)}
                  </Badge>
                ))}
              </Stack>
              <Heading level='h3'>{t('components.characterEditor.specialAbilities')}</Heading>
              <AdvancementOptions character={character} onBuy={buyAbility} saving={saving} />
              <Heading level='h3'>{t('components.characterEditor.actionDots')}</Heading>
              <ActionDotOptions
                character={character}
                crew={crew}
                onAdvance={advanceAction}
                saving={saving}
              />
            </Stack>
          ) : (
            <Stack direction='column' gap='md'>
              <Stack direction='row' gap='sm' align='center'>
                <Badge variant='gold'>
                  {t('components.characterEditor.xpAvailable', { xp: character.experiencePoints })}
                </Badge>
              </Stack>
              <AdvancementOptions character={character} onBuy={buyAbility} saving={saving} />
            </Stack>
          ))}
      </Stack>
    </Card>
  );
}
