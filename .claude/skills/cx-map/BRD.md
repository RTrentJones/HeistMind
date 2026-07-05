# HeistMind — Business Requirements Document (BRD)

The scope-of-record for HeistMind. Sibling of `STATUS.md` (what's built), `CX-MAP.md` (every
page/flow), `FINDINGS.md` (the prioritized defect/improvement backlog), and `COMPETITIVE.md`
(positioning). When scope changes, edit here first, then reconcile the others.

_Last reviewed: 2026-07-05 (v2 — full rewrite: personas + user stories added, NFRs added,
coverage table refreshed post-Phase-4/5 and the piping-bug audit; requirement IDs R-A…R-I are
STABLE and unchanged — they are referenced throughout `FINDINGS.md` and `CX-MAP.md`)._

## Product statement

HeistMind is **not** an authoritative play engine or VTT. It is a **rules-driven character + crew
manager** for Forged in the Dark, used **two ways** (one product, two modes):

> **Mode 1 — sheet anywhere.** Build a rules-valid scoundrel and crew (every action the app offers is
> legal for your ruleset) and bring it to any table — in person, on live voice, or here. _The "D&D
> Beyond for FitD" job._
>
> **Mode 2 — the live mechanical layer for async play-by-post on Discord.** As a PbP game posts over
> days/weeks, HeistMind holds the shared mechanical state — rolls, clocks, stress, per-score gear,
> crew/faction state, and a score-grouped campaign log — reachable both in-app and **as slash
> commands in Discord itself** (the shipped bot). **The narrative stays in Discord prose; the
> mechanics + shared truth live here.** _("Avrae for Forged in the Dark" — and FitD has no other
> Avrae; the competitive frame is in `COMPETITIVE.md`.)_

Actual play happens wherever the group plays. Every mechanical surface serves both modes: a result
can be rolled in-app, rolled via the bot, **or** entered after being settled elsewhere. The
mechanical layer + tracker, not the table's narration, is the product.

## Personas

- **The GM** — creates campaigns, owns/uploads rulesets, runs the shared state (crew, clocks,
  factions, scores), invites players, adjudicates play. Uses web for setup and either surface for
  play.
- **The Player** — joins a campaign by code, builds rules-valid characters, plays them (rolls,
  stress, harm, XP, loadout) on web or Discord. May belong to several campaigns.
- **The Solo Scoundrel (Mode 1)** — no campaign at all: builds and maintains standalone characters
  as portable sheets for tables that play entirely elsewhere.
- **The Discord-first Group** — a PbP table living in a Discord server; the GM links channels to
  the campaign and the whole gameplay loop runs as slash commands, with the web app as the
  shared-truth viewer and the creation surface.
- **The Operator** — deploys/promotes via the Greenlight loop, owns the Discord applications and
  secrets, and watches CI gates. (Served by NFRs, not user stories.)

## Core value & guiding principles

These govern every requirement and design call below.

- **CV — Rules-driven management (the core value).** The reason to use HeistMind is that **you don't
  have to read the rules carefully**: every step the system presents and every action it lets you
  take is **already rules-legal for your ruleset + campaign context** (point/dot budgets, ability
  gating, caps, load limits, trauma/harm bounds, crew-aware effects). _Every new feature must
  preserve this: if the system offers it, it must be allowed._
- **P1 — À la carte ("take what you want, leave the rest").** Capabilities are **independently
  adoptable**: only sheets, only crew tracking, the full in-app loop, or the Discord bot — in any
  combination. Scores, in-app dice, Discord, even a crew are opt-in; every screen degrades
  gracefully when an optional piece is absent.
- **P2 — Log, don't gate play.** HeistMind records _settled_ results; it does not block the table.
  Results may originate in-app, on Discord, or be entered after the fact.

## Non-goals

- **Not** the authoritative rules engine for resolving play — position/effect, consequences, and
  adjudication stay with the table/GM. Dice (in-app or bot) are a convenience, not a requirement.
- **No** real-time presence / VTT. The async **load-on-view + log** model is intentional.
- Equipment is **not** a creation choice or an advancement — it is a **per-score** operational choice.
- **No gateway bot / message-content parsing** — the Discord client is an interactions endpoint
  (slash commands only; no privileged intents); no proactive outbound posts (v1).
- **Creation flows stay web-only** — Discord parity is **gameplay only** (characters, campaigns,
  and rulesets are built on the web).

---

## User stories

Format: `US-<area><n>` · story · [requirements] · **status** (✅ shipped · 🟡 partial (F-refs) ·
❌ open). Statuses cross-reference `FINDINGS.md`; a story is 🟡/❌ only when a finding or phase
records why.

### Onboarding & identity

- **US-O1** As a new visitor, I understand the two modes (sheet anywhere / Discord play layer)
  from the landing page and can sign in with Discord in one click. [R-I1] ✅
- **US-O2** As a signed-in user with nothing yet, my dashboard walks me through a 1-2-3 start
  (build a character · create a campaign · join a game). [R-I2] ✅ _(F37 fixed)_
- **US-O3** As a returning user, my dashboard opens to **my** campaigns, characters, and recent
  activity — not marketing. [R-I2] 🟡 _(works; sections pop in without loading states, and content
  is untested — F79)_
- **US-O4** As a user whose sign-in fails, I see what went wrong and how to retry. [R-I1]
  ❌ _(F40 — 2s flash then an unexplained redirect home)_
- **US-O5** As a signed-out visitor landing on any protected page, I get a clear sign-in
  affordance, not bare text. [R-I1] 🟡 _(primary routes ✅; six secondary routes bare — F72)_

### Rulesets (the CV foundation)

- **US-R1** As a GM, I can add a built-in starter system to my rulesets in one click ("add a copy
  I own"), or upload my own FitD ruleset as JSON with guidance and validation. [R-I3] ✅
- **US-R2** As a GM, a malformed upload is rejected inline with plain-language reasons — nothing
  half-imports. [R-I3, CV] ✅
- **US-R3** As a GM, reloading a starter refreshes my copy's content instead of erroring.
  [R-I3] ✅
- **US-R4** As a user, ruleset content drives every downstream surface (wizard steps, action
  lists, XP tracks, load limits) so what I'm offered is always legal for **my** system. [CV] ✅

### Characters — building (web-only by design)

- **US-C1** As a player, the creation wizard only offers legal choices — playbook, point-buy
  budgets, dot caps, ability tiers/prerequisites — and tells me **why** Next/Create is disabled.
  [R-B1, R-B4, CV] ✅
- **US-C2** As a player, I can build a character with **no campaign** (standalone) and it lives in
  My Characters with a full sheet. [R-F4, R-F5, R-F7] ✅
- **US-C3** As a player, I can attach a standalone character to a matching-ruleset campaign, detach
  it back, move it between campaigns, or clone it. [R-F6] ✅ _(cross-ruleset adaptation = Phase 5c,
  open)_
- **US-C4** As a player, I record friends/rivals (contacts) during creation, not just in the
  editor afterwards. [R-B1] ❌ _(F12 — contacts step missing from the wizard)_

### Characters — playing (web + Discord parity)

- **US-P1** As a player, I roll actions from my sheet's real ratings with position/effect, push
  (+1d for 2 stress, actually charged) and devil's bargain, and the outcome is classified for me.
  [R-H1, R-B2, CV] ✅
- **US-P2** As a player, I resist a consequence and the stress cost (6 − highest; crit clears 1;
  zero-dice takes lowest) is computed and applied for me. [R-H1, R-B2, CV] ✅ _(F64/P2 display bug
  fixed)_
- **US-P3** As a player, I mark/clear stress, take harm (with RAW track escalation), and heal —
  and campaign-relevant changes land in the shared log. [R-B2, R-E1] 🟡 _(bot ✅; web harm edits
  are editor-only and feedless — F65)_
- **US-P4** As a player, I mark XP on the tracks my system actually uses and spend advances only
  when the rules allow. [R-C1, CV] ✅ _(web track-marks skip the feed event — F70)_
- **US-P5** As a player, I indulge my vice to clear stress and overindulgence is flagged.
  [R-H1] ✅
- **US-P6** As a player, I pick a per-score load level and equip up to my (ability-modified) limit
  as I go; a new score prompts a reset. [R-D2, R-D3, CV] ✅ _(F45 closed — per-score level exists)_
- **US-P7** As a player, harm and armor affect my rolls the way the book says. [CV]
  ❌ _(F43 harm penalties; F44 armor inert)_
- **US-P8** As a player, I can use teamwork moves (assist, lead a group action, set up, protect)
  and flashbacks. [R-H1] ❌ _(F10, F16 — reclassified optional result sources, still absent)_
- **US-P9** As a player, downtime offers the full menu (recover, acquire, long-term project,
  reduce heat, train), not just vice. [R-H1] ❌ _(F15)_

### Campaigns & membership

- **US-M1** As a GM, I create a campaign on a ruleset; a duplicate name is explained in plain
  language. [R-I2, R-I3] ✅
- **US-M2** As a GM, I generate an invite code; as a player, I join with it and the campaign
  appears in my list with a Player badge. [R-I2] ✅
- **US-M3** As a joined player, the campaign hub actually opens (roster, crew, clocks, factions,
  log all readable). [R-I2, R-A4] ✅ _(F53 fixed)_
- **US-M4** As a GM, I see a roster of players → characters with statuses, and can retire a
  character (coin banked to stash, logged, kept for history). [R-F1, R-F2, R-F3] ✅
- **US-M5** As a member, everything shared survives reload and is visible to every player on
  load (async play-by-post model). [R-A4, R-E1] ✅

### GM campaign state

- **US-G1** As a GM, I maintain the crew sheet (type, tier, rep, heat, wanted, abilities, claims,
  cohorts, coin/vault) and progression runs by the rules (rep→tier, heat→wanted cascade,
  incarceration). [R-A1..A3, CV] ✅
- **US-G2** As a GM, I run progress clocks (4/6/8/10/12) and filling one is announced as the
  table-visible milestone. [R-G1] ✅
- **US-G3** As a GM, I track factions (tier, status −3..+3) against the crew. [R-G2] 🟡 _(war
  state + faction project clocks unsurfaced — F47)_
- **US-G4** As a GM, I start/end scores; everything the table does groups under the active score.
  [R-D1, R-D5, R-E2] ✅ _(payout/downtime transition not modelled — by scope decision #2)_
- **US-G5** As a GM, I control the campaign lifecycle state players see. [R-I2] 🟡 _(F32 — state
  badge shown, no control to change it)_

### The campaign log (the spine)

- **US-L1** As a member, every settled mechanical event — rolls, score lifecycle, loadout, XP,
  harm, crew/faction/clock changes, notes — lands in one append-only, score-grouped feed with
  who/what/when. [R-E1, R-E2] ✅ _(one exception: web track-XP — F70)_
- **US-L2** As a member, I can record a result settled elsewhere (in person / in prose) after the
  fact. [R-E3, P2] ✅
- **US-L3** As a member, what the feed displays matches what the rules charged (e.g. zero-dice
  resists). [R-E2, CV] ✅ _(audit P2 fixed)_

### Discord (Mode 2 — the bot)

- **US-D1** As anyone in any server or DM (no account needed), I roll FitD dice — `/roll`,
  `/resist`, `/fortune`, `/dice` — with outcomes classified. [R-H2] ✅
- **US-D2** As a player, signing into the web app with Discord IS the account link; `/character
  use` then makes my sheet roll from Discord (`/roll action:` with autocomplete from my own
  ruleset). [R-H2.3] ✅ _(F68 fixed — the link is trigger-written at signup)_
- **US-D3** As a GM, I link a channel, category, or the whole server to my campaign; rolls and
  sheet changes there persist to the campaign log, attributed and score-tagged. [R-H2.1, R-H2.2,
  R-H2.4] ✅ _(threads under a category-only link don't resolve — F66)_
- **US-D4** As a player on Discord, I have gameplay parity: `/stress`, `/harm` (RAW escalation),
  `/vice`, `/xp` (track-aware) — the same engine the web uses. [R-H2.5+] ✅
- **US-D5** As a GM on Discord, I run the campaign: `/score`, `/crew`, `/clock` (fills announced),
  `/faction` — with autocompletes that never leak state to non-GMs. [R-H2] ✅
- **US-D6** As a non-member, I learn nothing — not even the campaign's name — from any command or
  autocomplete. [R-H2.3, N-SEC] ✅
- **US-D7** As a new Discord user, `/heist help` shows me the whole surface grouped by what each
  tier needs, and the web tells me the bot exists and how to install it. 🟡 _(help ✅; no
  player-facing web docs/install page — F67)_

### Cross-cutting experience

- **US-X1** As any user, errors speak my language (no raw Postgres/HTTP), loading and empty states
  are distinct, and a failed inline save never destroys my working view. 🟡 _(F60 raw strings in
  panels; F73 sheet-swap on save error; F74 empty-state flash)_
- **US-X2** As a keyboard/screen-reader/low-vision user, the app is navigable and readable (skip
  link, focus order, contrast). 🟡 _(fixed cases F1/F41; no automated enforcement — F76)_
- **US-X3** As any user, I can switch theme and language. ✅
- **US-X4** As a mobile user, the sheet and hub are usable one-handed at the table. 🟡 _(F57 —
  scoped follow-up)_

---

## Functional requirements

IDs are stable and referenced by `FINDINGS.md` + `CX-MAP.md`. **All requirements are subject to
CV** (everything offered is rules-legal) **and P1** (each capability is opt-in and independently
usable).

### A. Crew tracking

- **R-A1** One crew per campaign: type, **tier (0–4)**, **rep**, **heat (0–9)**, **wanted (0–4)**, hold, coin, vault.
- **R-A2** Crew **abilities**, **claims**, **cohorts** (+ ruleset-defined resource pools).
- **R-A3** Campaign-long **progression**: rep → tier; crew **XP track** → advances; incarceration (−1 wanted / clear heat); heat → wanted cascade.
- **R-A4** GM-maintained, shared, **persists between sessions** (load-on-view; every member sees it on reload).

### B. Character tracking

- **R-B1** Build: playbook, **action ratings / attributes**, **special abilities**, heritage/background/vice, contacts (friend/rival).
- **R-B2** Live condition: **stress**, **trauma** (named conditions), **harm** (three RAW tracks with escalation).
- **R-B3** **Coin** and **stash**.
- **R-B4** Rules-aware creation, **without baking in per-score things** (see D).

### C. XP & advancement (campaign-long)

- **R-C1** **Character XP** — playbook + attribute tracks (or flat pool, per ruleset); mark XP, spend advances (cost/prereq/track gated server-side).
- **R-C2** **Crew XP** the same way (see R-A3).
- **R-C3** XP changes are a **logged campaign event**. _(🟡 web `setXp` residue — F70.)_

### D. Per-score play

- **R-D1** **Score lifecycle (opt-in)** — "Start/End score"; a score is a first-class, game-scoped record. Groups that skip scores get a single resettable "current loadout" (P1).
- **R-D2** **Per-character, per-score loadout** — pick a **load level** (light/normal/heavy, ability-modified), equip items up to the limit as you go; lives on the character as the resettable "current" loadout.
- **R-D3** **Reset between scores** — a new score prompts a loadout reset, recorded as a log note.
- **R-D4** **Loadout changes are logged.**
- **R-D5** **Reviewable history** of past scores and their events.

### E. Campaign log

- **R-E1** A **unified, append-only campaign log**: rolls/outcomes, score start/end, loadout, XP, downtime, **harm**, crew/faction/clock changes, notes.
- **R-E2** Each entry shows **who, what, when**, the **score** it belongs to, and displays values consistent with what the rules applied.
- **R-E3** Entries can be created in-app, **via the bot**, or entered after the fact — source-agnostic (P2).

### F. Character lifecycle & ownership

- **R-F1** **Player attribution** — every character attributed to a player; GM sees the roster.
- **R-F2** **Retire** — out of active play (coin → stash, logged), distinct from delete.
- **R-F3** Status (active/retired/dead) visible.
- **R-F4** **Standalone (portable) characters** — user-owned, ruleset-bound, no campaign required.
- **R-F5** **My Characters** — one surface for all of a user's characters + standalone sheets.
- **R-F6** **Attach / detach / move / clone** — single-active-campaign model, matching ruleset required; server-enforced via SECURITY DEFINER RPCs. _(Cross-ruleset adaptation = Phase 5c, open.)_
- **R-F7** **À la carte standalone** — campaign-scoped sections hide when unlinked.

### G. Campaign-state tracking

- **R-G1** **Progress clocks** (4/6/8/10/12); completion is the logged milestone, ticks are panel-state.
- **R-G2** **Factions** — tier (0–6) + status (−3..+3) vs the crew. _(War state + faction clocks unsurfaced — F47.)_

### H. Results capture & integrations

- **R-H1** **In-app dice (optional)** — action/fortune/resistance, position/effect, push/devil's-bargain, indulge-vice — one result source among several, never required.
- **R-H2** **Discord client** — shipped as slash commands over a signed interactions endpoint:
  - **R-H2.1** GM links a **channel, category, or server** to one campaign (precedence in that order; partial unique indexes enforce one campaign per surface).
  - **R-H2.2** `/log` records an attributed, score-tagged result; sheet rolls/`/resist` **persist through the engine** when linked + member + active-character-in-campaign.
  - **R-H2.3** Identity = web Discord OAuth (`profiles.discord_id`, trigger-written at signup); one **active character** per user (`/character use`); non-members rejected without information leaks.
  - **R-H2.4** Logged events auto-tag the **active score** (server-side).
  - **R-H2.5** Server-realized dice, anti-forge (repository recomputes outcomes from faces).
  - **R-H2.6** **Gameplay parity, creation excluded**: `/stress` `/harm` `/vice` `/xp` for players; `/score` `/crew` `/clock` `/faction` for GMs; `/heist help` discoverability. Manual dice require no account and store nothing.

### I. Platform

- **R-I1** Discord OAuth (Supabase Auth); the OAuth signup **is** the bot account link.
- **R-I2** GM + players; invite/join codes; per-campaign membership and roles.
- **R-I3** Uploadable/selectable rulesets + a built-in starter catalog ("add a copy you own").
- **R-I4** Environments: schema-per-env (development/production) in one Supabase project; branch-mapped deploys (PR→preview, development→beta, main→prod) with two Discord apps (dev→beta, prod→prod).

---

## Non-functional requirements

- **N-SEC1 — Row-level security** is the tenant boundary: `is_active_game_member` gates reads,
  `is_game_gm` gates GM writes; standalone rows are owner-scoped. _(⚠ the isolation guarantee has
  no executing e2e — F75.)_
- **N-SEC2 — Service-role discipline**: the bot's service-role client bypasses RLS, so **every
  character-mutating engine use-case asserts creator-is-actor** (`notOwner`), and bot handlers run
  the actor→membership→role prelude before any write. Attach/detach go through SECURITY DEFINER
  RPCs, never client-set foreign keys.
- **N-SEC3 — Signed interactions**: every Discord request is Ed25519-verified over the raw bytes
  before parsing; unsigned/forged → 401. Bot tokens are used only for command registration, never
  at runtime.
- **N-SEC4 — Secrets** flow via Terraform TF_VARs / GitHub Actions secrets / `greenlight secrets
  gather` (hidden input); never committed, never written to disk.
- **N-TEST1 — Gates**: lint + type-check + tests + build on every PR; per-package coverage floors
  are **upward-only ratchets** set from measured reality (engine 90, discord 90/70, core 100
  per-file rules, ui 40/62/44/40, web 15, database 36+); e2e (local Supabase) on every PR;
  Storybook smoke renders all stories; greenlight-verify gates every deployment.
- **N-TEST2 — Fixture provenance & trigger-owned rows**: tests build ruleset content from the
  shipped builtins, never invented shapes; e2e never hand-seeds rows a production trigger/RPC owns
  (see `CODE-QUALITY.md` "Testing discipline" — the F68/F69 response).
- **N-A11Y** — skip link, focus order, ARIA labels, contrast tokens; **target: axe-enforced in CI**
  _(currently unenforced — F76)_.
- **N-I18N** — all user-facing copy through the i18n layer (`en.json`); the bot owns its copy the
  same way (`format/copy.ts`).
- **N-PERF** — async load-on-view (no realtime); shared campaign state uses load-on-view +
  focus-refetch so a second player's open hub can't go stale; autocomplete answers within
  Discord's 3s budget (≤2 indexed queries + actor cache).
- **N-OPS** — ship via Greenlight deploy→verify→promote; single-DO-block per-env migrations with
  the types-regen handoff; creds-guarded CI (missing secrets skip cleanly, never fail).
- **N-PRIV** — manual dice store nothing and need no account; no Discord message-content access;
  the bot reads only slash-command interactions.

---

## Requirements coverage (2026-07-05)

**✅ Built · 🟡 Partial · ❌ Missing** — F-refs are the open work in `FINDINGS.md`.

| Req | Capability | Status | Notes |
| --- | --- | --- | --- |
| R-A1..A4 | Crew sheet + progression | ✅ | `CrewSheet`, `crews.ts` rules, engine use-cases |
| R-B1 | Character build | ✅ | wizard + editor; contacts step missing (F12) |
| R-B2 | Stress/trauma/harm | 🟡 | live trackers ✅; web harm edits feedless (F65); harm/armor don't affect rolls (F43/F44) |
| R-B3/B4 | Coin/stash; no per-score in build | ✅ | |
| R-C1/C2 | Character + crew XP | ✅ | track + flat modes, gated advances |
| R-C3 | XP changes logged | 🟡 | bot + flat-pool ✅; web `setXp` feedless (F70) |
| R-D1..D5 | Scores + per-score loadout + history | ✅ | F45 closed (per-score load level) |
| R-E1..E3 | Unified campaign log | ✅ | incl. `harm` kind + zero-dice display (audit P2/P3) |
| R-F1..F3 | Roster / retire / status | ✅ | |
| R-F4..F7 | Portable characters | ✅ | Phase 5 + 5b; 5c (cross-ruleset) open |
| R-G1 | Clocks | ✅ | |
| R-G2 | Factions | 🟡 | war state + faction clocks unsurfaced (F47) |
| R-H1 | In-app dice | 🟡 | core loop ✅; teamwork (F10), flashbacks (F16), fortune types (F46), consequence capture (F52), downtime menu (F15) open |
| R-H2 | Discord client | ✅ | all four phases; residue F65–F67 |
| R-I1..I4 | Platform | ✅ | F68 (identity trigger) fixed |
| N-SEC1 | RLS isolation | 🟡 | enforced in DB; **unproven by e2e (F75, S2)** |
| N-A11Y | Accessibility | 🟡 | fixed cases; no CI enforcement (F76) |

---

## Open backlog, by theme

`FINDINGS.md` is the authoritative item-by-item log (F-numbered, severity-scored). The themes:

1. **Prove the guarantees (test-estate)** — F75 player-perspective + RLS isolation scaffolds
   (the one S2); F78 deploy-gate blindness; F79 dashboard content; F80 UI-primitive coverage zeros;
   F71 knip triage → blocking.
2. **The play loop's depth (FitD fidelity)** — F43 harm penalties, F44 armor, F10 teamwork,
   F15 downtime menu, F16 flashbacks, F46 fortune types, F47 faction war/clocks, F52 consequences,
   F48 contact mechanics. All optional-by-scope (P2) but the biggest fidelity wins.
3. **Cross-client convergence** — F65 web harm → engine `takeHarm`/`clearHarm`; F70 web `setXp`
   → engine `markXp`; F66 thread-under-category links.
4. **Experience polish** — F73 sheet error-swap, F72 sign-in gates, F74 empty-state flash,
   F77 fortune affordance vs journey text, F60 clarity cluster, F81 My-Characters nav, F40
   auth-error dead-end, F57 mobile sheet, F32 lifecycle control, F12 contacts step.
5. **Reach** — F67 player-facing bot docs/install page; F55 builtin roster growth; Phase 5c
   cross-ruleset adaptation.

---

## Decisions log (standing)

1. **Campaign log shape** — widen the existing `rolls` log with kinds (`score_id` + kind CHECK
   migrations); no `events` rename.
2. **Score granularity** — score-only; real-life sessions are not modelled.
3. **Discord v1** — inbound-first; "outbound" is command replies/embeds only, no proactive posts.
4. **Loadout storage** — current loadout on the character, resettable; no per-score table.
5. **Character ↔ campaign** — single active campaign (nullable `game_id` pointer); attach requires
   a ruleset match; adaptation deferred to 5c. Chosen over copy-on-attach and many-to-many.
6. **Bot hosting (2026-07-03)** — interactions endpoint inside `apps/web` on Vercel (no gateway
   process); **two Discord applications** (dev→beta, prod→prod); short gameplay commands + the
   `/heist` admin group; link scopes channel/category/server.
7. **Ruleset access on create (round-3)** — inline catalog offer, not pre-grant; the user
   explicitly takes a copy they own.
8. **F13 inverted / F9-F15-F16 reclassified** — loadout is per-score, not a build property;
   push/downtime/flashbacks are optional result sources, not required mechanics.

---

## Appendix A — Discord client: shipped shape (Phase 4, #121–#132 + go-live fixes)

The client lives in **`packages/discord`** (Ed25519 verify, router, handlers, manifest, copy);
`apps/web/src/app/api/discord/route.ts` is a thin transport running deferred work in `after()`.
Registration is branch-mapped CI (`discord-commands.yml`); the full command reference is
`packages/discord/README.md` (in Discord: `/heist help`).

- **Requirements met**: R-H2.1 (widened to channel/category/server scopes), R-H2.2, R-H2.3
  (identity via the signup trigger — F68 fixed the missing write), R-H2.4, R-H2.5 (exceeded:
  engine-persisted anti-forge rolls), R-H2.6 (full gameplay parity + GM commands).
- **Security shape**: raw-bytes Ed25519 before parse; public-defer failures become
  delete+ephemeral; the engine ownership gate covers the service-role path (N-SEC2); GM-gated
  autocompletes leak nothing.
- **Data model**: `discord_players` (one active character per profile, 00016);
  `games.discord_guild_id/discord_channel_id` + partial unique indexes (00017); `harm` feed kind
  (00018); `profiles.discord_id` trigger-write + backfill (00019).
- **Operator model**: two Discord apps; `DISCORD_PUBLIC_KEY` per Vercel target via Terraform;
  registration secrets per branch; endpoint URL set **last** (Discord validates on save). Vercel
  Deployment Protection must stay **off** the endpoint's target (go-live incident).
- **Residue**: F65 (web harm parity), F66 (threads under category links), F67 (web docs page).

## Appendix B — Portable characters: shipped shape (Phase 5 + 5b)

Migration `00014`: nullable `game_id` (ON DELETE SET NULL — campaign deletion returns characters
to standalone), ruleset bound on the character (`original_ruleset_id`, backfilled),
`attach_character_to_game`/`detach_character` SECURITY DEFINER RPCs (ownership + membership +
ruleset match), partial unique name index for standalone rows. Routes: `/characters`,
`/characters/new` (ruleset picker → the same wizard), `/characters/[id]` (standalone sheet with
campaign sections hidden). 5b added move/clone (owner controls on the sheet, Duplicate on the
list) with no migration.

**Phase 5c (open)**: cross-ruleset adaptation via the reserved `adaptations` column (clone/move
into a different-ruleset campaign with re-validation + guided fixes); GM-initiated detach; the
`is_template` hook. Open decisions: standalone name collisions on attach (auto-suffix vs block);
detach authority (owner-only today).
