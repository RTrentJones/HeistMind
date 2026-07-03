# HeistMind — Business Requirements Document (BRD)

The scope-of-record for HeistMind. Sibling of `STATUS.md` (what's built), `CX-MAP.md` (every
page/flow), and `FINDINGS.md` (the prioritized backlog). When scope changes, edit here first, then
reconcile the others.

_Last reviewed: 2026-06-28 (value-prop sharpened to two modes; Phase 5 portable-characters spec added)._

## Product statement

HeistMind is **not** an authoritative play engine or VTT. It is a **rules-driven character + crew
manager** for Forged in the Dark, used **two ways** (one product, two modes):

> **Mode 1 — sheet anywhere.** Build a rules-valid scoundrel and crew (every action the app offers is
> legal for your ruleset) and bring it to any table — in person, on live voice, or here. *The "D&D
> Beyond for FitD" job.*
>
> **Mode 2 — the live mechanical layer for async play-by-post on Discord.** As a PbP game posts over
> days/weeks, HeistMind holds the shared mechanical state — rolls, clocks, stress, per-score gear,
> crew/faction state, and a score-grouped campaign log. **The narrative stays in Discord prose; the
> mechanics + shared truth live here.** *("Avrae for Forged in the Dark" — and FitD has no Avrae
> today; the competitive frame is in `COMPETITIVE.md`.)*

Actual play happens wherever the group plays. Existing dice/clocks/factions features serve both modes:
a result can be rolled in-app **or** entered after being settled elsewhere (in person / on Discord).
The mechanical layer + tracker, not the table's narration, is the product. *(An earlier framing called
this a "between-session record" — accurate for Mode 1, but it undersold Mode 2, where there is no
session: PbP play is continuous and HeistMind is the surface used while you play.)*

## Core value & guiding principles

These two principles govern every requirement and design call below.

- **CV — Rules-driven management (the core value).** The reason to use HeistMind is that **you don't
  have to read the rules carefully**: every step the system presents and every action it lets you take
  is **already rules-legal for your ruleset + campaign context**. The app guides valid choices and
  refuses illegal ones (point/dot budgets, ability gating, caps, load limits, trauma/harm bounds,
  crew-aware effects). This is HeistMind's edge over a paper sheet or a spreadsheet — correctness is
  built in. _Every new feature must preserve this: if the system offers it, it must be allowed._
- **P1 — À la carte ("take what you want, leave the rest").** Capabilities are **independently
  adoptable** and never forced into one workflow. A group can use **only character sheets** (and play
  in person), **only crew tracking**, the **full in-app play loop**, or the **Discord bot** — in any
  combination. Concretely: scores, the in-app dice, Discord, even a crew are **opt-in**; a lone player
  can track a single character with nothing else set up, and every screen degrades gracefully when an
  optional piece is absent.
- **P2 — Log, don't gate play.** HeistMind records *settled* results; it does not block the table.
  Results may originate in-app, on Discord, or be **entered after the fact**.

## Non-goals

- **Not** the authoritative rules engine for resolving play — position/effect, consequences, and
  adjudication stay with the table/GM. In-app dice are a convenience, not a requirement.
- **No** real-time presence / VTT. The async **load-on-view + log** model is intentional.
- Equipment is **not** a creation choice or an advancement — it is a **per-score** operational choice.

---

## Requirements

IDs are referenced by the gap comparison below and by `FINDINGS.md`. **All requirements are subject
to CV** (every step/action the system offers is rules-legal) **and P1** (each capability is opt-in and
independently usable — a group can adopt just one).

### A. Crew tracking
- **R-A1** One crew per campaign: type, **tier (0–4)**, **rep**, **heat (0–9)**, **wanted (0–4)**, hold, coin, vault.
- **R-A2** Crew **abilities**, **claims**, **cohorts**.
- **R-A3** Campaign-long **progression**: rep → tier; crew **XP track** → advances; incarceration (−1 wanted / clear heat); heat → wanted cascade.
- **R-A4** GM-maintained, shared, **persists between sessions** (load-on-view).

### B. Character tracking
- **R-B1** Build: playbook, **action ratings / attributes**, **special abilities**, heritage/background/vice, contacts (friend/rival).
- **R-B2** Live condition: **stress**, **trauma** (named conditions), **harm**.
- **R-B3** **Coin** and **stash**.
- **R-B4** Rules-aware creation, **without baking in per-score things** (see D).

### C. XP & advancement (campaign-long)
- **R-C1** **Character XP** — playbook + attribute tracks (or flat pool); mark XP, spend advances.
- **R-C2** **Crew XP** the same way (see R-A3).
- **R-C3** XP changes are a **logged campaign event**.

### D. Per-score play (the core re-scope)
- **R-D1** **Score lifecycle (opt-in)** — campaigns *may* run as a series of **scores/operations**;
  **"Start score" / "End score"** controls; a score is a first-class record (status, started/ended,
  optional name/notes), game-scoped. Groups that don't want scores can ignore them — loadout then
  behaves as a single resettable "current loadout" (P1).
- **R-D2** **Per-character, per-score loadout** — pick a **load level** (light 3 / normal 5 / heavy 6, ability-modified), **equip items up to the limit as you go**. Loadout stays **on the character** as the **resettable "current" loadout** (not a build property, not a per-score table); it's understood to be "for the active score."
- **R-D3** **Reset between scores** — starting a new score clears each character's current loadout; the reset is recorded as a **log note** ("loadout cleared").
- **R-D4** **Loadout changes are logged** — when a character (in a campaign) changes loadout, write a `loadout` entry to the campaign/roll log.
- **R-D5** **Reviewable history** of past scores and their events/loadouts.

### E. Campaign log (the spine of "track results between sessions")
- **R-E1** A **unified, append-only campaign log** of settled events: rolls/outcomes, score start/end, loadout changes, XP marks/advances, downtime, harm/trauma, crew/faction changes.
- **R-E2** Each entry shows **who, what, when**, and where relevant **which score** + **character/player**.
- **R-E3** Entries can be **created in-app** or **entered after the fact** (settled IRL/Discord) — source-agnostic.

### F. Character lifecycle & ownership
- **R-F1** **Player attribution** — every character is attributed to a player; a player may have several; the GM sees a **roster** of player → character(s).
- **R-F2** **Retire character** — move out of active play (stash → retirement), keep the record. Distinct from delete.
- **R-F3** Character status (active / retired / dead) visible in the roster.
- **R-F4** **Standalone characters (portable)** — a player can build + own a character **without a campaign**; it lives at the user level (`created_by`) and is bound to a **ruleset** the user can read. _(Phase 5.)_
- **R-F5** **My Characters** — a user sees + manages all their characters (standalone + in-campaign) and opens a **standalone sheet**, not just the dashboard list. _(Phase 5.)_
- **R-F6** **Attach to a campaign (link)** — a player brings a standalone character into one of their campaigns whose ruleset **matches**; the character is then linked (**single active campaign**), and its loadout + log follow that campaign (Phase-1 behaviour). _(Phase 5.)_
- **R-F7** **À la carte standalone** — a standalone character degrades gracefully: campaign-scoped sections (active score, shared roll log) hide when it isn't in a campaign (P1 — "a lone player can track a single character with nothing else set up"). _(Phase 5.)_

### G. Campaign-state tracking (kept — tracking, not play)
- **R-G1** **Progress clocks** (threats / projects / faction clocks, 4/6/8/10/12).
- **R-G2** **Factions** — tier (0–6) + status (−3..+3) vs the crew.

### H. Results capture & integrations
- **R-H1** **In-app dice (optional)** — keep the roller (action/fortune/resistance, position/effect, push/devil's-bargain, indulge-vice) as **one** result source, not the required surface.
- **R-H2** **Discord integration** — an Avrae-style bot so results rolled on Discord are **logged into HeistMind** against the right campaign/character (inbound-first; richer two-way later).

### I. Platform
- **R-I1** Discord OAuth; multi-tenant per-env schema + RLS.
- **R-I2** GM + players; invite/join codes; per-campaign membership and roles.
- **R-I3** Uploadable/selectable rulesets.

---

## Gap comparison — BRD vs. current state

**✅ Built · 🟡 Partial · ❌ Missing**

| Req | Capability | Status | Notes |
|---|---|---|---|
| R-A1/A2 | Crew sheet | ✅ | `crews` table; `CrewSheet.tsx` |
| R-A3 | Crew progression | ✅ | `crews.ts` `advanceTier`/`incarcerate`/`crewXp`/`applyHeat` |
| R-A4 | Crew persists/shared | ✅ | DB-backed, RLS |
| R-B1 | Character build | ✅ | `CharacterData`; creation wizard; sheet/editor |
| R-B2 | Stress/trauma/harm | ✅ | live trackers |
| R-B3 | Coin + stash | ✅ | coin tracked; stash banked on retire (Phase 3) |
| R-B4 | No per-score in build | ✅ | loadout left the build editor (Phase 1b) |
| R-C1 | Character XP | ✅ | `character-rules.ts` |
| R-C2 | Crew XP | ✅ | F18 |
| R-C3 | XP changes logged | 🟡 | `advancementHistory` only, not a unified log |
| R-D1 | Score lifecycle | ✅ | `scores` table + repo + `ScorePanel` (Phase 1a) |
| R-D2 | Per-score loadout | ✅ | `LoadoutCard` on the sheet, load-engine gated (Phase 1b) |
| R-D3 | Reset between scores | ✅ | staleness vs active score → "Reset for this score" |
| R-D4 | Loadout changes logged | ✅ | `loadout` events in the campaign/roll log |
| R-D5 | Score history | ✅ | feed grouped by score; recent scores on `ScorePanel` |
| R-E1/E2 | Unified campaign log | ✅ | `rolls` is the event log (`score_id`, kinds); feed grouped by score (Phase 2) |
| R-E3 | Record results from elsewhere | ✅ | `AddResultForm` → a `note` event (Phase 2) |
| R-F1 | Player roster/attribution | ✅ | `CharacterRoster` resolves `createdBy` → player (Phase 3) |
| R-F2 | Retire character | ✅ | roster Retire (GM/owner) → status + coin→stash, logged (Phase 3) |
| R-F3 | Status visibility | ✅ | status badges on roster + sheet (Phase 3) |
| R-G1 | Clocks | ✅ | `ClocksPanel.tsx` |
| R-G2 | Factions | ✅ | `FactionsPanel.tsx` |
| R-H1 | In-app dice (optional) | ✅ | keep, reframed |
| **R-H2** | **Discord bot** | ❌ | not started — `apps/discord-bot` does not exist yet |
| R-I1/I2/I3 | Platform | ✅ | auth, invites, rulesets |

### Headline gaps
1. ~~No "score" concept~~ → **done (Phase 1a):** `scores` table + `ScorePanel`.
2. ~~Loadout is in the wrong place~~ → **done (Phase 1b):** per-score `LoadoutCard` on the sheet.
3. ~~The log is only a roll log~~ → **done (Phase 2):** the roll log is the campaign event log — events carry `score_id`, the feed groups by score, and an "add result" entry records outcomes settled IRL/Discord. _(Caveat: XP marks/advances still land only in `advancementHistory`, not the feed — R-C3 stays 🟡; round-3 PR-3 closes it.)_
4. ~~No character lifecycle~~ → **done (Phase 3):** roster (player → character) + Retire (status + coin→stash).
5. **No Discord integration** (R-H2) — not started; no bot app exists. _(Phase 4.)_

### Already aligned (no work)
Crew + character + XP tracking, clocks, factions, auth/multiplayer/rulesets, and the in-app dice
(now optional) satisfy the re-scope as-is.

---

## Roadmap (phased; each ships via deploy → verify → promote)

> **Status (2026-06-29):** Phases 1–3 **and Phase 5 (portable characters)** are **shipped**. Phase 4
> (Discord) is **specified, not built** — see the detailed appendices at the end of this doc.

- **Phase 1 — Score model + per-score loadout** (R-D1..D4, B4) — ✅ **shipped.** `scores` table + per-score loadout
  storage; "Start/End score" on the campaign page; the sheet's gear becomes the **active score's
  loadout** (reset on new score); move loadout **out of the build editor**. Reuse `loadUsed`/
  `effectiveLoadLimit`.
- **Phase 2 — Unified campaign log** (R-C3, R-D4, R-E) — ✅ **shipped.** `rolls` widened with `score_id`
  + a `note` kind; the roll repo auto-tags the active score; a campaign feed **grouped by score**; an
  **"add result"** entry path for outcomes settled elsewhere.
- **Phase 3 — Character lifecycle & attribution** (R-F1..F3, B3) — ✅ **shipped.** `CharacterRoster`
  (player → character(s) + status); **Retire** (status + coin→stash, logged); status badges. No
  migration (`status` already a column).
- **Phase 4 — Discord integration** (R-H2) — **specified, not built.** See the detailed appendix below
  (interactions-endpoint design, channel↔campaign mapping, attribution via `profiles.discord_id`,
  the migration + credentials the work needs). Inbound-first.
- **Phase 5 — Portable characters** (R-F4..F7) — ✅ **shipped.** Closes **F56** (the biggest Mode-1
  gap): migration `00014` makes `game_id` a **nullable pointer** (single active campaign, `ON DELETE
  SET NULL`), binds the ruleset on the character (`original_ruleset_id`), and adds
  `attach_character_to_game` / `detach_character` RPCs. Routes `/characters`, `/characters/new`
  (ruleset picker → the existing wizard), `/characters/[id]` (standalone sheet + "Bring to a
  campaign"). **Phase 5b** (move/clone/cross-ruleset adaptation) deferred — see the appendix.

### Decisions (resolved 2026-06-27)
1. **Campaign log shape:** **widen the existing `rolls` log incrementally** — add `loadout`/`score`
   kinds now (the log already has kind/label/note); a full `rolls`→`events` rename is deferred to
   Phase 2 only if needed.
2. **Score granularity:** ✅ **score-only.** Sessions are real-life and NOT modelled (a score may span
   sessions, or several scores fit one session — "between sessions" = tracking IRL).
3. **Discord v1:** **inbound-only** (log results rolled on Discord); outbound deferred. _(Phase 4.)_
4. **Loadout storage:** ✅ **current loadout on the character** (Option A) — resettable; changes →
   campaign log; score reset → a "cleared" log note. **No per-score loadout table.** The only new
   table is `scores` itself.

### Decisions (resolved 2026-06-28)
5. **Character ↔ campaign (Phase 5):** ✅ **single active campaign (link/move).** One user-owned
   character row; `game_id` becomes a **nullable pointer** (`NULL` = standalone, `<id>` = currently
   linked). Chosen over **copy-on-attach** (two diverging sheets — which is "real"?) and
   **many-to-many** (un-FitD — a scoundrel belongs to one crew — and the largest rework: per-campaign
   loadout/log/RLS/roster). Matches the Phase-1 loadout decision (#4) and the latent `transferToGame`
   design. **Attach requires a ruleset match**; cross-ruleset adaptation (the `adaptations` column) is
   deferred to Phase 5b.

### FINDINGS re-scoped by this BRD
- **F13** (loadout at creation) → **inverted**: loadout leaves the build entirely and becomes
  per-score (R-D2).
- **F9 / F15 / F16** (push-bargain / downtime / flashbacks) → reclassified from "missing mechanics"
  to **optional result sources** — not required; logged if used.

---

## Appendix — Phase 4: Discord integration (detailed BRD)

**Status:** specified, **not built**. `apps/discord-bot` does not exist yet (the monorepo's
`apps/*` workspace glob reserves the slot). This appendix is the spec to build from when the
Discord app credentials are available; nothing here is implemented yet.

**Platform prerequisites (verified 2026-07-02 — none exist yet):** (1) a **service-role client
path** in `packages/database` — every current factory reads only the anon key, and
`getUserByDiscordId` needs `auth.admin`; (2) **explicit membership/ownership authz in the engine
use-cases** — today they trust `userId` because Postgres RLS on `auth.uid()` is the only guard,
and a service-role caller **bypasses RLS entirely**; (3) the `games.discord_channel_id` migration
below; (4) the interactions endpoint (no `app/api/` routes exist today). (1) and (2) are the
security-sensitive ones — build them first.

### Goal & scope
Let groups who play (or roll) on **Discord** push *settled results* into the HeistMind campaign log,
so the between-session record stays complete without leaving Discord (P2 — log, don't gate play).
**v1 is inbound-first:** Discord → HeistMind. Outbound (HeistMind posting state to Discord) is a
later iteration. This is **opt-in** (P1) — a group that doesn't use Discord is unaffected.

### Requirements
- **R-H2.1 — Link a channel to a campaign.** A GM links a Discord channel (and guild) to one HeistMind
  campaign. One active link per channel; a campaign may have one linked channel (v1).
- **R-H2.2 — Log a result from Discord.** A slash command records a result as a campaign-log event
  (the existing `note` kind), appearing in the in-app feed like any other entry.
- **R-H2.3 — Attribution.** The posting Discord user maps to their HeistMind player via the existing
  unique `profiles.discord_id`, and (when unambiguous) to the character they own in that campaign — so
  the entry is attributed without extra linking. Unmapped/non-member posters are rejected.
- **R-H2.4 — Score tagging.** Logged events auto-tag the campaign's **active score** (reuse the roll
  repo's server-side tagging), so Discord results group under the right operation in the feed.
- **R-H2.5 — (optional) Server-rolled dice.** A `/heist roll` that rolls FitD dice server-side
  (reuse `dice.ts` `rollOutcome`) and logs an `action` event — so the result can't be faked, same as
  in-app. May defer; `/heist log <text>` covers the core need.

### Architecture
- **Interactions endpoint, not a gateway bot.** A serverless **Next.js API route** (e.g.
  `apps/web/src/app/api/discord/route.ts`) that **verifies Discord's Ed25519 request signature**
  (`X-Signature-Ed25519` / `-Timestamp` against the app **public key**) and handles
  `application command` interactions. This fits the Vercel/serverless model — **no always-on
  process** — unlike a gateway bot. `apps/discord-bot` is repurposed to hold the **slash-command
  registration script** + shared types (or deprecated).
- **Writes go through the same repository layer** (`rolls.create`, scoped to the resolved campaign via
  the service role), so the same validation/auto-tagging applies. No new write path.

### Data model (migration when built)
- **`games.discord_channel_id TEXT` (+ `discord_guild_id TEXT`)** — the channel↔campaign link (a
  per-env `DO`-block migration like the others; needs a `pnpm db:types` regen).
- **`profiles.discord_id`** — the **column** already exists (unique, from Discord OAuth), but the
  lookup is not free: `getUserByDiscordId` calls `auth.admin.getUserById`, which requires the
  service-role client that nothing constructs today (prerequisite (1) above).
- Optionally a partial unique index so a channel links to at most one campaign.

### Command surface (v1)
- `/heist link` — GM links the current channel to their campaign (resolves the GM via `discord_id`).
- `/heist log <text>` — record a result → a `note` event (attributed + score-tagged).
- `/heist roll <action> [position] [effect]` — *(optional)* server-rolled action → an `action` event.
- `/heist status` — *(outbound-lite, optional)* reply with the crew/character snapshot.

### Security
- **Ed25519 signature verification** on every request (reject otherwise) — Discord's required check.
- Authorize by mapping `discord_id` → an **active member** of the linked campaign; reject others.
- The endpoint uses the service role **scoped to the resolved campaign/character**; never trusts the
  channel→campaign mapping without the membership check.

### Setup / credentials (operator-provided)
A **Discord application** (Developer Portal — needs the operator's Discord account), providing:
**public key**, **application id**, **bot token** → wired as secrets
(`DISCORD_PUBLIC_KEY`, `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`) via the Greenlight secrets flow; set the
app's **Interactions Endpoint URL** to the deployed route; run the command-registration script.

### Verification
- A **signed** test interaction POST creates the expected campaign-log event; an unsigned/forged one
  is rejected (401).
- `/heist link` then `/heist log` from a member's Discord id lands an attributed, score-tagged entry
  in the in-app feed; a non-member is rejected.

### Out of scope (v1)
Proactive outbound to Discord (state posts, reminders), message-content parsing (needs the privileged
message-content intent + a gateway bot), voice, and a multi-guild management UI.

### Open decisions
1. **Slash-command-only** (recommended, no privileged intents) vs also parsing channel messages.
2. **Roll server-side** (`/heist roll`) in v1, or **log-only** (`/heist log`) and defer rolling.
3. **One channel ↔ one campaign**, or allow several channels per campaign.

---

## Appendix — Phase 5: Portable characters (detailed BRD)

**Status:** specified, **not built**. This is the spec for closing **F56** — making characters
user-owned and campaign-independent. Nothing here is implemented yet.

### Goal & scope
Deliver **Mode 1 ("your sheet anywhere")**: a player builds + owns a character **without a campaign**,
opens it as a standalone sheet, and **brings it to a table** (attaches it to one of their campaigns).
**v1 model = single active campaign (link/move)** (Decision #5): the character row is the source of
truth, owned by `created_by`, bound to a ruleset; `game_id` is a **nullable pointer** — `NULL` =
standalone ("My Characters"), `<id>` = currently linked into that campaign. One crew at a time
(FitD-canonical); loadout + campaign log follow the active campaign. **Opt-in / à la carte** (P1) — a
group that only plays in-campaign is unaffected; existing characters keep working unchanged.

### Why this is mostly column + RLS, not a rebuild
The `characters` table (`supabase/migrations/00002_core_schema.sql:240`) already has its own row
(only `character_data` is JSONB) and **already carries the portability hooks**: `original_ruleset_id
UUID REFERENCES rulesets(id)` (nullable, unused), `adaptations JSONB` (unused), `is_template`
(unused). The repository **already declares** `transferToGame` + `cloneCharacter`
(`packages/database/src/repositories.ts`, currently throwing). `characters.findByPlayer(userId)`
already returns all of a user's characters. Rulesets are first-class + user-owned (own/public readable
without a game). **The blockers** are: `game_id NOT NULL ON DELETE CASCADE`; ruleset resolution via
`character → game → game.ruleset_id` (`supabase-character-repository.ts:111`,
`supabase-character-management-repository.ts:66`); INSERT RLS requiring active game membership;
`CreateCharacterData.gameId` required; the wizard requiring a `gameId` prop; and the only sheet route
being `/games/[gameId]/characters/[characterId]`.

### Requirements
Implements **R-F4..R-F7** (group F — character lifecycle & ownership).

### Data model (migration when built)
A single per-env `DO`-block migration (the established pattern); **needs a `pnpm db:types` regen** —
the adapter won't type-check until the generated types include the changes (the user runs the regen).
- **`ALTER TABLE characters ALTER COLUMN game_id DROP NOT NULL`**, and change the FK to **`ON DELETE
  SET NULL`** (deleting a campaign **returns its characters to standalone** instead of cascading them
  away — important: characters outlive campaigns).
- **Bind the ruleset on the character** using the existing `original_ruleset_id`: **backfill** it from
  each row's `game.ruleset_id`, and set it on every create going forward. (`adaptations` stays
  reserved for cross-ruleset moves — Phase 5b.)
- **Unique names:** keep the per-game `UNIQUE(game_id, created_by, name)`; add a **partial unique
  index** `(created_by, name) WHERE game_id IS NULL` so standalone names are unique per owner.
- **RLS** (the trickiest part — keep ownership and membership intact):
  - **SELECT** already covers the owner (`created_by = auth.uid()` OR active member), so standalone
    rows are readable by their owner with no change.
  - **INSERT** must allow standalone: `created_by = auth.uid() AND (game_id IS NULL OR
    is_active_game_member(auth.uid(), game_id))`.
  - **Attach / detach** (set/clear `game_id`) go through a **`SECURITY DEFINER` RPC**
    (`attach_character_to_game(character_id, game_id)` / `detach_character(character_id)`), modelled on
    `redeem_invite_code` (`00010`). The RPC enforces server-side: caller **owns** the character, is an
    **active member** of the target game, and the game's ruleset **matches** the character's
    `original_ruleset_id`. This avoids overloading UPDATE `WITH CHECK` (which must still let a GM edit
    an in-game character for retire, yet **not** re-home a player's character to another table).

### Repository / service (when built)
- Resolve a character's ruleset via its **`original_ruleset_id`** (fallback to `game.ruleset_id` only
  for legacy rows before backfill); make **`CharacterWithDetails.game` nullable**.
- Make **`CreateCharacterData.gameId` optional** + add **`rulesetId`**; `createCharacterWithValidation`
  resolves the ruleset from `rulesetId` (standalone) or `gameId` (in-campaign). Reuse the existing
  `validateCharacter` — its `crew` context is already optional, so it's simply skipped when standalone.
- Implement the latent **`transferToGame`** (move) + **`cloneCharacter`** (copy) — used by Phase 5b.

### Routes / surface (when built)
- **`/characters`** — My Characters list (standalone + in-campaign); the dashboard "Your characters"
  section links here.
- **`/characters/new`** — a **ruleset picker** over the user's rulesets + the bundled starters, then
  the **existing creation wizard** with `gameId` undefined (the wizard already takes a `ruleset`; pass
  the picked one). The latent ruleset-add path (`/rulesets`) feeds this.
- **`/characters/[characterId]`** — standalone sheet. Reuse `CharacterSheet`; **hide** the
  campaign-scoped sections (active score, shared roll log) when `game_id IS NULL`.
- **Attach:** "Bring to a campaign" on the standalone sheet (pick a same-ruleset campaign → the RPC);
  "Add one of your characters" on the campaign hub (`CharacterRoster`). The existing
  `/games/[gameId]/characters/[characterId]` keeps working for the in-campaign view.

### Security
- Reads stay owner-or-member (unchanged). Standalone insert is owner-only. Attach/detach is **gated by
  the `SECURITY DEFINER` RPC** (ownership + membership + ruleset match), never by trusting a
  client-set `game_id`.

### Backward compatibility
Existing rows keep their `game_id`; the backfilled `original_ruleset_id` makes them behave exactly as
today. No user-visible change until the standalone routes ship. `ON DELETE SET NULL` changes campaign
deletion from "destroy characters" to "return them to standalone" — a strict improvement.

### Verification (when built)
- Create a character with **no campaign** → it appears in My Characters and opens a standalone sheet
  with score/shared-log sections hidden.
- **Attach** it to a same-ruleset campaign → it shows in that roster and the in-campaign sheet; loadout
  + log now follow that campaign.
- A **non-member** or **wrong-ruleset** attach is **rejected** by the RPC.
- An existing in-campaign character is **unaffected**; deleting its campaign returns it to standalone
  (SET NULL), not deletion.

### Phase 5b — ✅ shipped (move / detach / clone, same-ruleset)
**Move** (re-home to another same-ruleset campaign — reuses the attach RPC), **detach** (return to My
Characters — the `detach_character` RPC), and **clone** (`cloneCharacter` — duplicate a build to a new
standalone character; also the clean way to run the same scoundrel at two tables). Owner controls live
on the character sheet (`AttachToCampaign`), "Duplicate" on My Characters. **No migration** — the
`00014` RPCs + RLS already covered it.

### Out of scope → Phase 5c
**Cross-ruleset adaptation** (the `adaptations` column — clone/move into a *different*-ruleset campaign
with re-validation + guided fixes), `transferToGame` as a distinct primitive, and a character **in
multiple campaigns at once** (the rejected many-to-many model). GM-initiated detach (5b is owner-only).

### Open decisions
1. **Standalone name collisions on attach** — auto-suffix vs block (the per-game unique constraint
   still applies once linked).
2. **Detach authority** — owner-only, or may a GM detach a player's character from their campaign?
3. **Standalone-create ruleset access** — do bundled starters auto-grant a readable ruleset for
   standalone create, or must the user "add" one to `/rulesets` first?
