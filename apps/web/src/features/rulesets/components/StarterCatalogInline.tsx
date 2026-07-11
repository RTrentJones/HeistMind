'use client';

import type { Ruleset } from '@heist-mind/core';
import { Badge, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useRulesetsByCreator } from '@/features/rulesets/data/queries';
import { useTranslation } from '@/lib/i18n/hooks';
import { LoadBuiltinRulesetButton } from './LoadBuiltinRulesetButton';

/**
 * The built-in ruleset catalog as an INLINE list — the one-click way past the "you need a ruleset
 * first" wall (F37): character creation and the campaign form embed it so a brand-new user starts
 * with Blades/Brackwater/Wicked Ones in place, no /rulesets round-trip. `/rulesets` renders the
 * same list (single implementation). Entries the user already owns say so (F60 — the CTA becomes
 * "refresh my copy" instead of a second identical "Add"). `onLoaded` receives the OWNED copy so
 * the caller continues with it directly.
 */
export function StarterCatalogInline({ onLoaded }: { onLoaded?: (ruleset: Ruleset) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Copies are created under the builtin's name (the refresh flow matches on it too).
  const owned = useRulesetsByCreator(user?.id);
  const ownedNames = new Set((owned.data ?? []).map(r => r.name));
  return (
    <Stack direction='column' gap='sm'>
      {BUILTIN_RULESETS.map(b => (
        <Card key={b.id} variant='default'>
          <Stack direction='row' justify='between' align='center' className='flex-wrap gap-2'>
            <div className='min-w-0'>
              <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                <Heading level='h3'>{b.content.metadata.name}</Heading>
                <Badge variant={b.tier === 'starter' ? 'gold' : 'steel'}>{b.tier}</Badge>
                {b.license && <Badge variant='steel'>{b.license}</Badge>}
              </Stack>
              {b.blurb && (
                <Text variant='muted' size='sm'>
                  {b.blurb}
                </Text>
              )}
              {b.attribution && (
                <Text variant='muted' size='sm' className='mt-1 italic'>
                  {b.attribution}
                </Text>
              )}
            </div>
            <LoadBuiltinRulesetButton
              builtin={b}
              variant='outline'
              alreadyAdded={ownedNames.has(b.content.metadata.name)}
              {...(onLoaded ? { onLoaded } : {})}
            />
          </Stack>
        </Card>
      ))}
      <Text variant='muted' size='sm'>
        {t('components.starterCatalog.footnote')}
      </Text>
    </Stack>
  );
}
