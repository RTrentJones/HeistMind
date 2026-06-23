'use client';

import { useEffect, useState } from 'react';
import {
  validateCharacter,
  stressBounds,
  type CharacterAdvancement,
  type CharacterData,
  type CharacterWithDetails,
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
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

type Section = 'build' | 'stress' | 'advancement';

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resync the editable draft whenever the character reloads (e.g. after an advancement),
  // keeping the active section. Saves persist, so clobbering unsaved edits here is acceptable.
  useEffect(() => {
    setDraft(structuredClone(character.characterData));
  }, [character.id, character.updatedAt]);

  const patch = (p: Partial<CharacterData>) => setDraft(d => ({ ...d, ...p }));

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

            <Button variant='ember' onClick={saveBuild} loading={saving}>
              Save stress &amp; trauma
            </Button>
          </Stack>
        )}

        {section === 'advancement' && (
          <Stack direction='column' gap='md'>
            <Stack direction='row' gap='sm' align='center'>
              <Badge variant='gold'>{character.experiencePoints} XP available</Badge>
            </Stack>
            <AdvancementOptions character={character} onBuy={buyAbility} saving={saving} />
          </Stack>
        )}
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

  return (
    <Stack direction='column' gap='sm'>
      <Text variant='muted' size='sm'>
        {option.name} — {option.cost} XP each.
      </Text>
      {buyable.map(ability => {
        const prereqKnown =
          !!ability.prerequisite &&
          content.specialAbilities.some(a => a.id === ability.prerequisite);
        const prereqMet =
          !ability.prerequisite || !prereqKnown || owned.includes(ability.prerequisite);
        const affordable = option.cost <= character.experiencePoints;
        const disabled = saving || !prereqMet || !requirementsMet || !affordable;
        const reason = !affordable
          ? `Need ${option.cost} XP`
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
                Buy ({option.cost} XP)
              </Button>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
