'use client';

import { useEffect, useState } from 'react';
import type { CharacterWithDetails } from '@heist-mind/database';
import {
  Badge,
  Button,
  Card,
  ErrorDisplay,
  Heading,
  Input,
  LoadingSpinner,
  Stack,
  Text,
} from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
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
      {showEditor && <CharacterEditor character={character} onSaved={() => void load()} />}
    </Stack>
  );
}
