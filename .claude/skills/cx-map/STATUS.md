# HeistMind — Status & Plans

The product-state half of the `cx-map` skill: **what HeistMind is, what's built, the constraints
worth knowing, and what's next.** This replaces the retired `.memory-bank/` (a Cline-style memory
bank that drifted badly out of date). Keep it current per `SKILL.md` — when state or plans change,
edit here and bump `_Last verified:_`. Sibling docs: `CX-MAP.md` (every page + flow), `FINDINGS.md`
(the prioritized backlog).

## What it is

HeistMind is a management platform for **Blades in the Dark** and other **Forged in the Dark
(FitD)** tabletop RPGs, aimed at **async, Discord-style play-by-post** games. GMs upload custom FitD
rulesets and run campaigns; players build rule-driven characters and play through a shared,
DB-backed campaign state (rolls, clocks, crew, factions) that everyone loads on view.

The problems it targets (kept from the old `productContext.md` as useful framing):

- **Ruleset fragmentation** — every FitD hack has its own playbooks/rules; HeistMind makes rulesets
  data (uploaded JSON), so one engine runs many systems.
- **Onboarding & rule confusion** — a guided character wizard + rules-aware sheets lower the barrier
  for new players.
- **Progression tracking across games** — characters, XP, harm, and crew/faction state persist.

## Current state (built & shipped to prod)

The full FitD play loop shipped across 9 phases (see the completed plan in §Plans):

- **Characters:** per-action ratings (12 actions) with **derived attributes**, special abilities
  with rules text, identity (heritage/background/vice), loadout/stash, coin.
- **In-play:** live stress (9) + trauma (4), harm (2/2/1), **XP tracks** (playbook + attribute) with
  mark-XP and spend-advance.
- **Dice:** async roller (`dice.ts` `rollOutcome` — crit/success/partial/bad, 0-dice take-lowest),
  persisted to a per-campaign **roll log** (the async-play centerpiece).
- **Campaign objects:** progress **clocks** (4/6/8/10/12), a **crew sheet** (type, tier, rep, heat,
  wanted, hold, abilities, claims, cohorts, coin/vault), and **factions** (tier, status −3..+3,
  project clocks).
- **Platform:** Discord OAuth (Supabase Auth v2); multi-tenant via per-env Postgres schemas
  (`development`/`production`) + RLS; Next.js 15 / React 19 / Tailwind 4 monorepo on Vercel.

Every FitD mechanic is **opt-in via ruleset config**, so older point-buy rulesets keep working; the
bundled **Brackwater** starter opts into full FitD mode.

- **Built-in ruleset catalog.** `/rulesets` now offers a one-click catalog (`BUILTIN_RULESETS` in
  `packages/shared/src/builtin-rulesets/`): **Brackwater** (original), **Blades in the Dark**
  (CC BY 3.0, with attribution), and **Wicked Ones** (CC0). Each loads as an editable, owned copy.
  Built-ins are type-checked TS constants. An additive, optional `crew.resourcePools` field (the one
  engine change) backs Wicked Ones' dungeon hoard/threat tracks and pre-positions ship/mech "gambit"
  pools. Licensing rationale + the deferred games (S&V, Band of Blades, Girl by Moonlight, Wildsea,
  Slugblaster) are logged in `FINDINGS.md` F55.

## Architecture & constraints worth knowing

- **Async play-by-post, no realtime.** All shared state is DB-backed and loaded on view; there is
  **no** Supabase Realtime / WebSocket layer. (The old memory bank described a realtime
  `useRealtimeCharacter` design — that was never built and is explicitly out of scope.)
- **Multi-tenant by per-env schema + RLS.** Campaign-level tables live in a `development` or
  `production` schema; reads gate on `is_active_game_member`, GM writes on `is_game_gm`. Migrations
  are single self-contained `DO` blocks that auto-deploy per env (dev push → `development`, main →
  `production`). See the `heistmind-migration-pattern` memory for the recipe.
- **Character mechanics ride JSONB.** `CharacterData` is JSONB, so action ratings / harm / loadout /
  xp are type-only additions (no migration); only campaign objects (rolls/clocks/crews/factions) get
  tables.
- **Rulesets are snapshots.** Loading a ruleset copies its content into the DB row; it does not track
  the bundle afterward. Reloading the starter refreshes it. See `ruleset-content-is-a-snapshot`.
- **i18n is available but not pervasive.** An i18next scaffold exists (`apps/web/src/lib/i18n/`:
  provider/hooks/server + `translations/en.json`, wired via `I18nProvider` in the root layout), but
  only ~5 of ~32 screens use it and there is **no** lint rule enforcing it — most UI ships plain
  strings. The old memory-bank "localize every string, ESLint-enforced" mandate was never in force;
  treat i18n as optional today and don't cite that mandate as reality.
- **Design language.** FitD-themed tokens in `packages/ui/src/styles/globals.css`
  (`game-ember`/`game-crimson` = stress/danger, `game-gold` = XP, `game-steel`); dark-first palette
  (a light palette is defined but the theme toggle isn't wired — see `FINDINGS.md` F20).

## Plans

**The 9-phase "real FitD play-by-post tool" plan is complete and in prod.** What's next is driven by
the audit, not a sprint board:

- **`FINDINGS.md` is the backlog** — severity-scored CX flaws + FitD gaps from Audit 1. Its
  closing "themes worth a dedicated pass" section is the de-facto roadmap. Highest-leverage clusters:
  1. **Async shared feed** (F2 join/invite, F5 who-rolled, F6 timestamps, F7 zero-dice) — the
     multiplayer loop's missing front door + context.
  2. **The roll loop** (F3 resistance, F8 position/effect help, F9 push/devil's-bargain, F10
     teamwork, F16 flashbacks, F52 consequences) — the substance of Blades play.
  3. **Progression** (F17 crew rep→tier, F18 crew XP, F19 heat→wanted, F50 ability gating).
  4. **Explainability** (cheap help text for opaque-but-present mechanics).
- **Deferred (separate future plan):** realtime presence / live multiplayer via Supabase Realtime.
  The async load-on-view model is sufficient and intentional for play-by-post.

Pick a cluster, ship it through the `deploy-verify-promote` loop, and flip the relevant `FINDINGS.md`
entries to `fixed @<sha>` (updating `CX-MAP.md` sections + `_Last verified:_` as you go).

_Last verified:_ 2026-06-26 @ 69180e1
