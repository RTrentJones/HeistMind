// F94 — the /discord guide must match the REAL slash-command manifest (it drifted: `/heist log`
// instead of `/log`, missing unlink/about/account, a "claim a character" step that doesn't exist).
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_MANIFEST } from '@heist-mind/discord';
import '@/lib/i18n';
import { COMMANDS, DiscordGuideContent } from '../DiscordGuideContent';

type Opt = { name: string; type: number; options?: Opt[] };
const SUB = 1;

/** command root → its subcommand names (empty for leaf commands). */
const manifest = new Map(
  COMMAND_MANIFEST.map(c => [
    c.name,
    ((c.options ?? []) as Opt[]).filter(o => o.type === SUB).map(o => o.name),
  ])
);

/** Every `/root [sub|sub]` mention in a guide row, e.g. "/heist link|unlink" → heist:[link,unlink]. */
function mentions(text: string): Array<{ root: string; subs: string[] }> {
  return [...text.matchAll(/\/([a-z]+)(?: ([a-z|]+))?/g)].map(m => ({
    root: m[1] ?? '',
    subs: m[2] ? m[2].split('|') : [],
  }));
}

describe('/discord guide ↔ command manifest', () => {
  it('every command and subcommand the guide names exists in the manifest', () => {
    for (const row of COMMANDS) {
      for (const { root, subs } of mentions(row.command)) {
        expect(manifest.has(root), `/${root} is not a registered command`).toBe(true);
        const known = manifest.get(root) ?? [];
        for (const sub of subs) {
          if (known.length === 0) continue; // a leaf command's option text, not a subcommand
          expect(known, `/${root} ${sub} is not a registered subcommand`).toContain(sub);
        }
      }
    }
  });

  it('every registered command and subcommand appears in the guide', () => {
    const covered = new Set<string>();
    for (const row of COMMANDS)
      for (const { root, subs } of mentions(row.command)) {
        covered.add(root);
        for (const s of subs) covered.add(`${root} ${s}`);
      }
    for (const [root, subs] of manifest) {
      expect(covered, `/${root} missing from the guide`).toContain(root);
      for (const sub of subs)
        expect(covered, `/${root} ${sub} missing`).toContain(`${root} ${sub}`);
    }
  });
});

describe('DiscordGuideContent', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('states the real setup order and never promises a "claim a character" feature', () => {
    render(<DiscordGuideContent />);
    const steps = screen.getByTestId('discord-setup-steps');
    expect(steps.textContent).toMatch(/create the campaign on this site/i);
    expect(steps.textContent).toMatch(/invite link/i);
    expect(document.body.textContent).not.toMatch(/claim a character/i);
  });

  it('shows the install links only when the Discord app id is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '');
    const { unmount } = render(<DiscordGuideContent />);
    expect(screen.queryByTestId('discord-install')).toBeNull();
    unmount();

    vi.stubEnv('NEXT_PUBLIC_DISCORD_APP_ID', '123456789012345678');
    render(<DiscordGuideContent />);
    const server = screen.getByRole('link', { name: /add heistmind to your discord server/i });
    expect(server.getAttribute('href')).toContain('client_id=123456789012345678');
    expect(server.getAttribute('href')).toContain('integration_type=0');
    expect(
      screen.getByRole('link', { name: /add it to your discord account/i }).getAttribute('href')
    ).toContain('integration_type=1');
  });
});
