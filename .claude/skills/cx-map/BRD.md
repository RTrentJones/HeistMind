# HeistMind — Business Requirements Document (BRD)

The scope-of-record for HeistMind. Sibling of `STATUS.md` (what's built), `CX-MAP.md` (every
page/flow), and `FINDINGS.md` (the prioritized backlog). When scope changes, edit here first, then
reconcile the others.

_Last reviewed: 2026-06-27 (re-scope sign-off)._

## Product statement

HeistMind is **not** a Blades-in-the-Dark play engine. Actual play happens wherever the group plays —
**in person, on Discord (via an Avrae-style bot), or in-app** — and HeistMind's job is to be the
**persistent between-session record**:

> _As events are settled — IRL, on Discord, or here — players track their crew, characters, XP, and
> per-score gear here, so the campaign's state persists between sessions._

Existing dice/clocks/factions features are **kept and reframed as logging**: a result can be rolled
in-app **or** entered after being settled elsewhere. The tracker, not the table, is the product.

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
| R-B3 | Coin + stash | 🟡 | `stash` field has no UI (ties to R-F2) |
| R-B4 | No per-score in build | 🟡 | **loadout is in the persistent build** — wrong (R-D2) |
| R-C1 | Character XP | ✅ | `character-rules.ts` |
| R-C2 | Crew XP | ✅ | F18 |
| R-C3 | XP changes logged | 🟡 | `advancementHistory` only, not a unified log |
| **R-D1** | **Score lifecycle** | ❌ | **no score entity anywhere** |
| **R-D2** | **Per-score loadout** | ❌ | persistent on `CharacterData.loadout` |
| **R-D3** | **Reset between scores** | ❌ | no score to reset against |
| **R-D4** | **Loadout changes logged** | ❌ | — |
| R-D5 | Score history | ❌ | no scores |
| **R-E1/E2** | **Unified campaign log** | 🟡 | `rolls` is a roll-log only |
| R-E3 | Record results from elsewhere | 🟡 | no after-the-fact entry path |
| **R-F1** | **Player roster/attribution** | 🟡 | `userId` exists; no roster view |
| **R-F2** | **Retire character** | ❌ | enum has `retired`; no action |
| R-F3 | Status visibility | 🟡 | not surfaced |
| R-G1 | Clocks | ✅ | `ClocksPanel.tsx` |
| R-G2 | Factions | ✅ | `FactionsPanel.tsx` |
| R-H1 | In-app dice (optional) | ✅ | keep, reframed |
| **R-H2** | **Discord bot** | ❌ | `apps/discord-bot` is a stub |
| R-I1/I2/I3 | Platform | ✅ | auth, invites, rulesets |

### Headline gaps
1. **No "score" concept** (R-D1) — the foundation; everything per-score hangs off it.
2. **Loadout is in the wrong place** (R-D2/B4) — must become per-character-per-score.
3. **The log is only a roll log** (R-E) — broaden to a unified campaign event log that accepts results settled elsewhere.
4. **No character lifecycle** — retire (R-F2) + player roster/attribution (R-F1).
5. **No Discord integration** (R-H2) — the bot app is a stub.

### Already aligned (no work)
Crew + character + XP tracking, clocks, factions, auth/multiplayer/rulesets, and the in-app dice
(now optional) satisfy the re-scope as-is.

---

## Roadmap (phased; each ships via deploy → verify → promote)

> Phases 1–2 add DB tables/columns → a migration (single-`DO`-block per-env pattern) **plus a
> `supabase-types` regen** (`pnpm db:types`, needs DB access) before the adapter can type-check.

- **Phase 1 — Score model + per-score loadout** (R-D1..D4, B4). `scores` table + per-score loadout
  storage; "Start/End score" on the campaign page; the sheet's gear becomes the **active score's
  loadout** (reset on new score); move loadout **out of the build editor**. Reuse `loadUsed`/
  `effectiveLoadLimit`.
- **Phase 2 — Unified campaign log** (R-C3, R-D4, R-E). Generalize `rolls` → an `events` log; a
  campaign feed grouped by score; an **"add result"** entry path for outcomes settled elsewhere.
- **Phase 3 — Character lifecycle & attribution** (R-F1..F3, B3). **Retire** action; a **roster**
  (player → character(s) + status); surface stash. Mostly uses existing `userId`/`game_players`.
- **Phase 4 — Discord integration** (R-H2). Implement `apps/discord-bot` (or a webhook/RPC) that
  links a channel ↔ campaign and writes settled results into the campaign log. Inbound-first.

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

### FINDINGS re-scoped by this BRD
- **F13** (loadout at creation) → **inverted**: loadout leaves the build entirely and becomes
  per-score (R-D2).
- **F9 / F15 / F16** (push-bargain / downtime / flashbacks) → reclassified from "missing mechanics"
  to **optional result sources** — not required; logged if used.
