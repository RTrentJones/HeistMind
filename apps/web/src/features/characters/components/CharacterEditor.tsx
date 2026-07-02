'use client';

import { useEffect, useState } from 'react';
import {
  validateCharacter,
  stressBounds,
  harmBounds,
  collectAbilityEffects,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  PLAYBOOK_TRACK,
  type CharacterAdvancement,
  type CharacterData,
  type CharacterHarm,
  type CharacterWithDetails,
  type CrewContext,
  type RulesetContent,
} from '@heist-mind/database';
import {
  Alert,
  Badge,
  Button,
  Card,
  HarmTracker,
  Heading,
  Input,
  Select,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';

const EMPTY_HARM: CharacterHarm = { lesser: [], moderate: [], severe: [] };
import {
  useAdvanceCharacter,
  useUpdateCharacterData,
} from '@/features/characters/data/mutations';
import { useCrewByGame } from '@/features/crews/data/queries';
import { useAuth } from '@/features/auth/stores/auth-store';
import { errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

type Section = 'build' | 'stress' | 'gear' | 'advancement';

/**
 * Validity-gated character editor. Every save runs the same ruleset rules the server enforces
 * (`updateCharacterWithValidation` / `advanceCharacter`), so the editor can only ever persist a
 * legal config. Post-creation enforcement is the "live" invariant set (attribute caps,
 * prerequisites, stress/trauma bounds); growth happens via XP-spend advancement, not free points.
 * Writes invalidate the character queries, so the sheet's detail query refetches and the fresh
 * `character` prop resyncs the draft below — no save callback needed.
 */
export function CharacterEditor({ character }: { character: CharacterWithDetails }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const bounds = stressBounds(content);
  const updateData = useUpdateCharacterData(character.id);
  const advanceChar = useAdvanceCharacter(character.id);

  const [section, setSection] = useState<Section>('build');
  const [draft, setDraft] = useState<CharacterData>(() => structuredClone(character.characterData));
  const [traumaInput, setTraumaInput] = useState('');
  const [harmInput, setHarmInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const saving = updateData.isPending || advanceChar.isPending;

  // The campaign's crew, so level-ups validate in context: its abilities RAISE the live bounds —
  // Mastery lifts the action cap (so a member can advance an action to 4), Deadly grants bonus dots,
  // Mule raises load. A standalone character (Phase 5) has no crew → validates against the ruleset alone.
  const crewQuery = useCrewByGame(character.gameId ?? undefined);
  const crew: CrewContext | null = crewQuery.data
    ? { crewAbilities: crewQuery.data.crewAbilities }
    : null;

  // Resync the editable draft whenever the character reloads (e.g. after an advancement),
  // keeping the active section. Saves persist, so clobbering unsaved edits here is acceptable.
  useEffect(() => {
    setDraft(structuredClone(character.characterData));
  }, [character.id, character.updatedAt]);

  const patch = (p: Partial<CharacterData>) => setDraft(d => ({ ...d, ...p }));

  const harm = draft.harm ?? EMPTY_HARM;
  const hb = harmBounds(content);
  const addHarm = (level: keyof CharacterHarm) => {
    const value = harmInput.trim();
    if (!value || harm[level].length >= hb[level]) return;
    patch({ harm: { ...harm, [level]: [...harm[level], value] } });
    setHarmInput('');
  };
  const removeHarm = (level: keyof CharacterHarm, val: string) =>
    patch({ harm: { ...harm, [level]: harm[level].filter(x => x !== val) } });

  // Loadout moved off the build to the character sheet (it's a per-score choice, not a build/advance).
  const playbook = content.playbooks.find(p => p.id === draft.playbook);
  const playbookContacts = playbook?.contacts ?? [];

  const contactName = (rel: 'friend' | 'rival') =>
    draft.contacts.find(c => c.relationship === rel)?.name ?? '';
  const setContact = (rel: 'friend' | 'rival', name: string) => {
    const others = draft.contacts.filter(c => c.relationship !== rel);
    if (!name) {
      patch({ contacts: others });
      return;
    }
    const def = playbookContacts.find(c => c.name === name);
    patch({
      contacts: [...others, { name, description: def?.description ?? '', relationship: rel }],
    });
  };

  const saveBuild = async () => {
    const userId = user?.id;
    if (!userId) return;
    const result = validateCharacter(content, draft, { mode: 'live', crew });
    if (!result.isValid) {
      setError(result.errors.map(e => e.message).join(' '));
      return;
    }
    try {
      await updateData.mutateAsync({ userId, data: { characterData: draft } });
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || t('components.characterEditor.saveFailed'));
    }
  };

  const buyAbility = async (abilityId: string, cost: number, name: string) => {
    const userId = user?.id;
    if (!userId) return;
    const adv: CharacterAdvancement = {
      type: 'ability',
      target: abilityId,
      cost,
      description: `Learn ${name}`,
    };
    try {
      await advanceChar.mutateAsync({ userId, advancement: adv });
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || t('components.characterEditor.advancementFailed'));
    }
  };

  // Spend a full attribute XP track on an action dot (server gates on the track being full).
  const advanceAction = async (action: string) => {
    const userId = user?.id;
    if (!userId) return;
    const adv: CharacterAdvancement = {
      type: 'skill',
      target: action,
      value: 1,
      cost: 0,
      description: `Add a dot to ${action}`,
    };
    try {
      await advanceChar.mutateAsync({ userId, advancement: adv });
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || t('components.characterEditor.advancementFailed'));
    }
  };

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

            <Button variant='ember' onClick={saveBuild} loading={saving}>
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
              onChange={v => patch({ stress: Math.max(0, Math.min(v, bounds.max)) })}
            />
            {draft.stress >= bounds.max && (
              <Alert variant='warning' size='sm'>
                {t('components.characterEditor.stressMaxed')}
              </Alert>
            )}

            <Heading level='h3'>
              {t('components.characterEditor.traumaHeading', {
                count: draft.trauma.length,
                max: bounds.traumaMax,
              })}
            </Heading>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {draft.trauma.length === 0 && (
                <Text variant='muted' size='sm'>
                  {t('components.characterEditor.none')}
                </Text>
              )}
              {draft.trauma.map(condition => (
                <Badge key={condition} variant='stress-critical'>
                  {condition}
                  <button
                    type='button'
                    aria-label={t('components.characterEditor.remove', { name: condition })}
                    className='ml-1.5 cursor-pointer'
                    onClick={() => patch({ trauma: draft.trauma.filter(x => x !== condition) })}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </Stack>
            {content.traumaConditions && content.traumaConditions.length > 0 ? (
              // Named-condition rulesets (BitD's 8): pick from a checklist — unique, capped at
              // traumaMax — rather than typing free text. Toggling a chip adds/removes the condition.
              <Stack direction='row' gap='sm' className='flex-wrap'>
                {content.traumaConditions.map(condition => {
                  const taken = draft.trauma.includes(condition);
                  const full = draft.trauma.length >= bounds.traumaMax;
                  return (
                    <Button
                      key={condition}
                      variant={taken ? 'crimson' : 'outline'}
                      size='sm'
                      aria-pressed={taken}
                      disabled={!taken && full}
                      onClick={() =>
                        patch({
                          trauma: taken
                            ? draft.trauma.filter(x => x !== condition)
                            : [...draft.trauma, condition],
                        })
                      }
                    >
                      {condition}
                    </Button>
                  );
                })}
              </Stack>
            ) : (
              // Rulesets without a named set: keep free-text entry (unique, capped).
              <Stack direction='row' gap='sm' align='end' className='max-w-md'>
                <Input
                  label={t('components.characterEditor.addTrauma')}
                  value={traumaInput}
                  onChange={e => setTraumaInput(e.target.value)}
                  placeholder={t('components.characterEditor.traumaPlaceholder')}
                />
                <Button
                  variant='outline'
                  disabled={!traumaInput.trim() || draft.trauma.length >= bounds.traumaMax}
                  onClick={() => {
                    const value = traumaInput.trim();
                    if (
                      value &&
                      draft.trauma.length < bounds.traumaMax &&
                      !draft.trauma.includes(value)
                    ) {
                      patch({ trauma: [...draft.trauma, value] });
                      setTraumaInput('');
                    }
                  }}
                >
                  {t('components.characterEditor.add')}
                </Button>
              </Stack>
            )}

            <Heading level='h3'>{t('components.characterEditor.harm')}</Heading>
            <HarmTracker harm={harm} bounds={hb} />
            {(['severe', 'moderate', 'lesser'] as const).map(level =>
              harm[level].length > 0 ? (
                <Stack key={level} direction='row' gap='sm' align='center' className='flex-wrap'>
                  <Text size='sm' className='w-20 capitalize'>
                    {level}
                  </Text>
                  {harm[level].map(h => (
                    <Badge key={h} variant='stress-critical'>
                      {h}
                      <button
                        type='button'
                        aria-label={t('components.characterEditor.remove', { name: h })}
                        className='ml-1.5 cursor-pointer'
                        onClick={() => removeHarm(level, h)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </Stack>
              ) : null
            )}
            <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
              <Input
                label={t('components.characterEditor.addHarm')}
                value={harmInput}
                onChange={e => setHarmInput(e.target.value)}
                placeholder={t('components.characterEditor.harmPlaceholder')}
              />
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('lesser')}
              >
                {t('components.characterEditor.addLesser')}
              </Button>
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('moderate')}
              >
                {t('components.characterEditor.addModerate')}
              </Button>
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('severe')}
              >
                {t('components.characterEditor.addSevere')}
              </Button>
            </Stack>

            <Button variant='ember' onClick={saveBuild} loading={saving}>
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

            <Heading level='h3'>{t('components.characterEditor.coin')}</Heading>
            <Stack direction='row' gap='sm' align='end' className='max-w-md'>
              <Input
                label={t('components.characterEditor.coinLabel')}
                type='number'
                value={String(draft.coins ?? 0)}
                onChange={e =>
                  patch({ coins: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
              />
              <Input
                label={t('components.characterEditor.stash')}
                type='number'
                value={String(draft.stash ?? 0)}
                onChange={e =>
                  patch({ stash: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
              />
            </Stack>

            {playbookContacts.length > 0 && (
              <>
                <Heading level='h3'>{t('components.characterEditor.friendsRivals')}</Heading>
                <Stack direction='row' gap='md' align='end' className='flex-wrap'>
                  <Select
                    label={t('components.characterEditor.closeFriend')}
                    value={contactName('friend')}
                    onChange={e => setContact('friend', e.target.value)}
                  >
                    <option value=''>—</option>
                    {playbookContacts.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={t('components.characterEditor.rival')}
                    value={contactName('rival')}
                    onChange={e => setContact('rival', e.target.value)}
                  >
                    <option value=''>—</option>
                    {playbookContacts.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Stack>
              </>
            )}

            <Button variant='ember' onClick={saveBuild} loading={saving}>
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

/**
 * Surface the campaign crew's benefits so they're discoverable rather than silently changing the
 * caps. Mastery (the only crew effect that's actionable in the editor) lets a member raise an action
 * to 4; a veteran upgrade opens cross-playbook ability picks. Renders nothing when the crew grants
 * neither — keeping the panel honest about what's actually in effect.
 */
function CrewBenefits({
  content,
  data,
  crew,
}: {
  content: RulesetContent;
  data: CharacterData;
  crew: CrewContext | null;
}) {
  const { t } = useTranslation();
  const effects = collectAbilityEffects(content, data, crew);
  const baseMax = content.characterCreation?.actionRatings?.max ?? 3;
  const masteryMax = Math.max(baseMax, effects.actionMax);
  const hasMastery = masteryMax > baseMax;
  const hasVeteran = effects.veteran > 0;
  if (!hasMastery && !hasVeteran) return null;
  return (
    <Alert variant='info' size='sm'>
      <Stack direction='column' gap='xs'>
        <Text as='strong' size='sm'>
          {t('components.characterEditor.crewBenefitsTitle')}
        </Text>
        {hasMastery && (
          <Text size='sm'>{t('components.characterEditor.crewMastery', { max: masteryMax })}</Text>
        )}
        {hasVeteran && <Text size='sm'>{t('components.characterEditor.crewVeteran')}</Text>}
      </Stack>
    </Alert>
  );
}

/** Spend XP on new special abilities (the ruleset's `ability` advancement option). */
function AdvancementOptions({
  character,
  onBuy,
  saving,
}: {
  character: CharacterWithDetails;
  onBuy: (abilityId: string, cost: number, name: string) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const owned = character.characterData.specialAbilities;
  const option = content.advancement?.advancementOptions?.find(o => o.category === 'ability');

  if (!option) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.noAbilityAdvancements')}
      </Text>
    );
  }
  const buyable = content.specialAbilities.filter(a => !owned.includes(a.id));
  if (buyable.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.allLearned')}
      </Text>
    );
  }

  const requirementsMet = (option.requirements ?? []).every(r => owned.includes(r));
  // Track rulesets gate ability buys on a full playbook track; flat rulesets gate on pooled XP.
  const trackMode = usesXpTracks(content);
  const playbookFull = xpTrackFull(content, character.characterData, PLAYBOOK_TRACK);

  return (
    <Stack direction='column' gap='sm'>
      <Text variant='muted' size='sm'>
        {trackMode
          ? t('components.characterEditor.optionTrack', { name: option.name })
          : t('components.characterEditor.optionFlat', { name: option.name, cost: option.cost })}
      </Text>
      {buyable.map(ability => {
        const prereqKnown =
          !!ability.prerequisite &&
          content.specialAbilities.some(a => a.id === ability.prerequisite);
        const prereqMet =
          !ability.prerequisite || !prereqKnown || owned.includes(ability.prerequisite);
        const affordable = trackMode ? playbookFull : option.cost <= character.experiencePoints;
        const disabled = saving || !prereqMet || !requirementsMet || !affordable;
        const reason = !affordable
          ? trackMode
            ? t('components.characterEditor.fillTrack')
            : t('components.characterEditor.needXp', { cost: option.cost })
          : !prereqMet
            ? t('components.characterEditor.requires', { prerequisite: ability.prerequisite ?? '' })
            : !requirementsMet
              ? t('components.characterEditor.requiresAll', {
                  requirements: option.requirements?.join(', ') ?? '',
                })
              : null;
        return (
          <Card key={ability.id} variant='outline'>
            <Stack direction='row' justify='between' align='center' gap='sm'>
              <div>
                <Text as='strong'>{ability.name}</Text>
                {ability.tier != null && (
                  <Badge variant='gold' size='sm' className='ml-2'>
                    {t('components.characterEditor.tier', { tier: ability.tier })}
                  </Badge>
                )}
                <Text variant='muted' size='sm'>
                  {ability.description}
                </Text>
                {ability.rules && (
                  <details className='mt-1'>
                    <summary className='cursor-pointer text-xs text-foreground-muted'>
                      {t('components.characterEditor.rules')}
                    </summary>
                    <Text variant='muted' size='sm' className='mt-1'>
                      {ability.rules}
                    </Text>
                  </details>
                )}
                {reason && (
                  <Text variant='muted' size='sm'>
                    {reason}
                  </Text>
                )}
              </div>
              <Button
                variant='outline'
                size='sm'
                disabled={disabled}
                onClick={() => onBuy(ability.id, option.cost, ability.name)}
              >
                {trackMode
                  ? t('components.characterEditor.takeAbility')
                  : t('components.characterEditor.buyAbility', { cost: option.cost })}
              </Button>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

/**
 * Spend a full attribute XP track on a new action dot. Only attributes whose track has filled are
 * shown; each of that attribute's actions can be bumped by 1 (server re-validates against the cap).
 */
function ActionDotOptions({
  character,
  crew,
  onAdvance,
  saving,
}: {
  character: CharacterWithDetails;
  crew: CrewContext | null;
  onAdvance: (action: string) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const content = character.ruleset.content;
  const data = character.characterData;
  // Action rating caps at the ruleset's max (BitD: 3), RAISED to the crew's effective cap when it
  // holds a Mastery-style upgrade (→ 4) — so a member of a Mastery crew can buy the 4th dot.
  const max = Math.max(
    content.characterCreation?.actionRatings?.max ?? 3,
    collectAbilityEffects(content, data, crew).actionMax
  );
  const ready = content.attributes.filter(a => xpTrackFull(content, data, a.id));

  if (ready.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.characterEditor.fillTrackForDot')}
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='sm'>
      {ready.map(attr => (
        <Card key={attr.id} variant='outline'>
          <Text as='strong'>{t('components.characterEditor.pickAction', { name: attr.name })}</Text>
          <Stack direction='row' gap='sm' className='flex-wrap'>
            {attr.skills.map(action => {
              const rating = data.skills?.[action] ?? 0;
              const atMax = rating >= max;
              return (
                <Button
                  key={action}
                  variant='outline'
                  size='sm'
                  disabled={saving || atMax}
                  onClick={() => onAdvance(action)}
                >
                  {action} {rating}
                  {atMax
                    ? t('components.characterEditor.maxSuffix')
                    : t('components.characterEditor.incrementSuffix')}
                </Button>
              );
            })}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
