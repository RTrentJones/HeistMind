'use client';

import { useEffect, useState } from 'react';
import {
  stressBounds,
  harmBounds,
  effectiveLoadLimit,
  loadUsed,
  usesActionRatings,
  rulesetActions,
  deriveAttributes,
  diceForRating,
  viceStressCleared,
  isOverindulged,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  markXp,
  PLAYBOOK_TRACK,
  type CharacterWithDetails,
} from '@heist-mind/database';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorDisplay,
  HarmTracker,
  Heading,
  Input,
  LoadingSpinner,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';

const EMPTY_HARM = { lesser: [], moderate: [], severe: [] };
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { CharacterEditor } from './CharacterEditor';

/** View a character and modify it (rename, award XP, and edit the validated build). */
export function CharacterSheet({ characterId }: { characterId: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [character, setCharacter] = useState<CharacterWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [viceNote, setViceNote] = useState<string | null>(null);

  const load = async () => {
    const result = await getRepositories().characters.findWithDetails(characterId);
    if (!result.success || !result.data) {
      setError(
        result.success
          ? t('components.characterSheet.notFound')
          : (result.error?.message ?? t('components.characterSheet.loadFailed'))
      );
    } else {
      setCharacter(result.data);
      setName(result.data.name);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const saveName = async () => {
    const userId = user?.id;
    if (!userId || !name.trim()) return;
    setSaving(true);
    const result = await getRepositories().characters.update(characterId, userId, {
      name: name.trim(),
    });
    setSaving(false);
    if (result.success) {
      setEditing(false);
      await load();
    } else {
      setError(result.error?.message ?? t('components.characterSheet.saveNameFailed'));
    }
  };

  const addXp = async () => {
    const userId = user?.id;
    if (!userId) return;
    setSaving(true);
    const result = await getRepositories().characters.addExperience(
      characterId,
      userId,
      1,
      'Manual award'
    );
    setSaving(false);
    if (result.success) await load();
    else setError(result.error?.message ?? t('components.characterSheet.addXpFailed'));
  };

  // Live stress: clicking the tracker on the sheet face saves immediately (no "Edit build" needed).
  const setStress = async (v: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const max = stressBounds(character.ruleset.content).max;
    const characterData = { ...character.characterData, stress: Math.max(0, Math.min(v, max)) };
    setSaving(true);
    const r = await getRepositories().characterManagement.updateCharacterWithValidation(
      characterId,
      userId,
      { characterData }
    );
    setSaving(false);
    if (r.success) await load();
    else setError(r.error?.message ?? t('components.characterSheet.saveStressFailed'));
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
    setSaving(true);
    const r = await getRepositories().characterManagement.updateCharacterWithValidation(
      characterId,
      userId,
      { characterData: { ...character.characterData, stress: nextStress } }
    );
    if (r.success) {
      await getRepositories().rolls.create(userId, {
        gameId: character.gameId,
        characterId: character.id,
        kind: 'downtime',
        label: t('components.downtime.indulgeVice.logLabel', { count: cleared }),
        dice: count,
        results,
      });
      // Overindulging (cleared more than was marked) is a real consequence the GM narrates.
      setViceNote(overindulged ? t('components.downtime.indulgeVice.overindulged') : null);
      setRollKey(k => k + 1); // refresh the feed so the new downtime entry appears
      await load();
    } else {
      setError(r.error?.message ?? t('components.downtime.indulgeVice.failed'));
    }
    setSaving(false);
  };

  // A roll (action/fortune/resistance) can mutate the character (resistance spends stress), so
  // refresh BOTH the roll log AND the sheet — otherwise the StressTracker would show stale stress.
  const onRolled = () => {
    setRollKey(k => k + 1);
    void load();
  };

  // Mark XP into a track (playbook or an attribute id). Sets the track to `value`, clamped, and
  // saves through the same validated path — every player sees the marks on load (the async loop).
  const setXp = async (track: string, value: number) => {
    const userId = user?.id;
    if (!userId || !character) return;
    const content = character.ruleset.content;
    const current = xpMarks(character.characterData, track);
    const target = Math.max(0, Math.min(value, xpTrackSize(content, track)));
    if (target === current) return;
    const xp = markXp(content, character.characterData, track, target - current);
    setSaving(true);
    const r = await getRepositories().characterManagement.updateCharacterWithValidation(
      characterId,
      userId,
      { characterData: { ...character.characterData, xp } }
    );
    setSaving(false);
    if (r.success) await load();
    else setError(r.error?.message ?? t('components.characterSheet.markXpFailed'));
  };

  if (loading) return <LoadingSpinner />;
  if (error || !character) {
    return (
      <ErrorDisplay
        title={t('components.characterSheet.loadError')}
        message={error ?? t('components.characterSheet.unknownError')}
      />
    );
  }

  const attributes = character.characterData?.attributes ?? {};
  const abilities = character.characterData?.specialAbilities ?? [];

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
              <Button variant='ember' onClick={saveName} loading={saving}>
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
            <Stack direction='row' justify='between' align='center'>
              <Heading level='h2' variant='gradient'>
                {character.name}
              </Heading>
              <Stack direction='row' gap='sm' align='center'>
                <Button variant='outline' size='sm' onClick={() => setEditing(true)}>
                  {t('common.actions.edit')}
                </Button>
                <Button variant='outline' size='sm' onClick={() => setShowEditor(s => !s)}>
                  {showEditor
                    ? t('components.characterSheet.closeEditor')
                    : t('components.characterSheet.editBuild')}
                </Button>
              </Stack>
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
              <Button variant='outline' size='sm' onClick={addXp} loading={saving}>
                {t('components.characterSheet.addXp')}
              </Button>
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
            interactive
            showNumbers
            size='lg'
            onChange={v => void setStress(v)}
          />
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <Button
              variant='outline'
              size='sm'
              loading={saving}
              disabled={(character.characterData?.stress ?? 0) === 0}
              onClick={() => void indulgeVice()}
            >
              {t('components.downtime.indulgeVice.action')}
            </Button>
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
          <div>
            <Text as='strong'>{t('components.characterSheet.harm')}</Text>
            <HarmTracker
              harm={character.characterData?.harm ?? EMPTY_HARM}
              bounds={harmBounds(character.ruleset.content)}
            />
          </div>
          {(character.characterData?.trauma?.length ?? 0) > 0 && (
            <div>
              <Text as='strong'>{t('components.characterSheet.trauma')}</Text>
              <Stack direction='row' gap='sm' className='flex-wrap'>
                {character.characterData.trauma.map(condition => (
                  <Badge key={condition} variant='stress-critical'>
                    {condition}
                  </Badge>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </Card>

      {usesXpTracks(character.ruleset.content) &&
        (() => {
          const content = character.ruleset.content;
          const data = character.characterData;
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
                      <Badge variant='gold'>
                        {t('components.characterSheet.fullReadyToAdvance')}
                      </Badge>
                    )}
                  </Stack>
                  <StressTracker
                    current={xpMarks(data, PLAYBOOK_TRACK)}
                    max={xpTrackSize(content, PLAYBOOK_TRACK)}
                    interactive
                    showNumbers
                    showLabel={false}
                    onChange={v => void setXp(PLAYBOOK_TRACK, v)}
                  />
                </div>

                {triggers.length > 0 && (
                  <Stack direction='column' gap='xs'>
                    {triggers.map(trigger => (
                      <Stack
                        key={trigger.id}
                        direction='row'
                        gap='sm'
                        align='center'
                        justify='between'
                      >
                        <Text variant='muted' size='sm'>
                          {trigger.description}
                        </Text>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={saving || pbFull}
                          onClick={() =>
                            void setXp(
                              PLAYBOOK_TRACK,
                              xpMarks(data, PLAYBOOK_TRACK) + trigger.value
                            )
                          }
                        >
                          +{trigger.value}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                )}

                {content.attributes.map(attr => (
                  <div key={attr.id} data-testid={`xp-track-${attr.id}`}>
                    <Stack direction='row' gap='sm' align='center'>
                      <Text as='strong'>{attr.name}</Text>
                      {xpTrackFull(content, data, attr.id) && (
                        <Badge variant='gold'>
                          {t('components.characterSheet.fullReadyToAdvance')}
                        </Badge>
                      )}
                    </Stack>
                    <StressTracker
                      current={xpMarks(data, attr.id)}
                      max={xpTrackSize(content, attr.id)}
                      interactive
                      showNumbers
                      showLabel={false}
                      onChange={v => void setXp(attr.id, v)}
                    />
                  </div>
                ))}
              </Stack>
            </Card>
          );
        })()}

      {(() => {
        const content = character.ruleset.content;
        const data = character.characterData;
        const loadout = data?.loadout;
        const itemsById = new Map((content.equipment?.items ?? []).map(i => [i.id, i]));
        const carried = (loadout?.items ?? [])
          .map(id => itemsById.get(id)?.name ?? id)
          .filter(Boolean);
        const friend = data?.contacts?.find(c => c.relationship === 'friend')?.name;
        const rival = data?.contacts?.find(c => c.relationship === 'rival')?.name;
        const hasGear =
          loadout || (data?.coins ?? 0) > 0 || (data?.stash ?? 0) > 0 || friend || rival;
        if (!hasGear) return null;
        return (
          <Card variant='outline'>
            <Stack direction='column' gap='md'>
              <Heading level='h3'>{t('components.characterSheet.gearAndCoin')}</Heading>
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                {loadout && (
                  <Badge variant='steel' className='capitalize'>
                    {t('components.characterSheet.loadBadge', {
                      level: loadout.level,
                      used: loadUsed(content, data),
                      limit: effectiveLoadLimit(content, data, loadout.level),
                    })}
                  </Badge>
                )}
                <Badge variant='gold'>
                  {t('components.characterSheet.coin', { coins: data?.coins ?? 0 })}
                </Badge>
                {(data?.stash ?? 0) > 0 && (
                  <Badge variant='gold'>
                    {t('components.characterSheet.stash', { stash: data.stash ?? 0 })}
                  </Badge>
                )}
              </Stack>
              {carried.length > 0 && (
                <div>
                  <Text as='strong'>{t('components.characterSheet.carried')}</Text>
                  <Stack direction='row' gap='sm' className='flex-wrap'>
                    {carried.map(n => (
                      <Badge key={n} variant='steel'>
                        {n}
                      </Badge>
                    ))}
                  </Stack>
                </div>
              )}
              {(friend || rival) && (
                <div>
                  <Text as='strong'>{t('components.characterSheet.friendsRivals')}</Text>
                  <Stack direction='row' gap='sm' className='flex-wrap'>
                    {friend && (
                      <Badge variant='success'>
                        {t('components.characterSheet.friend', { name: friend })}
                      </Badge>
                    )}
                    {rival && (
                      <Badge variant='stress-critical'>
                        {t('components.characterSheet.rival', { name: rival })}
                      </Badge>
                    )}
                  </Stack>
                </div>
              )}
            </Stack>
          </Card>
        );
      })()}

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
              onRolled={onRolled}
            />
          ) : (
            <RollPanel gameId={character.gameId} characterId={character.id} onRolled={onRolled} />
          )}
          <RollLog gameId={character.gameId} refreshKey={rollKey} />
        </Stack>
      </Card>

      {showEditor && <CharacterEditor character={character} onSaved={() => void load()} />}
    </Stack>
  );
}
