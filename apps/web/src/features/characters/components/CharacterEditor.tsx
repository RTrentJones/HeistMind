'use client';

import { useEffect, useState } from 'react';
import {
  validateCharacter,
  stressBounds,
  harmBounds,
  loadLimit,
  loadUsed,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  PLAYBOOK_TRACK,
  type CharacterAdvancement,
  type CharacterData,
  type CharacterHarm,
  type LoadLevel,
  type CharacterWithDetails,
} from '@heist-mind/database';
import {
  Alert,
  Badge,
  Button,
  Card,
  HarmTracker,
  Heading,
  Input,
  Stack,
  StressTracker,
  Text,
} from '@heist-mind/ui';

const EMPTY_HARM: CharacterHarm = { lesser: [], moderate: [], severe: [] };
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

type Section = 'build' | 'stress' | 'gear' | 'advancement';
const LOAD_LEVELS: LoadLevel[] = ['light', 'normal', 'heavy'];

/**
 * Validity-gated character editor. Every save runs the same ruleset rules the server enforces
 * (`updateCharacterWithValidation` / `advanceCharacter`), so the editor can only ever persist a
 * legal config. Post-creation enforcement is the "live" invariant set (attribute caps,
 * prerequisites, stress/trauma bounds); growth happens via XP-spend advancement, not free points.
 */
export function CharacterEditor({
  character,
  onSaved,
}: {
  character: CharacterWithDetails;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const content = character.ruleset.content;
  const bounds = stressBounds(content);

  const [section, setSection] = useState<Section>('build');
  const [draft, setDraft] = useState<CharacterData>(() => structuredClone(character.characterData));
  const [traumaInput, setTraumaInput] = useState('');
  const [harmInput, setHarmInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resync the editable draft whenever the character reloads (e.g. after an advancement),
  // keeping the active section. Saves persist, so clobbering unsaved edits here is acceptable.
  useEffect(() => {
    setDraft(structuredClone(character.characterData));
  }, [character.id, character.updatedAt]);

  const patch = (p: Partial<CharacterData>) => setDraft(d => ({ ...d, ...p }));

  const harm = draft.harm ?? EMPTY_HARM;
  const hb = harmBounds(content);
  const addHarm = (level: keyof CharacterHarm) => {
    const t = harmInput.trim();
    if (!t || harm[level].length >= hb[level]) return;
    patch({ harm: { ...harm, [level]: [...harm[level], t] } });
    setHarmInput('');
  };
  const removeHarm = (level: keyof CharacterHarm, val: string) =>
    patch({ harm: { ...harm, [level]: harm[level].filter(x => x !== val) } });

  const loadout = draft.loadout ?? { level: 'normal' as LoadLevel, items: [] };
  const gearItems = content.equipment?.items ?? [];
  const playbookContacts = content.playbooks.find(p => p.id === draft.playbook)?.contacts ?? [];
  const toggleItem = (id: string) =>
    patch({
      loadout: {
        ...loadout,
        items: loadout.items.includes(id)
          ? loadout.items.filter(x => x !== id)
          : [...loadout.items, id],
      },
    });
  const loadCap = loadLimit(content, loadout.level);
  const loadCarried = loadUsed(content, draft);

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
    const result = validateCharacter(content, draft, { mode: 'live' });
    if (!result.isValid) {
      setError(result.errors.map(e => e.message).join(' '));
      return;
    }
    setSaving(true);
    const r = await getRepositories().characterManagement.updateCharacterWithValidation(
      character.id,
      userId,
      { characterData: draft }
    );
    setSaving(false);
    if (!r.success) setError(r.error?.message ?? 'Save failed.');
    else {
      setError(null);
      onSaved();
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
    setSaving(true);
    const r = await getRepositories().characterManagement.advanceCharacter(
      character.id,
      userId,
      adv
    );
    setSaving(false);
    if (!r.success) setError(r.error?.message ?? 'Advancement failed.');
    else {
      setError(null);
      onSaved();
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
    setSaving(true);
    const r = await getRepositories().characterManagement.advanceCharacter(
      character.id,
      userId,
      adv
    );
    setSaving(false);
    if (!r.success) setError(r.error?.message ?? 'Advancement failed.');
    else {
      setError(null);
      onSaved();
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
          {tab('build', 'Build')}
          {tab('stress', 'Stress & Trauma')}
          {tab('gear', 'Gear')}
          {tab('advancement', 'Advancement')}
        </Stack>

        {error && (
          <Alert variant='destructive' size='sm'>
            {error}
          </Alert>
        )}

        {section === 'build' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>Identity</Heading>
            <Stack direction='column' gap='sm' className='max-w-md'>
              <Input
                label='Heritage'
                value={draft.heritage ?? ''}
                onChange={e => patch({ heritage: e.target.value })}
              />
              <Input
                label='Background'
                value={draft.background ?? ''}
                onChange={e => patch({ background: e.target.value })}
              />
              <Input
                label='Vice'
                value={draft.vice ?? ''}
                onChange={e => patch({ vice: e.target.value })}
              />
            </Stack>

            <Heading level='h3'>Attributes</Heading>
            <Text variant='muted' size='sm'>
              Bounded by each attribute&apos;s cap. Raising attributes during play is done through
              Advancement.
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
              Save build
            </Button>
          </Stack>
        )}

        {section === 'stress' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>Stress</Heading>
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
                Stress is maxed — take a trauma.
              </Alert>
            )}

            <Heading level='h3'>
              Trauma ({draft.trauma.length}/{bounds.traumaMax})
            </Heading>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {draft.trauma.length === 0 && (
                <Text variant='muted' size='sm'>
                  None.
                </Text>
              )}
              {draft.trauma.map(t => (
                <Badge key={t} variant='stress-critical'>
                  {t}
                  <button
                    type='button'
                    aria-label={`Remove ${t}`}
                    className='ml-1.5 cursor-pointer'
                    onClick={() => patch({ trauma: draft.trauma.filter(x => x !== t) })}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </Stack>
            <Stack direction='row' gap='sm' align='end' className='max-w-md'>
              <Input
                label='Add trauma'
                value={traumaInput}
                onChange={e => setTraumaInput(e.target.value)}
                placeholder='Cold, Haunted, Reckless…'
              />
              <Button
                variant='outline'
                disabled={!traumaInput.trim() || draft.trauma.length >= bounds.traumaMax}
                onClick={() => {
                  const t = traumaInput.trim();
                  if (t && draft.trauma.length < bounds.traumaMax && !draft.trauma.includes(t)) {
                    patch({ trauma: [...draft.trauma, t] });
                    setTraumaInput('');
                  }
                }}
              >
                Add
              </Button>
            </Stack>

            <Heading level='h3'>Harm</Heading>
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
                        aria-label={`Remove ${h}`}
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
                label='Add harm'
                value={harmInput}
                onChange={e => setHarmInput(e.target.value)}
                placeholder='Battered, Shaken, Impaled…'
              />
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('lesser')}
              >
                + Lesser
              </Button>
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('moderate')}
              >
                + Moderate
              </Button>
              <Button
                variant='outline'
                disabled={!harmInput.trim()}
                onClick={() => addHarm('severe')}
              >
                + Severe
              </Button>
            </Stack>

            <Button variant='ember' onClick={saveBuild} loading={saving}>
              Save stress, harm &amp; trauma
            </Button>
          </Stack>
        )}

        {section === 'gear' && (
          <Stack direction='column' gap='md'>
            <Heading level='h3'>Loadout</Heading>
            <Text variant='muted' size='sm'>
              Pick a load level, then check the gear you carry. Heavier loads carry more but draw
              more notice.
            </Text>
            <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
              {LOAD_LEVELS.map(lvl => (
                <Button
                  key={lvl}
                  variant={loadout.level === lvl ? 'ember' : 'outline'}
                  size='sm'
                  className='capitalize'
                  onClick={() => patch({ loadout: { ...loadout, level: lvl } })}
                >
                  {lvl} ({loadLimit(content, lvl)})
                </Button>
              ))}
              <Badge variant={loadCarried > loadCap ? 'stress-critical' : 'steel'}>
                Load {loadCarried} / {loadCap}
              </Badge>
            </Stack>
            {loadCarried > loadCap && (
              <Alert variant='warning' size='sm'>
                Over capacity — drop an item or raise your load level.
              </Alert>
            )}
            {gearItems.length === 0 ? (
              <Text variant='muted' size='sm'>
                This ruleset defines no equipment.
              </Text>
            ) : (
              <Stack direction='column' gap='xs'>
                {gearItems.map(item => (
                  <label key={item.id} className='flex cursor-pointer items-center gap-2.5'>
                    <input
                      type='checkbox'
                      checked={loadout.items.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    <Text size='sm'>
                      {item.name}
                      <span className='text-foreground-muted'> · load {item.load}</span>
                    </Text>
                  </label>
                ))}
              </Stack>
            )}

            <Heading level='h3'>Coin</Heading>
            <Stack direction='row' gap='sm' align='end' className='max-w-md'>
              <Input
                label='Coin (carried)'
                type='number'
                value={String(draft.coins ?? 0)}
                onChange={e =>
                  patch({ coins: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
              />
              <Input
                label='Stash'
                type='number'
                value={String(draft.stash ?? 0)}
                onChange={e =>
                  patch({ stash: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
              />
            </Stack>

            {playbookContacts.length > 0 && (
              <>
                <Heading level='h3'>Friends &amp; Rivals</Heading>
                <Stack direction='row' gap='md' align='end' className='flex-wrap'>
                  <label className='flex flex-col gap-1 text-sm'>
                    Close friend
                    <select
                      className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
                      value={contactName('friend')}
                      onChange={e => setContact('friend', e.target.value)}
                    >
                      <option value=''>—</option>
                      {playbookContacts.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className='flex flex-col gap-1 text-sm'>
                    Rival
                    <select
                      className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
                      value={contactName('rival')}
                      onChange={e => setContact('rival', e.target.value)}
                    >
                      <option value=''>—</option>
                      {playbookContacts.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </Stack>
              </>
            )}

            <Button variant='ember' onClick={saveBuild} loading={saving}>
              Save gear
            </Button>
          </Stack>
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
                  Playbook {xpMarks(character.characterData, PLAYBOOK_TRACK)}/
                  {xpTrackSize(content, PLAYBOOK_TRACK)}
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
              <Heading level='h3'>Special Abilities</Heading>
              <AdvancementOptions character={character} onBuy={buyAbility} saving={saving} />
              <Heading level='h3'>Action Dots</Heading>
              <ActionDotOptions character={character} onAdvance={advanceAction} saving={saving} />
            </Stack>
          ) : (
            <Stack direction='column' gap='md'>
              <Stack direction='row' gap='sm' align='center'>
                <Badge variant='gold'>{character.experiencePoints} XP available</Badge>
              </Stack>
              <AdvancementOptions character={character} onBuy={buyAbility} saving={saving} />
            </Stack>
          ))}
      </Stack>
    </Card>
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
  const content = character.ruleset.content;
  const owned = character.characterData.specialAbilities;
  const option = content.advancement?.advancementOptions?.find(o => o.category === 'ability');

  if (!option) {
    return (
      <Text variant='muted' size='sm'>
        This ruleset defines no ability advancements.
      </Text>
    );
  }
  const buyable = content.specialAbilities.filter(a => !owned.includes(a.id));
  if (buyable.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        All special abilities have been learned.
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
        {option.name} — {trackMode ? 'clears a full playbook track' : `${option.cost} XP each`}.
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
            ? 'Fill the playbook XP track'
            : `Need ${option.cost} XP`
          : !prereqMet
            ? `Requires ${ability.prerequisite}`
            : !requirementsMet
              ? `Requires ${option.requirements?.join(', ')}`
              : null;
        return (
          <Card key={ability.id} variant='outline'>
            <Stack direction='row' justify='between' align='center' gap='sm'>
              <div>
                <Text as='strong'>{ability.name}</Text>
                {ability.tier != null && (
                  <Badge variant='gold' size='sm' className='ml-2'>
                    Tier {ability.tier}
                  </Badge>
                )}
                <Text variant='muted' size='sm'>
                  {ability.description}
                </Text>
                {ability.rules && (
                  <details className='mt-1'>
                    <summary className='cursor-pointer text-xs text-foreground-muted'>
                      Rules
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
                {trackMode ? 'Take ability' : `Buy (${option.cost} XP)`}
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
  onAdvance,
  saving,
}: {
  character: CharacterWithDetails;
  onAdvance: (action: string) => void;
  saving: boolean;
}) {
  const content = character.ruleset.content;
  const data = character.characterData;
  const max = content.characterCreation?.actionRatings?.max ?? 3;
  const ready = content.attributes.filter(a => xpTrackFull(content, data, a.id));

  if (ready.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        Fill an attribute XP track to add an action dot.
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='sm'>
      {ready.map(attr => (
        <Card key={attr.id} variant='outline'>
          <Text as='strong'>{attr.name} — pick an action to raise</Text>
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
                  {atMax ? ' (max)' : ' → +1'}
                </Button>
              );
            })}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
