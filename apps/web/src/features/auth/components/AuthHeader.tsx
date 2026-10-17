'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { ClickwrapNotice } from '@/features/auth/components/ClickwrapNotice';
import { COMING_SOON } from '@/lib/coming-soon';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { Button, Header, HeaderBrand, HeaderActions, Text, ThemeToggle } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';
import { captureError } from '@heist-mind/telemetry';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';
import i18n from '@/lib/i18n';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

const NAV_LINKS = [
  { href: '/games', key: 'navigation.campaigns' },
  { href: '/characters', key: 'navigation.characters' },
  { href: '/rulesets', key: 'navigation.rulesets' },
  { href: '/settings', key: 'navigation.settings' },
] as const;

/** Hamburger / close glyph for the phone menu button (decorative — the button is labelled). */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      className='h-5 w-5'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
    >
      {open ? <path d='M6 6l12 12M18 6L6 18' /> : <path d='M4 7h16M4 12h16M4 17h16' />}
    </svg>
  );
}

/**
 * The site header (F93). One compact row at every width: the brand (a link home — NOT the page's
 * h1; each page owns its own h1), then the actions. Signed in, the full nav shows from `lg`; below
 * that the links + account actions collapse behind a menu button (a disclosure: `aria-expanded`,
 * focus moves into the panel on open, Escape / outside click / navigation close it and focus
 * returns to the button). The header used to wrap into a ~266px sticky block on phones.
 */
export function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const { t } = useTranslation();
  const { signIn: handleDiscordSignIn } = useSignIn();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  // Any navigation closes the menu.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    // Move focus into the panel so keyboard/screen-reader users land on the first link.
    menuPanelRef.current?.querySelector<HTMLElement>('a, button, select')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuPanelRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      closeMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      captureError(error, { 'error.surface': 'auth.sign-out' });
      useNotificationStore
        .getState()
        .error(i18n.t('errors:auth.signOutFailed'), errorMessage(error) || undefined);
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const signedIn = isAuthenticated && !!user;
  const welcome = signedIn
    ? t('auth.header.welcomeUser', { name: user.profile?.displayName || user.email || '' })
    : '';

  return (
    <>
      <Header size='sm'>
        <HeaderBrand className='min-w-0'>
          <Link
            href='/'
            className='rounded-md font-display text-2xl font-bold leading-none tracking-tight text-foreground-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary sm:text-3xl'
          >
            <span className='text-brand-primary'>Heist</span>Mind
          </Link>
        </HeaderBrand>

        <HeaderActions className='gap-2'>
          {signedIn ? (
            <>
              <nav aria-label={t('navigation.chrome.navLabel')} className='max-lg:hidden'>
                <ul className='flex items-center gap-1'>
                  {NAV_LINKS.map(link => (
                    <li key={link.href}>
                      <Button asChild variant='ghost' size='sm'>
                        <Link
                          href={link.href}
                          aria-current={isActive(link.href) ? 'page' : undefined}
                          className='aria-[current=page]:bg-brand-primary/10'
                        >
                          {t(link.key)}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
              <Text size='sm' variant='muted' className='max-w-48 truncate max-lg:hidden'>
                {welcome}
              </Text>
              <div className='max-lg:hidden'>
                <LanguageSwitcher />
              </div>
              <ThemeToggle className='max-sm:h-11 max-sm:w-11' />
              <Button
                variant='outline'
                size='sm'
                onClick={handleSignOut}
                loading={isLoading}
                className='max-lg:hidden'
              >
                {t('auth.header.signOut')}
              </Button>
              <Button
                ref={menuButtonRef}
                variant='ghost'
                size='icon'
                className='h-11 w-11 lg:hidden'
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={
                  menuOpen ? t('navigation.chrome.closeMenu') : t('navigation.chrome.openMenu')
                }
                onClick={() => setMenuOpen(o => !o)}
              >
                <MenuIcon open={menuOpen} />
              </Button>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <ThemeToggle className='max-sm:h-11 max-sm:w-11' />
              {COMING_SOON ? null : (
                // Prod is behind the always-on coming-soon gate (main only) — no sign-in is shown.
                <>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleDiscordSignIn}
                    loading={isLoading}
                    className='max-sm:hidden'
                  >
                    {t('auth.header.signIn')}
                  </Button>
                  {/* Phones get the short label so the header stays one row; the button does the
                    same thing (Discord OAuth) either way. */}
                  <Button
                    variant='default'
                    size='sm'
                    onClick={handleDiscordSignIn}
                    loading={isLoading}
                    className='whitespace-nowrap'
                  >
                    <span className='sm:hidden'>{t('auth.header.signIn')}</span>
                    <span className='max-sm:hidden'>{t('auth.header.signUpDiscord')}</span>
                  </Button>
                </>
              )}
            </>
          )}
        </HeaderActions>

        {signedIn && menuOpen && (
          <div
            id={menuId}
            ref={menuPanelRef}
            className='absolute inset-x-0 top-full border-b border-border-primary bg-background-primary shadow-lg lg:hidden'
          >
            <nav
              aria-label={t('navigation.chrome.navLabel')}
              className='mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6'
            >
              <ul className='flex flex-col gap-1'>
                {NAV_LINKS.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      onClick={() => closeMenu(false)}
                      className='flex min-h-11 items-center rounded-md px-3 text-base font-medium text-foreground-primary hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary aria-[current=page]:bg-brand-primary/10 aria-[current=page]:text-brand-fg'
                    >
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className='mt-2 flex flex-wrap items-center gap-3 border-t border-border-primary px-3 pt-3'>
                <Text size='sm' variant='muted' className='min-w-0 flex-1 truncate'>
                  {welcome}
                </Text>
                <LanguageSwitcher />
                <Button variant='outline' size='sm' onClick={handleSignOut} loading={isLoading}>
                  {t('auth.header.signOut')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </Header>
      {/* Signed-out clickwrap under the header's sign-in buttons (desktop only — the page-level
          notices carry it on phones). Outside the sticky header so it scrolls away and never
          makes the header row wrap. max-sm:hidden, NOT `hidden sm:block` (F83). */}
      {!signedIn && !COMING_SOON && (
        <div className='mx-auto flex max-w-7xl justify-end px-4 pt-1 max-sm:hidden sm:px-6 lg:px-8'>
          <ClickwrapNotice className='text-right' />
        </div>
      )}
    </>
  );
}
