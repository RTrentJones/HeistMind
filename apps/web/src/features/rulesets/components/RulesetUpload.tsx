'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, ErrorDisplay, Heading, Stack, Text, Textarea } from '@heist-mind/ui';
import { parseAndValidateRuleset } from '@heist-mind/shared';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCreateRuleset } from '@/features/rulesets/data/mutations';
import { errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/** Upload (file or paste) → validate → persist a ruleset, then go to the list. */
export function RulesetUpload() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const createRuleset = useCreateRuleset();
  const [raw, setRaw] = useState('');
  const [attested, setAttested] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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

    try {
      await createRuleset.mutateAsync({
        userId,
        data: {
          name: result.content.metadata.name,
          version: result.content.metadata.version,
          description: result.content.metadata.description,
          content: result.content,
        },
      });
      router.push('/rulesets');
    } catch (err) {
      setErrors([errorMessage(err) || t('forms.rulesetUpload.saveFailed')]);
    }
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
          {/* eslint-disable i18next/no-literal-string -- JSON-schema reference: prose interleaved
              with <code> field identifiers; kept verbatim rather than fragmented into i18n keys. */}
          <Text variant='muted' size='sm'>
            A ruleset is a JSON object with: <code>metadata</code> (name, version, author,
            description, system), a non-empty <code>playbooks</code> array (each with an{' '}
            <code>id</code> and <code>name</code>), a non-empty <code>attributes</code> array, and a{' '}
            <code>characterCreation</code> object with a <code>steps</code> array. Optional:{' '}
            <code>specialAbilities</code>, <code>equipment</code>, <code>advancement</code>,{' '}
            <code>crew</code>, <code>factions</code>, and <code>stress</code>/<code>harm</code>{' '}
            bounds (these default to Blades-in-the-Dark values when omitted).
          </Text>
          {/* eslint-enable i18next/no-literal-string */}
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

      {/* IP attestation — gates the upload (the ToS §2 warranty, restated at the moment it
          matters). Links live OUTSIDE the label so clicking them doesn't toggle the checkbox. */}
      <Stack direction='column' gap='xs'>
        <label className='flex items-start gap-2 text-sm text-foreground-secondary'>
          <input
            type='checkbox'
            checked={attested}
            onChange={e => setAttested(e.target.checked)}
            className='mt-1'
          />
          <span>{t('forms.rulesetUpload.attestLabel')}</span>
        </label>
        <Text variant='muted' size='xs' className='pl-6'>
          {t('forms.rulesetUpload.attestHintPrefix')}
          <Link href='/legal/terms' className='underline'>
            {t('forms.rulesetUpload.attestTermsLink')}
          </Link>
          {t('forms.rulesetUpload.attestHintJoiner')}
          <Link href='/legal/dmca' className='underline'>
            {t('forms.rulesetUpload.attestDmcaLink')}
          </Link>
          {t('forms.rulesetUpload.attestHintSuffix')}
        </Text>
      </Stack>

      <Stack direction='row' gap='sm' align='center'>
        <Button
          variant='ember'
          onClick={onSubmit}
          loading={createRuleset.isPending}
          disabled={!raw.trim() || !attested}
        >
          {t('forms.rulesetUpload.uploadCta')}
        </Button>
        <Text variant='muted' size='sm'>
          {t('forms.rulesetUpload.metadataNote')}
        </Text>
      </Stack>
    </Stack>
  );
}
