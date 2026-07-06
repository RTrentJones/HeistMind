# HeistMind E2E + Greenlight deploy gate

One Playwright suite that runs in two places, selected entirely by `PLAYWRIGHT_BASE_URL`:

| Context                                     | `PLAYWRIGHT_BASE_URL`              | Backend                           | Gate             |
| ------------------------------------------- | ---------------------------------- | --------------------------------- | ---------------- |
| PR CI (`ci.yml` → `e2e` job)                | unset → boots `pnpm dev:web`       | local Supabase (`supabase start`) | blocks the PR    |
| Greenlight deploy (`greenlight-verify.yml`) | the deployed preview/beta/prod URL | that env's Supabase               | blocks promotion |
| Local dev                                   | a running app, or unset            | whatever the app points at        | —                |

## The auth problem, and how we solve it

Discord OAuth **cannot** be scripted reliably (third-party consent screen, bot detection,
possible MFA). So we never drive it for authenticated journeys. Instead — **Supabase admin
session injection**:

1. `global-setup.ts` uses the **service-role key** to create deterministic test users
   (`auth.admin.createUser`). This fires the existing `handle_new_user` trigger, so each user
   gets a real `profiles` row — the same state a Discord sign-up produces.
2. It signs each user in and serializes the session exactly the way the browser supabase-js
   client would (`support/storage-state.ts` runs a real client over an in-memory store and reads
   back what it wrote — version-proof against key/format drift).
3. Playwright injects that session as `storageState`, so `gmPage` / `playerPage` fixtures start
   already logged in. Two independent contexts in one test = tenant-isolation assertions.

Discord itself is still covered, narrowly: `specs/auth-discord.spec.ts` asserts the **redirect
wiring** (click → Supabase `/auth/v1/authorize?provider=discord&redirect_to=…/auth/callback`)
without following it into discord.com. A real round-trip stays a manual check.

### Graceful degradation

If no `SUPABASE_SERVICE_ROLE_KEY` is configured, global-setup no-ops and the auth-gated specs
**skip** (the fixture detects the missing storageState). The public specs still run — mirroring
`verify/heistmind.config.ts`, which stays green on the api check alone when its optional key is
absent. So the deploy gate is useful immediately and gets deeper as you wire env secrets.

## Running locally

```bash
# 1. Local backend (Docker required)
supabase start
# Map its keys into your shell (or apps/web/.env.local):
supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY

# 2. Run the suite (boots the dev server itself)
pnpm test:e2e            # headless
pnpm test:e2e:ui         # Playwright UI mode
pnpm test:e2e:report     # open the last HTML report

# Against an already-running / deployed app instead:
PLAYWRIGHT_BASE_URL=https://beta.heistmind.com pnpm test:e2e
```

## Layout

```
e2e/
  global-setup.ts          provision test users + write injected sessions
  specs/
    home.spec.ts           public surface (always runs)
    auth-discord.spec.ts   Discord redirect wiring (no live consent screen)
    auth-callback.spec.ts  /auth/callback loading + error paths
    auth-session.spec.ts   injected session → signed-in UI, sign-out, reload persistence
    gm-games.spec.ts       SCAFFOLD (test.fixme) — GM ruleset/game/invite journeys
    player-characters.spec.ts  SCAFFOLD — join + character creation + progression
    tenant-isolation.spec.ts   SCAFFOLD — RLS: a player can't see another game's data
  support/
    env.ts                 env resolution + hasAdminAuth()
    supabase-admin.ts      create/find/delete test users (service role)
    storage-state.ts       version-proof session → storageState
    fixtures.ts            gmPage / playerPage pre-authenticated contexts
    paths.ts               .auth/ storage-state locations
```

## Coverage matrix

| Area                                          | Status                           | Spec                        |
| --------------------------------------------- | -------------------------------- | --------------------------- |
| Home renders, signed-out actions              | ✅ live                          | `home.spec.ts`              |
| Discord redirect wiring                       | ✅ live                          | `auth-discord.spec.ts`      |
| OAuth callback loading + error                | ✅ live                          | `auth-callback.spec.ts`     |
| Injected session, sign-out, reload            | ✅ live (needs service-role key) | `auth-session.spec.ts`      |
| GM: upload ruleset / create game / invite     | 🟡 scaffold                      | `gm-games.spec.ts`          |
| Player: join / create character / progression | 🟡 scaffold                      | `player-characters.spec.ts` |
| RLS tenant isolation (dual-context)           | 🟡 scaffold                      | `tenant-isolation.spec.ts`  |

Scaffolds are `test.fixme` because the underlying features don't exist yet (the game/character
repositories in `packages/database/src/provider.ts` are still `{} as any`, and the app has only
`/` and `/auth/callback`). As each feature lands, drop the `.fixme` and fill the body — the
authenticated fixtures are already there to drive the real UI.

## Greenlight integration

Greenlight ≥ 2.15 ships a `suite` option on the `playwright` verify mode: it runs a real Playwright
suite against the deployed URL, injecting it as `PLAYWRIGHT_BASE_URL` (and `GREENLIGHT_VERIFY_URL`).
`verify/heistmind.config.ts` uses it, so a single `greenlight verify` runs `api` + `playwright` +
`agent-web` and the deploy gate fails if any user journey fails. `greenlight-verify.yml` installs
pnpm + the chromium browser before invoking greenlight (the suite shells out to
`pnpm exec playwright test`). The identical suite runs at PR time via `ci.yml` against a local
Supabase stack — write once, gate everywhere.
