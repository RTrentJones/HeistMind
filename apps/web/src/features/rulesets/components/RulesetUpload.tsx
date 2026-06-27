'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, ErrorDisplay, Heading, Stack, Text, Textarea } from '@heist-mind/ui';
import { parseAndValidateRuleset } from '@heist-mind/shared';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/** Upload (file or paste) → validate → persist a ruleset, then go to the list. */
export function RulesetUpload() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors([]);
    setRaw(await file.text());
  };

  const onSubmit = async () => {
    setErrors([]);
    const result = parseAndValidateRuleset(raw);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const userId = user?.id;
    if (!userId) {
      setErrors([t('forms.rulesetUpload.signInRequired')]);
      return;
    }

    setSubmitting(true);
    const created = await getRepositories().rulesets.create(userId, {
      name: result.content.metadata.name,
      version: result.content.metadata.version,
      description: result.content.metadata.description,
      content: result.content,
    });
    setSubmitting(false);

    if (!created.success) {
      setErrors([created.error?.message ?? t('forms.rulesetUpload.saveFailed')]);
      return;
    }
    router.push('/rulesets');
  };

  return (
    <Stack direction='column' gap='lg'>
      <Card variant='outline'>
        <Stack direction='column' gap='xs'>
          <Heading level='h3'>{t('forms.rulesetUpload.startHeading')}</Heading>
          <Text variant='muted' size='sm'>
            {t('forms.rulesetUpload.starterHintPrefix')}{' '}
            <Link href='/rulesets' className='underline'>
              {t('forms.rulesetUpload.starterHintLink')}
            </Link>{' '}
            {t('forms.rulesetUpload.starterHintSuffix')}
          </Text>
          <Text variant='muted' size='sm'>
            A ruleset is a JSON object with: <code>metadata</code> (name, version, author,
            description, system), a non-empty <code>playbooks</code> array (each with an{' '}
            <code>id</code> and <code>name</code>), a non-empty <code>attributes</code> array, and a{' '}
            <code>characterCreation</code> object with a <code>steps</code> array. Optional:{' '}
            <code>specialAbilities</code>, <code>equipment</code>, <code>advancement</code>,{' '}
            <code>crew</code>, <code>factions</code>, and <code>stress</code>/<code>harm</code>{' '}
            bounds (these default to Blades-in-the-Dark values when omitted).
          </Text>
        </Stack>
      </Card>

      <div>
        <label htmlFor='ruleset-file' className='mb-2 block text-foreground-secondary'>
          {t('forms.rulesetUpload.fileLabel')}
        </label>
        <input
          id='ruleset-file'
          type='file'
          accept='application/json,.json'
          onChange={onFile}
          aria-label={t('forms.rulesetUpload.fileAria')}
          className='block w-full text-foreground-secondary'
        />
      </div>

      <Textarea
        label={t('forms.rulesetUpload.pasteLabel')}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={14}
        placeholder='{ "metadata": { "name": "…" }, "playbooks": [ … ], … }'
        aria-label={t('forms.rulesetUpload.pasteAria')}
      />

      {errors.length > 0 && (
        <ErrorDisplay title={t('forms.rulesetUpload.invalidTitle')} message={errors.join(' • ')} />
      )}

      <Stack direction='row' gap='sm' align='center'>
        <Button variant='ember' onClick={onSubmit} loading={submitting} disabled={!raw.trim()}>
          {t('forms.rulesetUpload.uploadCta')}
        </Button>
        <Text variant='muted' size='sm'>
          {t('forms.rulesetUpload.metadataNote')}
        </Text>
      </Stack>
    </Stack>
  );
}
