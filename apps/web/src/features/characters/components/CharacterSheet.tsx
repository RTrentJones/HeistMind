'use client';

import { useState } from 'react';
import {
  stressBounds,
  usesActionRatings,
  rulesetActions,
  deriveAttributes,
  diceForRating,
  viceStressCleared,
  isOverindulged,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  markXp,
} from '@heist-mind/database';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorDisplay,
  Heading,
  Input,
  LoadingSpinner,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCharacterDetail } from '@/features/characters/data/queries';
import {
  useAddExperience,
  useUpdateCharacter,
  useUpdateCharacterData,
} from '@/features/characters/data/mutations';
import { useCreateRoll } from '@/features/rolls/data/mutations';
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
  const addXpMut = useAddExperience(characterId);
  const createRoll = useCreateRoll(character?.gameId ?? '');

  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState('');
  const [viceNote, setViceNote] = useState<string | null>(null);

  const busy =
    updateChar.isPending || updateCharData.isPending || addXpMut.isPending || createRoll.isPending;

  const saveName = () => {
    const userId = user?.id;
    if (!userId || !name.trim()) return;
    updateChar.mutate(
      { userId, data: { name: name.trim() } },
      {
        onSuccess: () => setEditing(false),
        onError: e => setError(e.message ?? t('components.characterSheet.saveNameFailed')),
      }
    );
  };

  const addXp = () => {
    const userId = user?.id;
    if (!userId) return;
    addXpMut.mutate(
      { userId, amount: 1, reason: 'Manual award' },
      { onError: e => setError(e.message ?? t('components.characterSheet.addXpFailed')) }
    );
  };

  // Live stress: clicking the tracker on the sheet face saves immediately (no "Edit build" needed).
  const setStress = (v: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const max = stressBounds(character.ruleset.content).max;
    const characterData = { ...character.characterData, stress: Math.max(0, Math.min(v, max)) };
    updateCharData.mutate(
      { userId, data: { characterData } },
      {
        onError: e => setError(e.message ?? t('components.characterSheet.saveStressFailed')),
      }
    );
  };

  // Downtime — Indulge Vice (FitD A3): clear ALL stress through the same validated write path the
  // tracker uses, then log a no-dice "downtime" entry so the indulgence shows in the shared feed.
  const indulgeVice = async () => {
    const userId = user?.id;
    if (!userId || !character) return;
    // BitD vice roll: roll dice equal to your LOWEST attribute rating, clear stress = highest die.
    const stress = character.characterData?.stress ?? 0;
    const attrs = Object.values(
      deriveAttributes(character.ruleset.content, character.characterData)
    );
    const lowest = attrs.length > 0 ? Math.min(...attrs) : 0;
    const { count, zeroDice } = diceForRating(lowest);
    const results = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
    const cleared = viceStressCleared(results, { zeroDice });
    const overindulged = isOverindulged(cleared, stress);
    const nextStress = Math.max(0, stress - cleared);
    try {
      await updateCharData.mutateAsync({
        userId,
        data: { characterData: { ...character.characterData, stress: nextStress } },
      });
      // Log the downtime to the campaign feed — only when the character is in a campaign (a
      // standalone character still clears stress, it just has no shared log to write to).
      if (character.gameId) {
        await createRoll.mutateAsync({
          userId,
          data: {
            gameId: character.gameId,
            characterId: character.id,
            kind: 'downtime',
            label: t('components.downtime.indulgeVice.logLabel', { count: cleared }),
            dice: count,
            results,
          },
        });
      }
      // Overindulging (cleared more than was marked) is a real consequence the GM narrates.
      setViceNote(overindulged ? t('components.downtime.indulgeVice.overindulged') : null);
    } catch (e) {
      setError((e as Error).message ?? t('components.downtime.indulgeVice.failed'));
    }
  };

  // Mark XP into a track (playbook or an attribute id). Sets the track to `value`, clamped, and
  // saves through the same validated path — every player sees the marks on load (the async loop).
  const setXp = (track: string, value: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const content = character.ruleset.content;
    const current = xpMarks(character.characterData, track);
    const target = Math.max(0, Math.min(value, xpTrackSize(content, track)));
    if (target === current) return;
    const xp = markXp(content, character.characterData, track, target - current);
    updateCharData.mutate(
      { userId, data: { characterData: { ...character.characterData, xp } } },
      {
        onError: e => setError(e.message ?? t('components.characterSheet.markXpFailed')),
      }
    );
  };

  if (characterQuery.isLoading) return <LoadingSpinner />;
  // A save error blows the sheet back to the error state (unchanged from the pre-seam behavior);
  // a thrown query is a load failure, and a resolved-but-null character is a genuine not-found.
  if (error || characterQuery.isError || !character) {
    const message =
      error ??
      (characterQuery.isError
        ? ((characterQuery.error as Error | null)?.message ??
          t('components.characterSheet.loadFailed'))
        : t('components.characterSheet.notFound'));
    return (
      <ErrorDisplay
        title={t('components.characterSheet.loadError')}
        message={message ?? t('components.characterSheet.unknownError')}
      />
    );
  }

  const attributes = character.characterData?.attributes ?? {};
  const abilities = character.characterData?.specialAbilities ?? [];
  // F42 — mirror the RLS write policy (owner OR the campaign's GM) so viewers see a read-only
  // sheet instead of controls that render and then fail server-side.
  const canEdit =
    user?.id != null && (user.id === character.createdBy || user.id === character.game?.createdBy);

  return (
    <Stack direction='column' gap='lg'>
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
                  <Button variant='outline' size='sm' onClick={() => setShowEditor(s => !s)}>
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
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {Object.entries(attributes).filter(([, v]) => v > 0).length > 0 ? (
                Object.entries(attributes)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <Badge key={k} variant='steel'>
                      {k} {v}
                    </Badge>
                  ))
              ) : (
                <Text variant='muted' size='sm'>
                  {t('components.characterSheet.noPoints')}
                </Text>
              )}
            </Stack>
          </div>
        </Stack>
      </Card>

      {/* Owner campaign controls (Phase 5/5b): bring a standalone character to a campaign, or move /
          return an in-campaign one. The component picks its mode from whether the character is linked. */}
      {character.createdBy === user?.id && <AttachToCampaign character={character} />}

      {/* Abilities live in their own (non-animated) card so the expandable rules are clickable. */}
      <Card variant='outline'>
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
              <Button
                variant='outline'
                size='sm'
                loading={busy}
                disabled={(character.characterData?.stress ?? 0) === 0}
                onClick={() => void indulgeVice()}
              >
                {t('components.downtime.indulgeVice.action')}
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
          <HarmCard content={character.ruleset.content} data={character.characterData} />
        </Stack>
      </Card>

      <XpTracksCard
        content={character.ruleset.content}
        data={character.characterData}
        busy={busy}
        canEdit={canEdit}
        onMarkXp={setXp}
      />

      {/* Per-score loadout (BitD: chosen per operation, as you go) — lives on the sheet, not the
          build editor. Resets against the campaign's active score. */}
      <LoadoutCard character={character} activeScore={activeScore} canEdit={canEdit} />

      <GearCard data={character.characterData} />

      {/* Dice + shared campaign log: only in a campaign. A standalone character (Phase 5) has no
          shared feed — its sheet is the rules-valid build, brought to a table when you attach it. */}
      {character.gameId && (
        <Card variant='outline'>
          <Stack direction='column' gap='md'>
            <Heading level='h3'>{t('components.characterSheet.dice')}</Heading>
            {usesActionRatings(character.ruleset.content) ? (
              <RollPanel
                gameId={character.gameId}
                characterId={character.id}
                actions={rulesetActions(character.ruleset.content).map(name => ({
                  name,
                  rating: character.characterData?.skills?.[name] ?? 0,
                }))}
              />
            ) : (
              <RollPanel gameId={character.gameId} characterId={character.id} />
            )}
            <RollLog gameId={character.gameId} />
          </Stack>
        </Card>
      )}

      {showEditor && canEdit && <CharacterEditor character={character} />}
    </Stack>
  );
}
