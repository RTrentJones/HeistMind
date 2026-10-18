// F95 — the hub's "Play this campaign on Discord" card said "Add the bot…" next to an install
// button that renders nothing when NEXT_PUBLIC_DISCORD_APP_ID is unset. Step 1 now matches what's
// on screen in both states.
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/lib/i18n';
import { DiscordLinkCard } from '../DiscordLinkCard';

afterEach(() => vi.unstubAllEnvs());

describe('DiscordLinkCard', () => {
  it('without an app id: no button, and step 1 does not point at one', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '');
    render(<DiscordLinkCard campaignName='The Job' />);
    expect(screen.queryByTestId('discord-install')).toBeNull();
    const card = screen.getByTestId('discord-link-card');
    expect(card).not.toHaveTextContent(/button below/i);
    expect(card).toHaveTextContent(/install link isn't available on this site yet/i);
  });

  it('with an app id: the button renders and step 1 points at it', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '123456789012345678');
    render(<DiscordLinkCard campaignName='The Job' />);
    expect(screen.getByTestId('discord-install')).toBeInTheDocument();
    expect(screen.getByTestId('discord-link-card')).toHaveTextContent(/with the button below/i);
    // Commands are code-formatted (pixel round 3).
    expect(screen.getByText('/character use').tagName).toBe('CODE');
    expect(screen.getByText('/heist link campaign:The Job').tagName).toBe('CODE');
  });
});
