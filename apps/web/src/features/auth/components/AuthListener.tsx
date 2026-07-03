'use client';

import { useEffect } from 'react';
import { initAuthListener } from '@/features/auth/stores/auth-store';

/** Mounts the auth session listener once, app-wide (see initAuthListener — no import-time I/O). */
export function AuthListener() {
  useEffect(() => {
    initAuthListener();
  }, []);
  return null;
}
