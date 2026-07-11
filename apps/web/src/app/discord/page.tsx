import type { Metadata } from 'next';
import { DiscordGuideContent } from '@/features/marketing/components/DiscordGuideContent';

export const metadata: Metadata = {
  title: 'HeistMind on Discord — the play-by-post bot',
  description:
    'Sheet-rated FitD rolls, stress, harm, XP, clocks, and GM controls as Discord slash commands. Getting started and the full command reference.',
};

/** The player-facing bot guide (F67) — the page a GM sends players. Public, no auth required. */
export default function DiscordGuidePage() {
  return <DiscordGuideContent />;
}
