'use client';

import Link from 'next/link';
import { Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The clickwrap line under every sign-in affordance: "By signing in, you agree to the Terms of
 * Service and Privacy Policy." Split-key i18n (prefix/link/joiner/link/suffix) — the established
 * pattern for copy with embedded links (see forms.rulesetUpload.starterHint*).
 */
export function ClickwrapNotice({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Text variant='muted' size='xs' className={className}>
      {t('auth.clickwrap.prefix')}
      <Link href='/legal/terms' className='underline'>
        {t('auth.clickwrap.termsLink')}
      </Link>
      {t('auth.clickwrap.joiner')}
      <Link href='/legal/privacy' className='underline'>
        {t('auth.clickwrap.privacyLink')}
      </Link>
      {t('auth.clickwrap.suffix')}
    </Text>
  );
}
