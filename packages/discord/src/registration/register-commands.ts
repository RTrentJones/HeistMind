// Registers the command manifest with Discord: a bulk PUT (atomic + idempotent — the full set
// replaces whatever was registered). Run per app: the dev application from `development`, the
// prod application from `main` (each Discord app has ONE interactions endpoint URL).
// Creds-guarded: absent credentials exit 0 so secret-less runs/forks skip cleanly.
import { COMMAND_MANIFEST } from '../commands/manifest';

const DISCORD_API_BASE = process.env.DISCORD_API_BASE ?? 'https://discord.com/api/v10';

async function main(): Promise<void> {
  const appId = process.env.DISCORD_APP_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) {
    console.log('DISCORD_APP_ID / DISCORD_BOT_TOKEN absent — skipping command registration.');
    return;
  }

  const response = await fetch(`${DISCORD_API_BASE}/applications/${appId}/commands`, {
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
    process.exitCode = 1;
    return;
  }

  console.log(`Registered ${COMMAND_MANIFEST.length} commands for application ${appId}.`);
}

void main();
