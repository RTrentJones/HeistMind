# HeistMind — CX Map

The living map of every page and user flow. Maintained per the `cx-map` skill (`SKILL.md`):
**when a route, screen, flow, or copy changes, update the matching section here and bump its
`_Last verified:_` marker.** Flaws and FitD gaps live in `FINDINGS.md`, not here — this file is
the stable "what it does"; that file is the churn of "what's wrong."

Stack: Next.js 15 App Router (`apps/web`), React 19, Tailwind CSS 4, Radix UI (`packages/ui`),
Supabase (auth + RLS + per-env schema). Product goal (see `BRD.md`): a **rules-driven FitD character
+ crew manager** that doubles as the **mechanical layer for async, play-by-post games on Discord** —
all shared state is DB-backed and loaded on view (no realtime), with a dice roller and a score-grouped
campaign log. Narrative lives in Discord prose; mechanics live here. *("Avrae for Forged in the Dark.")*

## Roles

- **GM** — the campaign creator (`game.createdBy === user.id`). Owns rulesets, creates campaigns,
  and edits all campaign-level objects: crew sheet, clocks, factions, GM/fortune rolls.
- **Player** — any other authenticated user. Creates + edits their own character, makes action
  rolls, and **reads** the shared campaign objects (crew / clocks / factions / roll log).

Server-side RLS enforces this: `is_active_game_member` gates reads, `is_game_gm` gates GM writes.

---

## App shell

Every authenticated route is wrapped by `AppShell` (`apps/web/src/shared/components/AppShell.tsx`,
mounted in the root layout inside `Providers`): a persistent `AuthHeader` (brand, Campaigns/Rulesets
nav, `LanguageSwitcher`, `ThemeToggle`, welcome + sign-out), path-derived `Breadcrumbs` wayfinding, a
focus-revealed **skip-to-main** link, and the `<main id="main-content">` landmark. The header wraps
(`flex-wrap`) instead of overflowing on mobile. The shell steps aside on `/` (marketing hero owns its
header) and `/auth/*` (transient callback), which render their own full-screen layouts.

---

## Routes

### `/` — Home (marketing when logged out, dashboard when signed in)

- **File:** `apps/web/src/app/page.tsx` — a **server component** (exports the per-route `metadata` —
  the real `<title>`/description for the one public URL) that renders
  `<HomeSwitch marketing={<HomePage/>}/>`; `HomeSwitch`
  (`features/marketing/components/HomeSwitch.tsx`, client) does the auth branch:
  `isAuthenticated ? <Dashboard/> : marketing`. Signed-out is the prerender state, so the marketing
  page arrives as server-rendered HTML. `AppShell` steps aside on `/`, so each side renders its own
  `AuthHeader` + `<main>`.
- **Logged out — `HomePage`** (`apps/web/src/features/marketing/components/HomePage.tsx`): the reframed
  two-mode landing. Hero *"The mechanical home for your Forged-in-the-Dark crew,"* a **dual CTA**
  (*Run a campaign* / *Join with a code* — both kick off Discord OAuth), **two "how you'll use it"
  tracks** (*At your table* (Mode 1) and *Play-by-post on Discord* (Mode 2, tagged *"Like Avrae for
  D&D — but built for Forged in the Dark"*)), and **three pillars** (rules-driven · track from
  anywhere · take what you want). Copy lives in `pages.landing.*`.
- **Signed in — `Dashboard`** (`apps/web/src/features/dashboard/components/Dashboard.tsx` +
  `features/dashboard/hooks/use-dashboard-data.ts`): the personal home (the OAuth callback redirects
  to `/`). Header *"Welcome back, {name}"*; **quick actions** (create campaign · join a game ·
  rulesets · upload ruleset); **Your campaigns** (`games.findByCreator` + `findByPlayer`, role badge +
  state); **Your characters** (`characters.findByPlayer` — the "My Characters" surface, name · playbook
  · campaign · status, → sheet); **Recent activity** (a merged, newest-first feed over
  `rolls.findByGame` across the user's campaigns). All over existing repos — no schema change. Copy in
  `pages.dashboard.*`. Quick actions + the **"My characters"** link go to the standalone
  `/characters` routes (Phase 5 — portable characters; see below).
- **Actions:** (logged out) Sign in / Sign up with Discord; (signed in) jump to any campaign, character
  sheet, or a quick action.
- **Nav:** → `/auth/callback` (after OAuth) → back to `/` (now the dashboard); → `/games`,
  `/games/new`, `/rulesets`, `/rulesets/new`, `/games/[gameId]`, character sheets.
- **CX intent:** logged out, communicate the two ways to use HeistMind above the fold (not "play the
  whole game here"); signed in, open to *your* campaigns + characters, not marketing.

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
  - `CharacterRoster` (`apps/web/src/features/characters/components/CharacterRoster.tsx`) — the
    campaign roster: each character attributed to its **player** (resolves `createdBy` → profile name),
    a **status** badge (active/inactive/retired/dead), a link to the sheet, and a two-click **Retire**
    action for the owner or GM. Active characters lead; retired/dead drop to a de-emphasised "Retired &
    fallen" section (kept for history, not deleted). Retiring banks carried coin into stash and logs a
    `note` event. Plus a "Create character" button.
  - `CrewSheet` (`apps/web/src/features/crews/components/CrewSheet.tsx`) — crew type, tier, rep,
    heat, wanted, hold, crew abilities, claims, cohorts, coin/vault. GM-editable. Also renders any
    **resource-pool tracks** the ruleset defines (`crew.resourcePools`, e.g. Wicked Ones' hoard +
    threat); the section is hidden for rulesets without pools (BitD/Brackwater unchanged).
  - `ClocksPanel` (`apps/web/src/features/clocks/components/ClocksPanel.tsx`) — standalone progress
    clocks (filters out faction-linked clocks); create / tick / untick / delete. GM-editable.
  - `FactionsPanel` (`apps/web/src/features/factions/components/FactionsPanel.tsx`) — factions with
    status (−3..+3) and their project clocks. GM-editable.
  - `ScorePanel` (`apps/web/src/features/scores/components/ScorePanel.tsx`) — the **score / operation
    lifecycle**. A campaign runs as a series of scores (the per-operation unit per-score loadout hangs
    off); the GM **starts** one (at most one active at a time) and **ends** it, with the most recent
    completed scores listed. Start/end are logged to the campaign feed as `score` events. Sessions are
    real-life and not modelled. Players see the active score read-only.
  - `RollPanel` + `AddResultForm` + `RollLog` (`apps/web/src/features/rolls/components/`). `RollPanel`:
    action / fortune / GM **and resistance** rolls — resistance mode picks the resisted attribute,
    rolls, and deducts `6 − highest die` stress from the character. **`AddResultForm`**: record a
    result that was **settled elsewhere — in person or on Discord** (writes a `note` event,
    auto-tagged with the active score), so the between-session log is complete wherever play happened.
    The `RollLog` is the reverse-chron, DB-backed **campaign log** (the async-play centerpiece; every
    player sees it on load): shows **who** (character name; "Fortune"/"GM") and **when** (relative time
    + timestamp tooltip), annotates resistance ("resisted — N stress"), and renders non-dice events
    (downtime / loadout / score / note) with a neutral kind badge. Entries are **grouped by score**
    (newest operation first, under its name); with no scores in play it falls back to a flat feed.
- **Role:** GM edits campaign objects; players read them.
- **CX intent:** read-only state should be visibly read-only for players; the hub should be
  scannable, not an undifferentiated wall of panels.

### `/games/[gameId]/characters/new` — Character creation wizard

- **File:** `apps/web/src/app/games/[gameId]/characters/new/page.tsx`
- **Components:** `CharacterCreationWizard`
  (`apps/web/src/features/characters/components/CharacterCreationWizard.tsx`) → `WizardStep`
  dispatcher → step components (see **Wizard** below). Layouts: `?layout=single` (default) or
  `?layout=rail` (step rail + live summary).
- **Actions:** name; step through Back/Next or step badges; Create on the final step. A disabled
  Next/Create now shows the blocking reason in the footer (`stepError` → e.g. "Can't continue yet —
  Assigned 8 of 7 action dots.").
- **State:** `useCharacterCreationStore`
  (`apps/web/src/features/characters/stores/character-creation-store.ts`) persists draft to
  localStorage (auto-resume); the large `ruleset` object is re-supplied on mount, not persisted.
- **Nav:** → `/games/[gameId]` on create or cancel.

### `/games/[gameId]/characters/[characterId]` — Character sheet

- **File:** `apps/web/src/app/games/[gameId]/characters/[characterId]/page.tsx`
- **Components:** `CharacterSheet` (`apps/web/src/features/characters/components/CharacterSheet.tsx`)
  — name (editable), attributes/action ratings, **quick** stress/harm/XP edits on the sheet itself,
  special abilities (expandable rules), identity, contacts, coin/load; plus a
  character-scoped `RollPanel` + `RollLog`. **`LoadoutCard`**
  (`apps/web/src/features/characters/components/LoadoutCard.tsx`) — the character's **current-score
  loadout**, chosen *per operation as you go* (BitD: load is not a build/advancement choice, so it
  **left the build editor**). Pick a load level, equip items up to the limit, then **Save** (one
  campaign-log entry per save). When a new score has started the loadout is flagged stale and can be
  **reset** for it; with no active score it's a resettable "current" loadout. Loadout changes/clears
  are logged to the campaign feed. `CharacterEditor`
  (`apps/web/src/features/characters/components/CharacterEditor.tsx`) for deeper build edits and
  XP-spend advancement. The editor loads the campaign **crew** so level-ups validate in context: an
  action-dot advance caps at the crew's effective max (Mastery → the 4th dot), and the load gauge +
  live re-validation fold in crew effects (Mule/Deadly) — mirroring the server's `advanceCharacter`.
- **Actions:** edit name; ± stress / mark harm / mark XP; spend advances; **set the per-score loadout**
  (level + items, Save); roll an action **or resist** (stress applies live to the `StressTracker`);
  **Indulge vice** (downtime) to clear stress to 0, logged to the feed; edit build.
- **Role-gating (F42, 2026-07-01):** write affordances mirror the RLS policy — the **owner or the
  campaign's GM** sees the edit controls (rename, edit build, stress tracker, indulge vice, XP
  marking, loadout save); any other member gets a **read-only sheet** (values + trackers visible,
  no dead buttons). Internally the sheet/editor are now thin compositions over shared concept cards
  (`cards/XpTracksCard|GearCard|HarmCard` — one implementation each for view + edit — plus
  `useCharacterAdvancement`); `CrewSheet` got the same card split (`crews/components/cards/`).
- **CX intent:** the common in-play taps (stress, harm, XP, roll, resist, indulge vice) are one-tap on
  the sheet, not buried behind "Edit build"; edits persist across reload. Indulge vice is the
  stress-release half of the FitD pressure loop (MVP downtime).
- **Standalone variant (Phase 5).** The same `CharacterSheet` also renders at **`/characters/[id]`**
  for a character with no campaign: the score/shared-dice-log sections hide, and an **`AttachToCampaign`**
  card ("Bring to a campaign") offers to link it into a same-ruleset campaign. See the `/characters`
  routes below.

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

### `/characters` — My Characters (Phase 5 — portable characters)

- **File:** `apps/web/src/app/characters/page.tsx`
- **Purpose:** the campaign-independent home for every character the user owns — standalone **and**
  in-campaign (`characters.findByPlayer`). A standalone one carries a "Standalone" badge.
- **Actions:** "New character" → `/characters/new`; open a character (standalone → `/characters/[id]`,
  in-campaign → its game route); **Duplicate** (Phase 5b — `cloneCharacter` → a new standalone copy).
- **Nav:** → `/characters/new`, `/characters/[id]`, `/games/[gameId]/characters/[id]`.

### `/characters/new` — Build a standalone character

- **File:** `apps/web/src/app/characters/new/page.tsx`
- **Purpose:** pick one of your rulesets (`rulesets.findByCreator`), then the **same
  `CharacterCreationWizard`** runs with **no `gameId`**; on create it lands on the standalone sheet.
  Empty state points to `/rulesets` to add a starter first.
- **Nav:** → `/characters/[id]` on create.

### `/characters/[characterId]` — Standalone character sheet

- **File:** `apps/web/src/app/characters/[characterId]/page.tsx` — reuses `CharacterSheet`. With no
  campaign, the active-score + shared dice/roll-log sections hide. The **`AttachToCampaign`** card is
  the **owner's campaign-membership control** (shown on both standalone *and* in-campaign sheets):
  standalone → **"Bring to a campaign"**; in-campaign (Phase 5b) → **"Move to another campaign"**
  (excludes the current one) + **"Return to My Characters"** (detach). Attach/move use
  `attach_character_to_game`, detach uses `detach_character`; both are owner-only, RPC-enforced.

### Error & 404 surfaces (every route)

- **Files:** `apps/web/src/app/{error,global-error,not-found}.tsx`.
- **Route errors** (`error.tsx`): a render/data throw below the root layout lands on an i18n'd,
  DS-styled card (*"errors.boundary.title"* + fallback copy) with a **Try again** button (Next
  re-renders the segment); the error is reported through the telemetry seam. `global-error.tsx` is
  the provider-free last resort for root-layout throws (own `<html>/<body>`, inline-styled, same
  copy via the bare i18n instance).
- **404** (`not-found.tsx`): *"Lost in the shadows"* + **Back to the lair** → `/`
  (`errors.notFoundTitle` / `errors.backHome`).

_Last verified:_ 2026-07-02 (server-rendered landing via HomeSwitch + per-route `/` metadata + error/404 surfaces, round-2 PR-9; previously 2026-07-01 F42 role-gated sheet affordances)

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
3. **Special abilities** — `steps/AbilitiesStep.tsx`. Cards leading with the chosen playbook's
   roster, hiding other playbooks' behind a "show more" toggle; abilities can be locked (prerequisite
   / not-at-creation / limit reached); shows name + tier + rules text. When the choice **limit is 1**
   (BitD canon — the playbook seeds the suggested pick) the picker is **radio-style**: clicking a
   different unlocked ability _swaps_ to it, the current pick can't be unclicked to zero, and other
   roster abilities stay selectable. With limit > 1 it's a multi-select that disables the rest once
   full. _Valid at or under the choice limit (limit can be 0)._
4. **Identity** — `steps/IdentityStep.tsx`. Either a card picker (if the step defines options for
   heritage/background/vice) or free-text inputs. _Always valid (optional)._
5. **Review** — `steps/ReviewStep.tsx`. Read-only summary via `use-character-summary.ts`. _Valid
   only if name is non-empty, a playbook is chosen, and `validateCharacter(mode:'creation')`
   passes._ "Create character" submits via
   `getRepositories().characterManagement.createCharacterWithValidation`.

_Last verified:_ 2026-06-27 @ 2535b31

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

### J3 — GM + players: run a score (start → dice + resist + clocks → end)

1. GM **starts a score** (`ScorePanel`) and seeds clocks for obstacles. 2. Players **set their
   per-score loadout** on their sheets (`LoadoutCard`: level + items → Save). 3. Players roll actions
   from their sheets (`RollPanel`: action → rating → roll → logged, auto-tagged with the active score).
   4. When a consequence lands, the player **resists** (`RollPanel` resistance mode → `6 − highest die`
   stress applied live). 5. GM makes fortune/GM rolls from the hub `RollPanel`. 6. Anything settled **in
   person or on Discord** gets recorded via `AddResultForm` so the log stays complete. 7. All events
   land in `RollLog`, grouped under the score, with who + when (every player sees on reload). 8. GM
   ticks clocks; adjusts crew heat/rep. 9. Players **indulge vice** (downtime) to clear stress. 10. GM
   **ends the score** (`ScorePanel`); award XP on character sheets.

### J4 — Player: level up

1. On the character sheet, mark XP (tracks fill). 2. When the playbook track fills, spend an advance
   (action dot or ability). 3. Sheet updates; track resets.

_Last verified:_ 2026-06-28 @ 78123c1 (J3 updated for score start/end, per-score loadout, off-app result recording)
