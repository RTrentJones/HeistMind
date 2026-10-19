// Round 5 P2-4 — a full campaign was invisible to the GM: "Campaign setup" is closed once players
// are in, and nothing outside it said "full" while the player at the door was told to ask the GM
// to raise the limit "under Players" (inside the closed panel).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { CampaignSetup } from '../CampaignSetup';

const panel = () => screen.getByTestId('campaign-setup');

describe('CampaignSetup', () => {
  it('closed once players are in, with no full line while seats are open', () => {
    render(
      <CampaignSetup
        initiallyOpen={false}
        capacity={{ players: 2, limit: 4, open: 2, full: false }}
      >
        <p>Players</p>
      </CampaignSetup>
    );
    expect(panel()).not.toHaveAttribute('open');
    expect(screen.queryByTestId('campaign-full')).toBeNull();
  });

  it('a FULL campaign says so on the summary and opens the panel', () => {
    render(
      <CampaignSetup initiallyOpen={false} capacity={{ players: 4, limit: 4, open: 0, full: true }}>
        <p>Players</p>
      </CampaignSetup>
    );
    expect(panel()).toHaveAttribute('open');
    // On the always-visible summary line, not inside the disclosure body.
    const line = screen.getByTestId('campaign-full');
    expect(line).toHaveTextContent('Full — 4 of 4 players. Raise the player limit under Players');
    expect(line.closest('summary')).not.toBeNull();
  });

  it('still opens for a GM alone in the campaign (no capacity passed)', () => {
    render(
      <CampaignSetup initiallyOpen>
        <p>Players</p>
      </CampaignSetup>
    );
    expect(panel()).toHaveAttribute('open');
  });
});
