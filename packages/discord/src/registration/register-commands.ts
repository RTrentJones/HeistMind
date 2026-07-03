/* eslint-disable no-console -- CLI script: stdout IS the operator interface */
// Registers the command manifest with Discord: a bulk PUT (atomic + idempotent — the full set
// replaces whatever was registered). Run per app: the dev application from `development`, the
// prod application from `main` (each Discord app has ONE interactions endpoint URL).
// Creds-guarded: absent credentials exit 0 so secret-less runs/forks skip cleanly.
import { COMMAND_MANIFEST } from '../commands/manifest';

export type RegistrationOutcome = 'skipped' | 'registered' | 'failed';

/** The registration logic, separated from the CLI shell so tests drive it with a stubbed fetch. */
export async function registerCommands(env: {
  appId?: string | undefined;
  botToken?: string | undefined;
  apiBase?: string | undefined;
}): Promise<RegistrationOutcome> {
  const { appId, botToken } = env;
  if (!appId || !botToken) {
    console.log('DISCORD_APP_ID / DISCORD_BOT_TOKEN absent — skipping command registration.');
    return 'skipped';
  }

  const apiBase = env.apiBase ?? 'https://discord.com/api/v10';
  const response = await fetch(`${apiBase}/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      authorization: `Bot ${botToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(COMMAND_MANIFEST),
  });

  if (!response.ok) {
    console.error(`Registration failed: HTTP ${response.status}`);
    console.error(await response.text());
    return 'failed';
  }

  console.log(`Registered ${COMMAND_MANIFEST.length} commands for application ${appId}.`);
  return 'registered';
}

// CLI entry (tsx). vitest imports this module with a different argv[1], so tests never auto-run.
if (process.argv[1]?.includes('register-commands')) {
  void registerCommands({
    appId: process.env.DISCORD_APP_ID,
    botToken: process.env.DISCORD_BOT_TOKEN,
    apiBase: process.env.DISCORD_API_BASE,
  }).then(outcome => {
    if (outcome === 'failed') process.exitCode = 1;
  });
}
