'use client';

import { useEffect, useRef, useState } from 'react';
import {
  availableArmor,
  clampStress,
  deriveAttributes,
  stressBounds,
  usesActionRatings,
  rulesetActions,
  viceStressCleared,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  PLAYBOOK_TRACK,
} from '@heist-mind/core';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorDisplay,
  Heading,
  Input,
  LoadingSpinner,
  Select,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCharacterDetail, useCharactersByGame } from '@/features/characters/data/queries';
import {
  useAddExperience,
  useClearHarm,
  useFlashback,
  useIndulgeVice,
  useTakeHarm,
  useUpdateCharacter,
  useUpdateCharacterData,
} from '@/features/characters/data/mutations';
import type { HarmLevel } from '@heist-mind/core';
import { viceDicePool } from '@heist-mind/engine';
import { useScoresByGame } from '@/features/scores/data/queries';
import { useTranslation } from '@/lib/i18n/hooks';
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { CharacterEditor } from './CharacterEditor';
import { LoadoutCard } from './LoadoutCard';
import { AttachToCampaign } from './AttachToCampaign';
import { GearCard } from './cards/GearCard';
import { HarmCard } from './cards/HarmCard';
import { XpTracksCard } from './cards/XpTracksCard';

/** View a character and modify it (rename, award XP, and edit the validated build). */
export function CharacterSheet({ characterId }: { characterId: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const characterQuery = useCharacterDetail(characterId);
  const character = characterQuery.data ?? null;
  // The campaign's active score — the loadout (below) is "for" it, and resets when it changes. A
  // standalone character has no campaign, so the scores query stays disabled and there's no active one.
  const scoresQuery = useScoresByGame(character?.gameId ?? undefined);
  const activeScore = (scoresQuery.data ?? []).find(s => s.status === 'active') ?? null;

  const updateChar = useUpdateCharacter(characterId);
  const updateCharData = useUpdateCharacterData(characterId);
  const addXpMut = useAddExperience(characterId, character?.gameId ?? null);
  const indulgeViceMut = useIndulgeVice(character?.gameId ?? null);
  const takeHarmMut = useTakeHarm(characterId, character?.gameId ?? null);
  const clearHarmMut = useClearHarm(characterId, character?.gameId ?? null);
  const flashbackMut = useFlashback(character?.gameId ?? null);
  // Campaign roster for the ASSIST move (F10) — teammates are everyone else's active characters.
  const rosterQuery = useCharactersByGame(character?.gameId ?? undefined);
  const teammates = (rosterQuery.data ?? [])
    .filter(c => c.id !== characterId && c.status === 'active')
    .map(c => ({ id: c.id, name: c.name }));

  // F73 — inline-save failures stay on the sheet (dismissible alert below); only load failures
  // swap the page for ErrorDisplay.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // The build editor: null = closed; a section = open on that tab. The sheet's "Take advance" CTA
  // opens it straight on Advancement (the spend used to hide behind Edit build → tab).
  const [editorSection, setEditorSection] = useState<'build' | 'advancement' | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const showEditor = editorSection !== null;
  useEffect(() => {
    if (editorSection) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editorSection]);
  const [name, setName] = useState('');
  const [viceNote, setViceNote] = useState<string | null>(null);
  const [viceArmed, setViceArmed] = useState(false);
  const [harmNote, setHarmNote] = useState<string | null>(null);
  // F44 — arm the next harm tap to spend armor (the harm lands one level lighter).
  const [armArmor, setArmArmor] = useState(false);
  // Flashback (F16): what you retro-establish + the stress the GM prices it at.
  const [flashText, setFlashText] = useState('');
  const [flashStress, setFlashStress] = useState(1);

  const busy =
    updateChar.isPending ||
    updateCharData.isPending ||
    addXpMut.isPending ||
    indulgeViceMut.isPending ||
    takeHarmMut.isPending ||
    clearHarmMut.isPending ||
    flashbackMut.isPending;

  const saveName = () => {
    const userId = user?.id;
    if (!userId || !name.trim()) return;
    updateChar.mutate(
      { userId, data: { name: name.trim() } },
      {
        onSuccess: () => setEditing(false),
        onError: e => setSaveError(e.message ?? t('components.characterSheet.saveNameFailed')),
      }
    );
  };

  const addXp = () => {
    const userId = user?.id;
    if (!userId || !character) return;
    addXpMut.mutate(
      {
        userId,
        amount: 1,
        reason: 'Manual award',
        logLabel: character.name,
        logNote: t('components.characterSheet.logXpMark'),
      },
      { onError: e => setSaveError(e.message ?? t('components.characterSheet.addXpFailed')) }
    );
  };

  // Live stress: clicking the tracker on the sheet face saves immediately (no "Edit build" needed).
  const setStress = (v: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const characterData = {
      ...character.characterData,
      stress: clampStress(character.ruleset.content, v),
    };
    updateCharData.mutate(
      { userId, data: { characterData } },
      {
        onError: e => setSaveError(e.message ?? t('components.characterSheet.saveStressFailed')),
      }
    );
  };

  // Downtime — Indulge Vice (FitD A3), an ENGINE use-case: the sheet realizes the dice (pool =
  // lowest attribute) and phrases the copy; the engine clears stress through the validated write
  // and logs the downtime to the shared feed.
  const indulgeVice = async () => {
    const userId = user?.id;
    if (!userId || !character) return;
    const { count, zeroDice } = viceDicePool(character);
    const results = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
    const cleared = viceStressCleared(results, { zeroDice });
    try {
      const outcome = await indulgeViceMut.mutateAsync({
        character,
        userId,
        results,
        zeroDice,
        logLabel: t('components.downtime.indulgeVice.logLabel', { count: cleared }),
      });
      // Overindulging (cleared more than was marked) is a real consequence the GM narrates.
      setViceNote(outcome.overindulged ? t('components.downtime.indulgeVice.overindulged') : null);
    } catch (e) {
      setSaveError((e as Error).message ?? t('components.downtime.indulgeVice.failed'));
    }
  };

  // Mark XP into a track (playbook or an attribute id) via the ENGINE `markXp` use-case — the
  // same path the Discord bot's `/xp mark` drives — so the mark lands through the validated write
  // AND logs an 'xp' event to the campaign feed (BRD R-C3; this was the one silent XP write, F70c).
  const setXp = (track: string, value: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const content = character.ruleset.content;
    const current = xpMarks(character.characterData, track);
    const target = Math.max(0, Math.min(value, xpTrackSize(content, track)));
    const delta = target - current;
    if (delta === 0) return;
    const trackName =
      track === PLAYBOOK_TRACK
        ? t('components.characterSheet.playbook')
        : (content.attributes.find(a => a.id === track)?.name ?? track);
    addXpMut.mutate(
      {
        userId,
        amount: delta,
        reason: 'Track mark',
        track,
        logLabel: character.name,
        logNote: t(
          delta > 0
            ? 'components.characterSheet.logXpMarkTrack'
            : 'components.characterSheet.logXpUnmarkTrack',
          { count: Math.abs(delta), track: trackName }
        ),
      },
      { onError: e => setSaveError(e.message ?? t('components.characterSheet.markXpFailed')) }
    );
  };

  // Harm quick actions (F65) — the same engine use-cases the bot's /harm take|clear drive: RAW
  // escalation past a full track, and a 'harm' feed event so the table sees the wound.
  const takeHarmQuick = (level: HarmLevel, description: string) => {
    const userId = user?.id;
    if (!userId || !character) return;
    setHarmNote(null);
    const spendArmor = armArmor;
    takeHarmMut.mutate(
      {
        userId,
        level,
        description,
        spendArmor,
        logLabel: character.name,
        logNote: applied =>
          applied === null
            ? t('components.characterSheet.logHarmAbsorbed', { description })
            : t('components.characterSheet.logHarmTaken', { level: applied, description }),
      },
      {
        onSuccess: ({ appliedLevel }) => {
          setArmArmor(false);
          if (appliedLevel === null) setHarmNote(t('components.characterSheet.harmAbsorbed'));
          else if (spendArmor)
            setHarmNote(t('components.characterSheet.harmArmorReduced', { level: appliedLevel }));
          else if (appliedLevel !== level)
            setHarmNote(t('components.characterSheet.harmEscalated', { level: appliedLevel }));
        },
        onError: e => setSaveError(e.message ?? t('components.characterSheet.harmFailed')),
      }
    );
  };
  const clearHarmQuick = (level: HarmLevel, description: string) => {
    const userId = user?.id;
    if (!userId || !character) return;
    setHarmNote(null);
    clearHarmMut.mutate(
      {
        userId,
        level,
        description,
        logLabel: character.name,
        logNote: t('components.characterSheet.logHarmCleared', { description }),
      },
      { onError: e => setSaveError(e.message ?? t('components.characterSheet.harmFailed')) }
    );
  };

  // Flashback (F16) — pay the priced stress and put the retro-established beat in the feed.
  const doFlashback = () => {
    const userId = user?.id;
    const text = flashText.trim();
    if (!userId || !character || !text) return;
    flashbackMut.mutate(
      {
        character,
        userId,
        stress: flashStress,
        logLabel: character.name,
        logNote: t('components.downtime.flashback.logNote', { count: flashStress, text }),
      },
      {
        onSuccess: () => setFlashText(''),
        onError: e => setSaveError(e.message ?? t('components.downtime.flashback.failed')),
      }
    );
  };

  if (characterQuery.isLoading) return <LoadingSpinner />;
  // A thrown query is a load failure, and a resolved-but-null character is a genuine not-found —
  // both swap the page. Inline-save failures render the dismissible alert inside the sheet instead.
  if (characterQuery.isError || !character) {
    const message = characterQuery.isError
      ? ((characterQuery.error as Error | null)?.message ??
        t('components.characterSheet.loadFailed'))
      : t('components.characterSheet.notFound');
    return (
      <ErrorDisplay
        title={t('components.characterSheet.loadError')}
        message={message ?? t('components.characterSheet.unknownError')}
      />
    );
  }

  // F23 — on action-rating rulesets the attributes are DERIVED (count of that attribute's actions
  // rated 1+, i.e. the resistance dice), never the creation-time snapshot: an advanced action dot
  // must move the resistance pool. Point-buy rulesets keep the stored values.
  const sheetContent = character.ruleset.content;
  const derivedMode = usesActionRatings(sheetContent);
  const attributes = derivedMode
    ? deriveAttributes(sheetContent, character.characterData)
    : (character.characterData?.attributes ?? {});
  const attributeName = (id: string) => sheetContent.attributes.find(a => a.id === id)?.name ?? id;
  const abilities = character.characterData?.specialAbilities ?? [];
  // F42 — mirror the RLS write policy (owner OR the campaign's GM) so viewers see a read-only
  // sheet instead of controls that render and then fail server-side.
  const canEdit =
    user?.id != null && (user.id === character.createdBy || user.id === character.game?.createdBy);

  return (
    <Stack direction='column' gap='lg'>
      {saveError && (
        <Alert variant='destructive' dismissible onDismiss={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}
      {/* F60 — a standalone sheet says so, instead of just silently missing the campaign sections. */}
      {!character.gameId && (
        <Alert variant='info' size='sm'>
          {t('components.characterSheet.standaloneBanner')}
        </Alert>
      )}
      <Card variant='character'>
        <Stack direction='column' gap='md'>
          {editing ? (
            <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
              <Input
                label={t('components.characterSheet.nameLabel')}
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Button variant='ember' onClick={saveName} loading={busy}>
                {t('common.actions.save')}
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setEditing(false);
                  setName(character.name);
                }}
              >
                {t('common.actions.cancel')}
              </Button>
            </Stack>
          ) : (
            <Stack direction='row' justify='between' align='center' className='flex-wrap'>
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                <Heading level='h2' variant='gradient'>
                  {character.name}
                </Heading>
                {character.status !== 'active' && (
                  <Badge
                    variant={character.status === 'dead' ? 'stress-critical' : 'steel'}
                    className='capitalize'
                  >
                    {character.status}
                  </Badge>
                )}
              </Stack>
              {canEdit && (
                <Stack direction='row' gap='sm' align='center'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setEditing(true);
                      setName(character.name);
                    }}
                  >
                    {t('common.actions.edit')}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setEditorSection(s => (s ? null : 'build'))}
                  >
                    {showEditor
                      ? t('components.characterSheet.closeEditor')
                      : t('components.characterSheet.editBuild')}
                  </Button>
                </Stack>
              )}
            </Stack>
          )}

          <Text variant='muted'>
            {character.ruleset.name} · {character.playbookType}
          </Text>

          {/* Flat XP pool (point-buy rulesets); track rulesets show the Experience card below. */}
          {!usesXpTracks(character.ruleset.content) && (
            <Stack direction='row' gap='sm' align='center'>
              <Badge variant='gold'>
                {t('components.characterSheet.xpBadge', { xp: character.experiencePoints })}
              </Badge>
              {canEdit && (
                <Button variant='outline' size='sm' onClick={addXp} loading={busy}>
                  {t('components.characterSheet.addXp')}
                </Button>
              )}
            </Stack>
          )}

          <div>
            <Text as='strong'>{t('components.characterSheet.attributes')}</Text>
            {derivedMode ? (
              // Derived mode shows EVERY attribute (0 is a real resistance pool — zero-dice).
              <>
                <Stack direction='row' gap='sm' className='flex-wrap'>
                  {sheetContent.attributes.map(a => (
                    <Badge key={a.id} variant='steel' data-testid={`sheet-attr-${a.id}`}>
                      {a.name} {attributes[a.id] ?? 0}
                    </Badge>
                  ))}
                </Stack>
                <Text variant='muted' size='sm'>
                  {t('components.characterSheet.attributesDerived')}
                </Text>
              </>
            ) : (
              <Stack direction='row' gap='sm' className='flex-wrap'>
                {Object.entries(attributes).filter(([, v]) => v > 0).length > 0 ? (
                  Object.entries(attributes)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <Badge key={k} variant='steel'>
                        {attributeName(k)} {v}
                      </Badge>
                    ))
                ) : (
                  <Text variant='muted' size='sm'>
                    {t('components.characterSheet.noPoints')}
                  </Text>
                )}
              </Stack>
            )}
          </div>
        </Stack>
      </Card>

      {/* F57 — phone-first ordering: below `sm`, the flex `order-*` classes pull the IN-PLAY
          sections (Condition, Dice) up under the name card and push build detail (abilities,
          campaign controls) down. Desktop keeps the DOM order. */}
      {/* Owner campaign controls (Phase 5/5b): bring a standalone character to a campaign, or move /
          return an in-campaign one. The component picks its mode from whether the character is linked. */}
      {character.createdBy === user?.id && (
        <div className='max-sm:order-3'>
          <AttachToCampaign character={character} />
        </div>
      )}

      {/* Abilities live in their own (non-animated) card so the expandable rules are clickable. */}
      <Card variant='outline' className='max-sm:order-2'>
        <Stack direction='column' gap='md'>
          <Heading level='h3'>{t('components.characterSheet.specialAbilities')}</Heading>
          {abilities.length > 0 ? (
            <Stack direction='column' gap='xs'>
              {abilities.map(id => {
                const def = character.ruleset.content.specialAbilities?.find(a => a.id === id);
                return (
                  <details key={id} className='rounded-md border border-border-primary px-3 py-2'>
                    <summary className='cursor-pointer'>
                      <span className='font-display'>{def?.name ?? id}</span>
                      {def?.tier != null && (
                        <Badge variant='gold' size='sm' className='ml-2'>
                          {t('components.characterSheet.tier', { tier: def.tier })}
                        </Badge>
                      )}
                    </summary>
                    <Text variant='muted' size='sm' className='mt-2'>
                      {def?.rules ?? def?.description ?? t('components.characterSheet.noRulesText')}
                    </Text>
                  </details>
                );
              })}
            </Stack>
          ) : (
            <Text variant='muted' size='sm'>
              {t('components.characterSheet.noneChosen')}
            </Text>
          )}
        </Stack>
      </Card>

      <Card variant='outline'>
        <Stack direction='column' gap='md'>
          <Heading level='h3'>{t('components.characterSheet.condition')}</Heading>
          <StressTracker
            current={character.characterData?.stress ?? 0}
            max={stressBounds(character.ruleset.content).max}
            interactive={canEdit}
            showNumbers
            size='lg'
            onChange={v => void setStress(v)}
          />
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            {canEdit && (
              // F60 — indulging rolls dice and clears a rolled amount; a misclick shouldn't spend
              // the downtime. Two-click confirm, disarmed on blur.
              <Button
                variant='outline'
                size='sm'
                loading={busy}
                disabled={(character.characterData?.stress ?? 0) === 0}
                onClick={() => {
                  if (!viceArmed) {
                    setViceArmed(true);
                    return;
                  }
                  setViceArmed(false);
                  void indulgeVice();
                }}
                onBlur={() => setViceArmed(false)}
              >
                {viceArmed
                  ? t('components.downtime.indulgeVice.confirm')
                  : t('components.downtime.indulgeVice.action')}
              </Button>
            )}
            {character.characterData?.vice && (
              <Text variant='muted' size='sm'>
                {t('components.downtime.indulgeVice.viceLabel', {
                  vice: character.characterData.vice,
                })}
              </Text>
            )}
          </Stack>
          {viceNote && (
            <Alert variant='warning' size='sm'>
              {viceNote}
            </Alert>
          )}
          <HarmCard
            content={character.ruleset.content}
            data={character.characterData}
            {...(canEdit
              ? {
                  quick: {
                    busy,
                    onTake: takeHarmQuick,
                    onClear: clearHarmQuick,
                    // F44 — spend armor: offered while the loadout carries unspent armor.
                    armor: {
                      available: availableArmor(sheetContent, character.characterData).length,
                      armed: armArmor,
                      onToggle: () => setArmArmor(a => !a),
                    },
                  },
                }
              : {})}
          />
          {harmNote && (
            <Alert variant='warning' size='sm'>
              {harmNote}
            </Alert>
          )}
        </Stack>
      </Card>

      {/* F57 — between-beat sections: on a phone these sit below Condition + Dice (order-1). */}
      <Stack direction='column' gap='lg' className='max-sm:order-1'>
        <XpTracksCard
          content={character.ruleset.content}
          data={character.characterData}
          busy={busy}
          canEdit={canEdit}
          onMarkXp={setXp}
          onAdvance={() => setEditorSection('advancement')}
        />

        {/* Per-score loadout (BitD: chosen per operation, as you go) — lives on the sheet, not the
            build editor. Resets against the campaign's active score. */}
        <LoadoutCard character={character} activeScore={activeScore} canEdit={canEdit} />

        <GearCard data={character.characterData} />
      </Stack>

      {/* Dice + shared campaign log: only in a campaign. A standalone character (Phase 5) has no
          shared feed — its sheet is the rules-valid build, brought to a table when you attach it. */}
      {character.gameId && (
        <Card variant='outline'>
          <Stack direction='column' gap='md'>
            <Heading level='h3'>{t('components.characterSheet.dice')}</Heading>
            {/* F23 — resistance rolls the ATTRIBUTE (derived on action-rating rulesets, stored on
                point-buy ones), matching the sheet's Attributes badges. */}
            {derivedMode ? (
              <RollPanel
                gameId={character.gameId}
                characterId={character.id}
                actions={rulesetActions(sheetContent).map(name => ({
                  name,
                  rating: character.characterData?.skills?.[name] ?? 0,
                }))}
                attributes={sheetContent.attributes.map(a => ({
                  name: a.name,
                  rating: attributes[a.id] ?? 0,
                }))}
                harm={character.characterData?.harm}
                teammates={teammates}
              />
            ) : (
              <RollPanel
                gameId={character.gameId}
                characterId={character.id}
                attributes={sheetContent.attributes.map(a => ({
                  name: a.name,
                  rating: attributes[a.id] ?? 0,
                }))}
                teammates={teammates}
              />
            )}
            {/* Flashback (F16) — spend stress to retro-establish; the feed carries the beat. */}
            {canEdit && (
              <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
                <Input
                  size='sm'
                  label={t('components.downtime.flashback.label')}
                  placeholder={t('components.downtime.flashback.placeholder')}
                  value={flashText}
                  onChange={e => setFlashText(e.target.value)}
                />
                <Select
                  aria-label={t('components.downtime.flashback.stressLabel')}
                  selectSize='sm'
                  value={flashStress}
                  onChange={e => setFlashStress(Number(e.target.value))}
                >
                  {[0, 1, 2].map(n => (
                    <option key={n} value={n}>
                      {t('components.downtime.flashback.stressOption', { count: n })}
                    </option>
                  ))}
                </Select>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={!flashText.trim() || busy}
                  onClick={doFlashback}
                >
                  {t('components.downtime.flashback.action')}
                </Button>
              </Stack>
            )}
            <RollLog gameId={character.gameId} />
          </Stack>
        </Card>
      )}

      {editorSection && canEdit && (
        // order-last: the F57 mobile reorder must never pull sections below the opened editor.
        <div ref={editorRef} className='max-sm:order-last'>
          <CharacterEditor character={character} initialSection={editorSection} />
        </div>
      )}
    </Stack>
  );
}
