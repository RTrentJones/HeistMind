// The Discord bot install links (F94 / US-D7). The application id is public (it is in every
// install URL) and comes from NEXT_PUBLIC_DISCORD_APP_ID, inlined at build. Unset or malformed →
// null, and every install button renders nothing (no broken link).
//
// Two install models, both registered by the command manifest (integration_types GUILD + USER):
//   - server: `bot applications.commands`, permissions=0. The bot user carries NO permissions —
//     it is only present so the one bot-token lookup (a thread's parent category, F66) can read
//     the channel; every reply rides the interaction webhook.
//   - user:   `applications.commands` installed to the person's account — dice + their sheet in
//     any server or DM ("sheet anywhere"); campaign links still need a server install.

const SNOWFLAKE = /^\d{17,20}$/;

/** The configured Discord application id, or null when unset/malformed. */
export function discordAppId(
  raw: string | undefined = process.env.NEXT_PUBLIC_DISCORD_APP_ID
): string | null {
  const id = raw?.trim();
  return id && SNOWFLAKE.test(id) ? id : null;
}

export type DiscordInstallKind = 'server' | 'user';

/** The OAuth2 authorize URL that installs the app to a server or to the person's account. */
export function discordInstallUrl(appId: string, kind: DiscordInstallKind): string {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', appId);
  if (kind === 'server') {
    url.searchParams.set('scope', 'bot applications.commands');
    url.searchParams.set('permissions', '0');
    url.searchParams.set('integration_type', '0');
  } else {
    url.searchParams.set('scope', 'applications.commands');
    url.searchParams.set('integration_type', '1');
  }
  return url.toString();
}
