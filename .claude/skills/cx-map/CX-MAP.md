# HeistMind — CX Map

The living map of every page and user flow. Maintained per the `cx-map` skill (`SKILL.md`):
**when a route, screen, flow, or copy changes, update the matching section here and bump its
`_Last verified:_` marker.** Flaws and FitD gaps live in `FINDINGS.md`, not here — this file is
the stable "what it does"; that file is the churn of "what's wrong."

Stack: Next.js 15 App Router (`apps/web`), React 19, Tailwind CSS 4, Radix UI (`packages/ui`),
Supabase (auth + RLS + per-env schema). Product goal: **async, Discord-style play-by-post** Forged
in the Dark — all shared state is DB-backed and loaded on view (no realtime), with an async dice
roller logged to the campaign.

## Roles

- **GM** — the campaign creator (`game.createdBy === user.id`). Owns rulesets, creates campaigns,
  and edits all campaign-level objects: crew sheet, clocks, factions, GM/fortune rolls.
- **Player** — any other authenticated user. Creates + edits their own character, makes action
  rolls, and **reads** the shared campaign objects (crew / clocks / factions / roll log).

Server-side RLS enforces this: `is_active_game_member` gates reads, `is_game_gm` gates GM writes.

---

## Routes

### `/` — Home / landing

- **File:** `apps/web/src/app/page.tsx`
- **Purpose:** public landing; entry point for unauthenticated users.
- **Components:** `AuthHeader` (`apps/web/src/features/auth/components/AuthHeader.tsx`), hero +
  feature cards.
- **Actions:** Sign in / Sign up with Discord (OAuth). Authenticated users navigate on to
  Campaigns / Rulesets.
- **Nav:** → `/auth/callback` (after OAuth) → back here; then `/games`, `/rulesets`.
- **CX intent:** must communicate, above the fold, that this is an async play-by-post FitD tool;
  signed-in users should get a clear next step (not just marketing).

### `/auth/callback` — OAuth return

- **File:** `apps/web/src/app/auth/callback/page.tsx`
- **Purpose:** handles the Discord OAuth redirect; waits for auth state, then redirects.
- **Actions:** none (automatic). Shows a loading state, or an error on failure/timeout.
- **Nav:** → `/` on success; → `/?error=auth_failed` on failure.

### `/games` — Campaign hub (created + joined)

- **File:** `apps/web/src/app/games/page.tsx`
- **Purpose:** lists campaigns the user **created** (GM) _and_ those they've **joined** (Player), in
  one list with a per-card role badge (`findByCreator` + `games.findByPlayer`).
- **Components:** `Card` per game (name, description, state badge, GM/Player role badge); "New
  campaign" button; a **join-via-code** box (`invitations.joinViaCode` → `redeem_invite_code` RPC);
  `InviteCodeSection` (`features/games/components/`) — GM-only join-code generator.
- **Actions:** open a campaign; create a new one; **join a campaign by code**; (GM) **generate an
  invite/join code**.
- **Nav:** → `/games/new`, → `/games/[gameId]`.
- **Role:** auth-gated. Targeted + public codes; ownership/role gating via RLS + `gamePlayers`.

### `/games/new` — Create campaign

- **File:** `apps/web/src/app/games/new/page.tsx`
- **Components:** `GameForm` (`apps/web/src/features/games/components/GameForm.tsx`).
- **Actions:** name (required, **unique per creator**), description, ruleset select; Create. Accepts
  `?ruleset=<id>` to preselect.
- **Nav:** → `/games/[gameId]` on success.
- **CX intent:** a duplicate name surfaces a plain-language message ("You already have a campaign
  named …"), not the raw `23505` constraint (handled in `GameForm`).

### `/games/[gameId]` — Campaign hub

- **File:** `apps/web/src/app/games/[gameId]/page.tsx`
- **Purpose:** the campaign's home — characters + all shared campaign objects.
- **Components:**
  - Characters list (cards → character sheet) + "Create character".
  - `CrewSheet` (`apps/web/src/features/crews/components/CrewSheet.tsx`) — crew type, tier, rep,
    heat, wanted, hold, crew abilities, claims, cohorts, coin/vault. GM-editable. Also renders any
    **resource-pool tracks** the ruleset defines (`crew.resourcePools`, e.g. Wicked Ones' hoard +
    threat); the section is hidden for rulesets without pools (BitD/Brackwater unchanged).
  - `ClocksPanel` (`apps/web/src/features/clocks/components/ClocksPanel.tsx`) — standalone progress
    clocks (filters out faction-linked clocks); create / tick / untick / delete. GM-editable.
  - `FactionsPanel` (`apps/web/src/features/factions/components/FactionsPanel.tsx`) — factions with
    status (−3..+3) and their project clocks. GM-editable.
  - `RollPanel` + `RollLog` (`apps/web/src/features/rolls/components/`) — action / fortune / GM **and
    resistance** rolls. Resistance mode picks the resisted attribute, rolls, and deducts `6 − highest
    die` stress from the character. The `RollLog` is the reverse-chron, DB-backed feed (the async-play
    centerpiece; every player sees it on load), now showing **who** (character name; "Fortune"/"GM")
    and **when** (relative time + timestamp tooltip), annotating resistance ("resisted — N stress")
    and downtime (neutral badge, no dice).
- **Role:** GM edits campaign objects; players read them.
- **CX intent:** read-only state should be visibly read-only for players; the hub should be
  scannable, not an undifferentiated wall of panels.

### `/games/[gameId]/characters/new` — Character creation wizard

- **File:** `apps/web/src/app/games/[gameId]/characters/new/page.tsx`
- **Components:** `CharacterCreationWizard`
  (`apps/web/src/features/characters/components/CharacterCreationWizard.tsx`) → `WizardStep`
  dispatcher → step components (see **Wizard** below). Layouts: `?layout=single` (default) or
  `?layout=rail` (step rail + live summary).
- **Actions:** name; step through Back/Next or step badges; Create on the final step.
- **State:** `useCharacterCreationStore`
  (`apps/web/src/features/characters/stores/character-creation-store.ts`) persists draft to
  localStorage (auto-resume); the large `ruleset` object is re-supplied on mount, not persisted.
- **Nav:** → `/games/[gameId]` on create or cancel.

### `/games/[gameId]/characters/[characterId]` — Character sheet

- **File:** `apps/web/src/app/games/[gameId]/characters/[characterId]/page.tsx`
- **Components:** `CharacterSheet` (`apps/web/src/features/characters/components/CharacterSheet.tsx`)
  — name (editable), attributes/action ratings, **quick** stress/harm/XP edits on the sheet itself,
  gear/loadout, special abilities (expandable rules), identity, contacts, coin/load; plus a
  character-scoped `RollPanel` + `RollLog`. `CharacterEditor`
  (`apps/web/src/features/characters/components/CharacterEditor.tsx`) for deeper build edits.
- **Actions:** edit name; ± stress / mark harm / mark XP; spend advances; roll an action **or
  resist** (stress applies live to the `StressTracker`); **Indulge vice** (downtime) to clear stress
  to 0, logged to the feed; edit build.
- **CX intent:** the common in-play taps (stress, harm, XP, roll, resist, indulge vice) are one-tap on
  the sheet, not buried behind "Edit build"; edits persist across reload. Indulge vice is the
  stress-release half of the FitD pressure loop (MVP downtime).

### `/rulesets` — Ruleset list + built-in catalog

- **File:** `apps/web/src/app/rulesets/page.tsx`
- **Components:** a **"Starter rulesets" catalog** card mapping over `BUILTIN_RULESETS`
  (`packages/shared/src/builtin-rulesets/`), each with a tier + license badge, a blurb, an
  attribution notice where required, and a `LoadBuiltinRulesetButton`
  (`apps/web/src/features/rulesets/components/LoadBuiltinRulesetButton.tsx`); then a `Card` per
  owned ruleset (name, version, "Create game").
- **Built-ins shipped:** **Brackwater** (original starter), **Blades in the Dark** (CC BY 3.0, with
  attribution), **Wicked Ones** (CC0). All are action-rating FitD rulesets; Wicked Ones models the
  dungeon as the crew type and uses crew **resource pools** (hoard + threat).
- **Actions:** add any built-in (creates an editable copy, or **refreshes** an existing copy to the
  latest bundled content — see `ruleset-content-is-a-snapshot` memory); create a game from a ruleset;
  upload your own. Button copy is **"Add &lt;name&gt; to my rulesets"** with a clarifying tooltip
  (was the ambiguous "Load … starter" — F36).
- **Nav:** → `/rulesets/new`, → `/games/new?ruleset=<id>`.
- `LoadDefaultRulesetButton` remains as a thin back-compat wrapper over `LoadBuiltinRulesetButton`.

### `/rulesets/new` — Upload ruleset

- **File:** `apps/web/src/app/rulesets/new/page.tsx`
- **Components:** `RulesetUpload` (`apps/web/src/features/rulesets/components/RulesetUpload.tsx`).
- **Actions:** upload a `.json` file or paste JSON; validate + save. Validation errors list inline.
  A **guidance card** (F35) outlines the required/optional JSON shape and points to the starter
  catalog as the no-JSON path.
- **Nav:** → `/rulesets` on success.

_Last verified:_ 2026-06-27 @ 4b7343e

---

## Character creation wizard

Ruleset-driven: steps come from `ruleset.content.characterCreation.steps` (sorted by `order`), else
`DEFAULT_STEPS`; a `review` step is always appended. Derivation: `deriveSteps`
(`apps/web/src/features/characters/lib/creation-steps.ts`). Each step is dispatched by `WizardStep`.

1. **Playbook** — `steps/PlaybookStep.tsx`. Card grid of playbooks; selecting one seeds skills,
   starting abilities, and attributes (or derives them in action-rating mode). _Valid when a
   playbook is chosen._
2. **Attributes** _(point-buy rulesets)_ — `steps/AttributesStep.tsx` — allocate dots per attribute
   within a budget. **or** **Action ratings** _(action-rating rulesets, e.g. Brackwater)_ —
   `steps/ActionRatingsStep.tsx` — allocate dots per action; the attribute rating is **derived**
   (count of actions ≥1) and shown live; per-action + total-dot caps enforced. _Valid when the
   allocation respects caps/budget._
3. **Special abilities** — `steps/AbilitiesStep.tsx`. Multi-select cards; leads with the chosen
   playbook's roster, hides other playbooks' behind a "show more" toggle; abilities can be locked
   (prerequisite / not-at-creation / limit reached); shows name + tier + rules text. _Valid at or
   under the choice limit (limit can be 0)._
4. **Identity** — `steps/IdentityStep.tsx`. Either a card picker (if the step defines options for
   heritage/background/vice) or free-text inputs. _Always valid (optional)._
5. **Review** — `steps/ReviewStep.tsx`. Read-only summary via `use-character-summary.ts`. _Valid
   only if name is non-empty, a playbook is chosen, and `validateCharacter(mode:'creation')`
   passes._ "Create character" submits via
   `getRepositories().characterManagement.createCharacterWithValidation`.

_Last verified:_ 2026-06-25 @ 01594f7

---

## End-to-end journeys

Use these as the user-validation scripts (walk each step, apply the Lens-1 questions from `SKILL.md`).

### J1 — GM: set up a game from scratch

1. Sign in (`/`). 2. `/rulesets` → **add a starter ruleset** from the catalog (Brackwater, Blades in
   the Dark, or Wicked Ones), or upload your own via `/rulesets/new`.
2. **Create game** from the ruleset card → `/games/new`. 4. Name + description + ruleset → Create.
3. On `/games/[gameId]`: set up the crew (`CrewSheet`), create clocks (`ClocksPanel`), seed factions
   (`FactionsPanel`). 6. **Invite players** — on `/games`, generate a join code (`InviteCodeSection`)
   and share it.

### J2 — Player: join a campaign, create a character

1. Sign in. 2. On `/games`, **paste the join code** into the join box (`invitations.joinViaCode`) →
   the campaign appears in your list with a Player badge. 3. Open it (`/games/[gameId]`). 4. **Create
   character** → wizard (playbook → ratings → abilities → identity → review → Create). 5. Land back on
   the hub; open the character sheet to play.

### J3 — GM + players: run a score (dice + resist + clocks)

1. On the hub, create/seed clocks for obstacles. 2. Players roll actions from their sheets
   (`RollPanel`: action → rating → roll → logged). 3. When a consequence lands, the player **resists**
   (`RollPanel` resistance mode → `6 − highest die` stress applied live). 4. GM makes fortune/GM rolls
   from the hub `RollPanel`. 5. All rolls land in `RollLog` with who + when (every player sees on
   reload). 6. GM ticks clocks; adjusts crew heat/rep. 7. Between scores, players **indulge vice**
   (downtime) to clear stress. 8. End of score: award XP on character sheets.

### J4 — Player: level up

1. On the character sheet, mark XP (tracks fill). 2. When the playbook track fills, spend an advance
   (action dot or ability). 3. Sheet updates; track resets.

_Last verified:_ 2026-06-27 @ 4b7343e
