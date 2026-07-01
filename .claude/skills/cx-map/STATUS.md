# HeistMind — Status & Plans

The product-state half of the `cx-map` skill: **what HeistMind is, what's built, the constraints
worth knowing, and what's next.** This replaces the retired `.memory-bank/` (a Cline-style memory
bank that drifted badly out of date). Keep it current per `SKILL.md` — when state or plans change,
edit here and bump `_Last verified:_`. Sibling docs: `BRD.md` (**the scope-of-record**), `CX-MAP.md`
(every page + flow), `FINDINGS.md` (the prioritized backlog).

## What it is

> **Re-scope (2026-06-27, value-prop sharpened 2026-06-28):** HeistMind is **not** a VTT or a live
> play engine — it is a **rules-driven character + crew manager**, used **two ways**:
> - **Mode 1 — sheet anywhere:** build a rules-valid scoundrel + crew and bring it to any table
>   (in person, live voice, or here). *The "D&D Beyond for FitD" job.*
> - **Mode 2 — the live mechanical layer for async play-by-post on Discord:** rolls, clocks, stress,
>   per-score gear, crew/faction state, and a score-grouped campaign log built up as the story posts
>   over days. The narrative stays in Discord prose; the mechanics + shared truth live here.
>   *("Avrae for Forged in the Dark" — and FitD has no Avrae today; see `COMPETITIVE.md`.)*
>
> Earlier wording ("between-session tracker") undersold Mode 2 — for PbP there is no session; play is
> continuous and HeistMind is the surface used *while* you play.
> - **Core value:** rules-driven management — every step/action the system offers is rules-legal, so
>   players don't have to read the rules. Correctness is built in.
> - **À la carte:** capabilities are opt-in — just char sheets, or crew tracking, or full in-app play,
>   or the Discord bot — in any combination. Nothing forces a full workflow.
>
> The full scope, requirements, and gap analysis live in **`BRD.md`**; the competitive frame in
> **`COMPETITIVE.md`** — read both before planning new work. Existing dice/downtime features are
> **kept but reframed as optional result sources**.

HeistMind is a rules-driven character + crew **manager + tracker** for **Blades in the Dark** and
other **Forged in the Dark (FitD)** tabletop RPGs. GMs upload custom FitD rulesets and run campaigns;
players build rule-driven characters and share DB-backed campaign state (crew, characters, XP,
per-score gear, clocks, factions, a score-grouped results log) that everyone loads on view.

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
  mark-XP and spend-advance; **indulge vice** rolls your lowest attribute and clears the highest die
  (with overindulge), per BitD.
- **BitD rules accuracy** (`feat/bitd-rules-accuracy` branch, SRD-grounded): 7 starting action dots
  (3 seeded + 4), exactly 1 ability (a radio-style **swap** in the wizard, not a stack), enforced
  trauma sets; **crew-aware validation** — the campaign crew raises the action cap (Mastery→4), the
  action-dot budget (Deadly), load (Mule), and opens veteran cross-playbook picks. This applies to the
  **editor's level-ups too, not just creation** (the editor loads the crew so a Mastery member can buy
  the 4th dot). Heat→wanted cascade; hardened ruleset upload. See FINDINGS F54.
- **Dice:** async roller (`dice.ts` `rollOutcome` — crit/success/partial/bad, 0-dice take-lowest) with
  **resistance rolls** (`resistanceStress` = `6 − highest die`), persisted to a per-campaign **roll
  log** (the async-play centerpiece) that now shows who + when and annotates resistance/downtime.
- **Multiplayer:** GMs generate **join codes** (targeted + public) and players **join by code**; the
  `/games` hub lists created + joined campaigns. A joined member can open the campaign — `00011`
  extended the rulesets RLS so members can read their campaign's ruleset (F53). Verified end-to-end
  by `e2e/specs/join-via-code.spec.ts`. (Backend: `SupabaseInvitationRepository` +
  `redeem_invite_code` RPC, `00010`/`00011`.)
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
  tables. _(The `characters` row itself is a real table — `created_by`, `game_id`, `original_ruleset_id`
  etc. — so structural changes like **Phase 5 portable characters** (making `game_id` nullable) are
  migrations, not JSONB-only edits.)_
- **Rulesets are snapshots.** Loading a ruleset copies its content into the DB row; it does not track
  the bundle afterward. Reloading the starter refreshes it. See `ruleset-content-is-a-snapshot`.
- **i18n is being restored (PR #59).** The i18next scaffold (`apps/web/src/lib/i18n/`:
  provider/hooks/server + `translations/en.json`, wired via `I18nProvider` in the root layout) is now
  used across the public surface, auth, the character wizard/sheet/editor, the campaign panels
  (rolls/clocks/crew/factions), and the ruleset catalog — English-only, translation-ready, with a
  file-gated `LanguageSwitcher`. The `t` functions are memoized (`useCallback`) so they're effect-safe.
  An ESLint `no-literal-string` gate (`eslint-plugin-i18next`, `jsx-text-only`) now enforces this on
  `apps/web/src/**` — hardcoded JSX copy fails CI, so the system can't silently rot again.
- **Design language.** FitD-themed tokens in `packages/ui/src/styles/globals.css`
  (`game-ember`/`game-crimson` = stress/danger, `game-gold` = XP, `game-steel`); `ThemeProvider` +
  display fonts are mounted and the `ThemeToggle` (light/dark/system) lives in the header (PR #59).
- **App shell.** Authenticated routes are wrapped by `AppShell` (header + breadcrumb wayfinding +
  skip-to-main + `<main>`); inner pages previously had no nav chrome at all. The marketing landing
  (`/`) and auth callback (`/auth/*`) keep their own layouts.

## Plans

**The 9-phase "real FitD play-by-post tool" plan is complete and in prod.** On top of it, the **BRD
re-scope Phases 1–3 shipped to prod** (2026-06): **per-score play** (`scores` table + `ScorePanel`
start/end + per-score `LoadoutCard`), the **campaign log** (the `rolls` table widened with
action/resistance/fortune/downtime/loadout/score/note kinds, score-grouped feed + `AddResultForm` for
off-app results), and **roster/retire** (`CharacterRoster`: player→character attribution, status,
Retire). **Phase 5 + 5b (portable characters — F56)** also shipped (2026-06-29): migration `00014`
makes `characters.game_id` a **nullable pointer** (single active campaign), with the ruleset bound on
the character + attach/detach RPCs, standalone `/characters*` routes, and **5b** owner controls to
**move / detach / clone** (no migration — reuses the RPCs). **Phase 4 (Discord bot)** and **Phase 5c
(cross-ruleset adaptation)** remain specified/deferred. What's next is driven by the audit, not a sprint board:

- **`FINDINGS.md` is the backlog** — severity-scored CX flaws + FitD gaps from Audit 1. Its
  closing "themes worth a dedicated pass" section is the de-facto roadmap. Highest-leverage clusters:
  1. **Async shared feed** — F2 join/invite, F5 who-rolled, F6 timestamps **resolved (PR #59)**; F7
     zero-dice still open. The multiplayer loop now has a front door + per-entry context.
  2. **The roll loop** — F3 resistance **resolved (PR #59)**; F8 position/effect help, F9
     push/devil's-bargain, F10 teamwork, F16 flashbacks, F52 consequences still open — the substance
     of Blades play. Downtime: indulge-vice (stress clear) shipped (PR #59); F15 rest still open.
  3. **Progression** (F17 crew rep→tier, F18 crew XP, F19 heat→wanted, F50 ability gating).
  4. **Explainability** (cheap help text for opaque-but-present mechanics).
- **Deferred (separate future plan):** realtime presence / live multiplayer via Supabase Realtime.
  The async load-on-view model is sufficient and intentional for play-by-post.

**In flight (2026-07-01): the code-quality remediation (`CODE-QUALITY.md`) is the active workstream.**
Tiers 1–2 shipped; Tier 3 — the **React Query data-access seam** (`features/{concept}/data/` as the
only repository-touching layer, writes as `useMutation` + `invalidateQueries`) — is mostly merged to
`development` (#91–#98). Remaining before it closes: ~11 simple-write call sites + `CharacterEditor` +
the auth/creation stores, then the **ESLint boundary rule** (lands last), then Tier 4 (god-component
splits + F42 role-gating). See `CODE-QUALITY.md` for per-item status and the stale-read migration
lesson.

Pick a cluster, ship it through the `deploy-verify-promote` loop, and flip the relevant `FINDINGS.md`
entries to `fixed @<sha>` (updating `CX-MAP.md` sections + `_Last verified:_` as you go).

_Last verified:_ 2026-07-01 @ 0402001 (code-quality Tier 3 / RQ data seam mostly merged, #91–#98; CODE-QUALITY.md carries the live status)
