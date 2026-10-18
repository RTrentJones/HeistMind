// F94 — the bot install links: only for a well-formed app id; server vs user install.
import { describe, expect, it } from 'vitest';
import { discordAppId, discordInstallUrl } from '@/lib/discord-install';

describe('discordAppId', () => {
  it('accepts a Discord snowflake and rejects anything else', () => {
    expect(discordAppId('123456789012345678')).toBe('123456789012345678');
    expect(discordAppId(' 123456789012345678 ')).toBe('123456789012345678');
    expect(discordAppId(undefined)).toBeNull();
    expect(discordAppId('')).toBeNull();
    expect(discordAppId('your-app-id')).toBeNull();
    expect(discordAppId('123')).toBeNull();
  });
});

describe('discordInstallUrl', () => {
  it('server install: bot + commands, zero permissions, guild integration', () => {
    const url = new URL(discordInstallUrl('123456789012345678', 'server'));
    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('123456789012345678');
    expect(url.searchParams.get('scope')).toBe('bot applications.commands');
    expect(url.searchParams.get('permissions')).toBe('0');
    expect(url.searchParams.get('integration_type')).toBe('0');
  });

  it('user install: commands only, user integration', () => {
    const url = new URL(discordInstallUrl('123456789012345678', 'user'));
    expect(url.searchParams.get('scope')).toBe('applications.commands');
    expect(url.searchParams.get('integration_type')).toBe('1');
    expect(url.searchParams.has('permissions')).toBe(false);
  });
});
