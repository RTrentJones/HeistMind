'use client';

import { useEffect, useState } from 'react';
import {
  stressBounds,
  harmBounds,
  loadLimit,
  loadUsed,
  usesActionRatings,
  rulesetActions,
  type CharacterWithDetails,
} from '@heist-mind/database';
import {
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
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { CharacterEditor } from './CharacterEditor';

/** View a character and modify it (rename, award XP, and edit the validated build). */
export function CharacterSheet({ characterId }: { characterId: string }) {
  const { user } = useAuth();
  const [character, setCharacter] = useState<CharacterWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rollKey, setRollKey] = useState(0);

  const load = async () => {
    const result = await getRepositories().characters.findWithDetails(characterId);
    if (!result.success || !result.data) {
      setError(
        result.success ? 'Character not found' : (result.error?.message ?? 'Failed to load')
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
      setError(result.error?.message ?? 'Failed to save name');
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
    else setError(result.error?.message ?? 'Failed to add XP');
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
    else setError(r.error?.message ?? 'Failed to save stress');
  };

  if (loading) return <LoadingSpinner />;
  if (error || !character) {
    return <ErrorDisplay title="Couldn't load character" message={error ?? 'Unknown error'} />;
  }

  const attributes = character.characterData?.attributes ?? {};
  const abilities = character.characterData?.specialAbilities ?? [];

  return (
    <Stack direction='column' gap='lg'>
      <Card variant='character'>
        <Stack direction='column' gap='md'>
          {editing ? (
            <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
              <Input label='Name' value={name} onChange={e => setName(e.target.value)} />
              <Button variant='ember' onClick={saveName} loading={saving}>
                Save
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setEditing(false);
                  setName(character.name);
                }}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Stack direction='row' justify='between' align='center'>
              <Heading level='h2' variant='gradient'>
                {character.name}
              </Heading>
              <Stack direction='row' gap='sm' align='center'>
                <Button variant='outline' size='sm' onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button variant='outline' size='sm' onClick={() => setShowEditor(s => !s)}>
                  {showEditor ? 'Close editor' : 'Edit build'}
                </Button>
              </Stack>
            </Stack>
          )}

          <Text variant='muted'>
            {character.ruleset.name} · {character.playbookType}
          </Text>

          <Stack direction='row' gap='sm' align='center'>
            <Badge variant='gold'>{character.experiencePoints} XP</Badge>
            <Button variant='outline' size='sm' onClick={addXp} loading={saving}>
              Add XP
            </Button>
          </Stack>

          <div>
            <Text as='strong'>Attributes</Text>
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
                  No points assigned.
                </Text>
              )}
            </Stack>
          </div>

          <div>
            <Text as='strong'>Special Abilities</Text>
            <Stack direction='row' gap='sm' className='flex-wrap'>
              {abilities.length > 0 ? (
                abilities.map(a => (
                  <Badge key={a} variant='success'>
                    {a}
                  </Badge>
                ))
              ) : (
                <Text variant='muted' size='sm'>
                  None chosen.
                </Text>
              )}
            </Stack>
          </div>
        </Stack>
      </Card>

      <Card variant='outline'>
        <Stack direction='column' gap='md'>
          <Heading level='h3'>Condition</Heading>
          <StressTracker
            current={character.characterData?.stress ?? 0}
            max={stressBounds(character.ruleset.content).max}
            interactive
            showNumbers
            size='lg'
            onChange={v => void setStress(v)}
          />
          <div>
            <Text as='strong'>Harm</Text>
            <HarmTracker
              harm={character.characterData?.harm ?? EMPTY_HARM}
              bounds={harmBounds(character.ruleset.content)}
            />
          </div>
          {(character.characterData?.trauma?.length ?? 0) > 0 && (
            <div>
              <Text as='strong'>Trauma</Text>
              <Stack direction='row' gap='sm' className='flex-wrap'>
                {character.characterData.trauma.map(t => (
                  <Badge key={t} variant='stress-critical'>
                    {t}
                  </Badge>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </Card>

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
              <Heading level='h3'>Gear &amp; Coin</Heading>
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                {loadout && (
                  <Badge variant='steel' className='capitalize'>
                    {loadout.level} load · {loadUsed(content, data)}/
                    {loadLimit(content, loadout.level)}
                  </Badge>
                )}
                <Badge variant='gold'>{data?.coins ?? 0} coin</Badge>
                {(data?.stash ?? 0) > 0 && <Badge variant='gold'>{data.stash} stash</Badge>}
              </Stack>
              {carried.length > 0 && (
                <div>
                  <Text as='strong'>Carried</Text>
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
                  <Text as='strong'>Friends &amp; Rivals</Text>
                  <Stack direction='row' gap='sm' className='flex-wrap'>
                    {friend && <Badge variant='success'>Friend: {friend}</Badge>}
                    {rival && <Badge variant='stress-critical'>Rival: {rival}</Badge>}
                  </Stack>
                </div>
              )}
            </Stack>
          </Card>
        );
      })()}

      <Card variant='outline'>
        <Stack direction='column' gap='md'>
          <Heading level='h3'>Dice</Heading>
          {usesActionRatings(character.ruleset.content) ? (
            <RollPanel
              gameId={character.gameId}
              characterId={character.id}
              actions={rulesetActions(character.ruleset.content).map(name => ({
                name,
                rating: character.characterData?.skills?.[name] ?? 0,
              }))}
              onRolled={() => setRollKey(k => k + 1)}
            />
          ) : (
            <RollPanel
              gameId={character.gameId}
              characterId={character.id}
              onRolled={() => setRollKey(k => k + 1)}
            />
          )}
          <RollLog gameId={character.gameId} refreshKey={rollKey} />
        </Stack>
      </Card>

      {showEditor && <CharacterEditor character={character} onSaved={() => void load()} />}
    </Stack>
  );
}
