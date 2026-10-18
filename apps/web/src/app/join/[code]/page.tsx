'use client';

import { use } from 'react';
import { JoinInvite } from '@/features/invitations/components/JoinInvite';

/** The shareable invite link (F94): /join/<code> — redeem when signed in, explain + sign in when not. */
export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <JoinInvite rawCode={decodeURIComponent(code)} />;
}
