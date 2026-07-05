'use client';

import { useAuth } from '@/features/auth/stores/auth-store';
import { SignInGate } from '@/features/auth/components/SignInGate';
import { AccountSettings } from '@/features/profiles/components/AccountSettings';
import { useTranslation } from '@/lib/i18n/hooks';

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return (
      <SignInGate
        heading={t('pages.settings.authHeading')}
        prompt={t('pages.settings.authPrompt')}
      />
    );
  }

  return <AccountSettings />;
}
