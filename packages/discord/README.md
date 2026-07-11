# @heist-mind/discord

HeistMind's Discord client: Ed25519 request verification, the interaction router, the slash-command
handlers, and the command manifest + registration script. The web app's `/api/discord` route
(`apps/web/src/app/api/discord/route.ts`) is a thin transport over this package — Discord
interactions are signed HTTP webhooks, so there is **no gateway process and no separate bot app**.

## Local development — no tunnel, no Discord app

```bash
node scripts/discord-post.mjs ping          # first run generates .discord-dev-keys.json
# put the printed DISCORD_PUBLIC_KEY in .env.local, then:
pnpm dev:web
node scripts/discord-post.mjs roll --dice 3 --position risky --effect standard
node scripts/discord-post.mjs forged        # expect HTTP 401
```

The E2E suite does the same automatically: `playwright.config.ts` generates
`e2e/.discord-test-keys.json`, hands the public key to the managed dev server, and
`e2e/specs/discord.spec.ts` signs real requests with it.

## Operator runbook — the two Discord applications

One Discord application has ONE interactions endpoint URL, so beta and prod each get their own app
(test on beta with the dev app before promoting):

|                         | Dev app ("HeistMind Dev")                     | Prod app ("HeistMind")                |
| ----------------------- | --------------------------------------------- | ------------------------------------- |
| Interactions endpoint   | `https://<beta domain>/api/discord`           | `https://<prod domain>/api/discord`   |
| Registered from branch  | `development`                                 | `main`                                |
| GitHub Actions secrets  | `DISCORD_DEV_APP_ID`, `DISCORD_DEV_BOT_TOKEN` | `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN` |
| Vercel env (per target) | `DISCORD_PUBLIC_KEY` (preview/beta)           | `DISCORD_PUBLIC_KEY` (production)     |

Setup, per app, in the [Discord developer portal](https://discord.com/developers/applications):

1. Create the application. Under **Installation**, enable BOTH install contexts (Guild Install +
   **User Install**) — user-install is what makes `/roll` work in any server or DM.
2. Copy the **Public Key** → the matching Vercel target's `DISCORD_PUBLIC_KEY` env var (managed in
   the sibling repo's `infra/heistmind.tf` alongside the Supabase vars). Redeploy.
3. Copy the **Application ID** and a **Bot token** → the GitHub Actions secrets above, then run the
   `Discord commands` workflow (or push a manifest change) to register the slash commands.
4. Only now set the **Interactions Endpoint URL** — Discord validates it on save with a PING and
   forged-signature probes, so the deployment must already hold the public key.
5. Sanity check in Discord: `/heist about` shows the deployed commit SHA.

Never point the dev app at localhost — Discord re-validates the URL on save and you'd break beta.
Use `scripts/discord-post.mjs` for local iteration instead.

## Command reference

`/heist help` shows this in Discord, grouped by what each command needs.

| Command                                        | Needs                  | Does                                                                                                                                                         |
| ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/roll dice:` `[position]` `[effect]` `[note]` | nothing                | Manual FitD action roll (0d = 2d take-lowest), classified outcome                                                                                            |
| `/resist dice:` `[attribute]`                  | nothing                | Resistance roll — stress = 6 − highest; a crit clears 1                                                                                                      |
| `/fortune dice:`                               | nothing                | Fortune roll                                                                                                                                                 |
| `/dice notation:`                              | nothing                | Plain NdM±k                                                                                                                                                  |
| `/heist about` · `/heist help`                 | nothing                | Deploy probe / this reference                                                                                                                                |
| `/character use\|show\|unset`                  | account                | Pick / show / clear your ACTIVE character (one at a time)                                                                                                    |
| `/roll action:` `[extra]` `[push]`             | active character       | Sheet-rated roll; push charges its 2 stress when the roll persists                                                                                           |
| `/stress add\|clear`                           | active character       | Clamped stress delta on the sheet                                                                                                                            |
| `/harm take\|clear`                            | active character       | Harm with RAW track escalation / clear one entry — both feed-logged; `take armor:true` spends a carried armor box (one level lighter, lesser absorbed — F44) |
| `/vice indulge`                                | active character       | Lowest-attribute vice roll; clears stress; flags overindulgence                                                                                              |
| `/xp mark\|advance`                            | active character       | Bank pool XP / spend an advance (abilities + action dots, autocompleted)                                                                                     |
| `/heist link\|unlink`                          | GM, in a guild         | Link a campaign to the channel, its category, or the whole server                                                                                            |
| `/heist status`                                | member, linked channel | Score / crew / running clocks at a glance                                                                                                                    |
| `/log text:`                                   | member, linked channel | Record a settled result — attributed, active-score-tagged                                                                                                    |
| `/score start\|end`                            | GM, linked channel     | Operation lifecycle (feed events tagged to the score)                                                                                                        |
| `/crew heat\|tier\|incarcerate`                | GM, linked channel     | Heat→wanted cascade · spend a full Rep track · Wanted −1 + Heat cleared                                                                                      |
| `/crew xp\|advance`                            | GM, linked channel     | Mark crew advancement XP (8-box track) · spend a FULL track: reset + take a new crew ability                                                                 |
| `/clock tick`                                  | GM, linked channel     | Advance/wind a clock; FILLING it announces the milestone                                                                                                     |
| `/faction status`                              | GM, linked channel     | Set the −3 war … +3 allied standing                                                                                                                          |

In a linked channel, `/roll action:` and `/resist` PERSIST through the engine when the roller is a
member and their active character crews that campaign — the embed footer says where the roll landed
("Logged to …") or exactly why it didn't. Everything else that persists (`/harm`, `/xp`, GM
commands) feed-logs through the same engine use-cases the web app calls.

## Phases

All four phases are built: **0** manual FitD roller (no account link) → **1** active-character
rolls → **2** channel/category/server↔campaign links + persisted `/roll`/`/resist` + `/log` →
**3** gameplay parity (`/stress` `/harm` `/vice` `/xp` + the GM commands) and `/heist help`. See
the BRD Phase-4 appendix (`.claude/skills/cx-map/BRD.md`).
