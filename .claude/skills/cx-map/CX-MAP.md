# HeistMind — CX Map

The living map of every page and user flow. Maintained per the `cx-map` skill (`SKILL.md`):
**when a route, screen, flow, or copy changes, update the matching section here and bump its
`_Last verified:_` marker.** Flaws and FitD gaps live in `FINDINGS.md`, not here — this file is
the stable "what it does"; that file is the churn of "what's wrong."

Stack: Next.js 15 App Router (`apps/web`), React 19, Tailwind CSS 4, Radix UI (`packages/ui`),
Supabase (auth + RLS + per-env schema). Product goal (see `BRD.md`): a \*\*rules-driven FitD character

- crew manager** that doubles as the **mechanical layer for async, play-by-post games on Discord\*_ —
  all shared state is DB-backed and loaded on view (no realtime), with a dice roller and a score-grouped
  campaign log. Narrative lives in Discord prose; mechanics live here. _("Avrae for Forged in the Dark.")\*

## Roles

- **GM** — the campaign creator (`game.createdBy === user.id`). Owns rulesets, creates campaigns,
  and edits all campaign-level objects: crew sheet, clocks, factions, GM/fortune rolls.
- **Player** — any other authenticated user. Creates + edits their own character, makes action
  rolls, and **reads** the shared campaign objects (crew / clocks / factions / roll log).

Server-side RLS enforces this: `is_active_game_member` gates reads, `is_game_gm` gates GM writes.

---

## App shell

Every authenticated route is wrapped by `AppShell` (`apps/web/src/shared/components/AppShell.tsx`,
mounted in the root layout inside `Providers`): a persistent `AuthHeader` (brand,
Campaigns/Characters/Rulesets/Settings nav — the Characters link is the Mode-1 "My characters"
home, F81 — `LanguageSwitcher`, `ThemeToggle`, welcome + sign-out), path-derived `Breadcrumbs` wayfinding, a
focus-revealed **skip-to-main** link, the `<main id="main-content">` landmark, and the site-wide
**`Footer`** (`shared/components/Footer.tsx` — Terms/Privacy/DMCA/Acceptable-use/Licenses links +
"© {year} HeistMind, operated by Trent Jones"). The header wraps (`flex-wrap`) instead of
overflowing on mobile; the signed-out header also carries the **clickwrap** line
(`ClickwrapNotice`, `sm:`+ only — page-level notices cover phones). The shell steps aside on `/`
(marketing hero owns its header) and `/auth/*` (transient callback), which render their own
full-screen layouts — so `HomePage` and `Dashboard` mount the same `Footer` themselves.

**Signed-out gate (F39/F72, complete as of 2026-07-11):** every auth-required route — primary
(`/games`, `/rulesets`, `/characters`, `/settings`, `/games/[id]`) **and** secondary (`/games/new`,
`/games/[id]/characters/new`, `/games/[id]/characters/[id]`, `/characters/new`,
`/characters/[id]`, `/rulesets/new`) — renders `SignInGate` (heading + prompt + a working Discord
sign-in button + clickwrap) instead of a dead-end text prompt. Pinned by
`e2e/specs/signin-gates.spec.ts`.

---

## Routes

### `/` — Home (marketing when logged out, dashboard when signed in)

- **Coming-soon gate (prod holding page) — PRODUCTION deployment only, `main` only:** `COMING_SOON`
  (`apps/web/src/lib/coming-soon.ts`) keys on `VERCEL_ENV === 'production'` and lives **only on
  `main`**, never on `development` — so beta, Vercel previews, and local are always un-gated (their
  e2e suites run the real app), and only the prod deployment is gated. No env var to set. When
  gated: `page.tsx` renders `<ComingSoon/>` at `/`, `middleware.ts` redirects every route except
  `/` and `/legal/*` back to `/`, and `AuthHeader` omits its signed-out sign-in buttons — so there
  is no login anywhere on prod. Discord/API routes are excluded from the matcher and keep working;
  legal pages stay live (registered DMCA agent page). `NEXT_PUBLIC_VERCEL_ENV` is mapped from
  `VERCEL_ENV` in `next.config.ts` so the client bundle agrees with the server/edge. The public
  specs (home, auth-discord, auth-callback) are gate-tolerant via `e2e/support/coming-soon.ts` so
  the prod post-deploy verify stays green. To bring prod online for real: revert this on `main`
  (or reconcile `main` with `development`). _`main`-only; `development` has no gate._
- **File:** `apps/web/src/app/page.tsx` — a **server component** (exports the per-route `metadata` —
  the real `<title>`/description for the one public URL) that renders
  `<HomeSwitch marketing={<HomePage/>}/>`; `HomeSwitch`
  (`features/marketing/components/HomeSwitch.tsx`, client) does the auth branch:
  `isAuthenticated ? <Dashboard/> : marketing`. Signed-out is the prerender state, so the marketing
  page arrives as server-rendered HTML. `AppShell` steps aside on `/`, so each side renders its own
  `AuthHeader` + `<main>`.
- **Logged out — `HomePage`** (`apps/web/src/features/marketing/components/HomePage.tsx`): the reframed
  two-mode landing. Hero _"The mechanical home for your Forged-in-the-Dark crew,"_ a **dual CTA**
  (_Run a campaign_ / _Join with a code_ — both kick off Discord OAuth), **two "how you'll use it"
  tracks** (_At your table_ (Mode 1) and _Play-by-post on Discord_ (Mode 2 — the body now names the
  LIVE bot: sheet-rated rolls, stress/harm/XP, clocks, GM controls as slash commands; tagged _"Like
  Avrae for D&D — but built for Forged in the Dark"_)), and **three pillars** (rules-driven · track
  from anywhere · take what you want). Copy lives in `pages.landing.*`.
- **Signed in — `Dashboard`** (`apps/web/src/features/dashboard/components/Dashboard.tsx` +
  `features/dashboard/hooks/use-dashboard-data.ts`): the personal home (the OAuth callback redirects
  to `/`). Header _"Welcome back, {name}"_; **quick actions** (create campaign · join a game ·
  rulesets · upload ruleset); **Your campaigns** (`games.findByCreator` + `findByPlayer`, role badge +
  state); **Your characters** (`characters.findByPlayer` — the "My Characters" surface, name · playbook
  · campaign · status, → sheet); **Recent activity** (a merged, newest-first feed over
  `rolls.findByGame` across the user's campaigns). All over existing repos — no schema change.
  All three sections show a `LoadingSpinner` while loading (F79 — Characters + Recent activity
  used to collapse to nothing until the fetch resolved). Copy in `pages.dashboard.*`. Quick actions + the **"My characters"** link go to the standalone
  `/characters` routes (Phase 5 — portable characters; see below). A **brand-new user** (no
  campaigns AND no characters) gets a guided **"Start here" 1-2-3** card (build a character ·
  create a campaign · join a game — each step a real link) instead of disconnected empty cards
  (F37, `pages.dashboard.startHere.*`).
- **Legal touchpoints (2026-07-05):** every sign-in affordance carries the **clickwrap** line
  ("By signing in, you agree to the Terms of Service and Privacy Policy" — `ClickwrapNotice`,
  rendered under the dual CTA (both hero + bottom), inside `SignInGate`, and in the signed-out
  header at `sm:`+); both sides of `/` render the shared **`Footer`** (five `/legal/*` links +
  operator copyright).
- **Actions:** (logged out) Sign in / Sign up with Discord; (signed in) jump to any campaign, character
  sheet, or a quick action.
- **Nav:** → `/auth/callback` (after OAuth) → back to `/` (now the dashboard); → `/games`,
  `/games/new`, `/rulesets`, `/rulesets/new`, `/games/[gameId]`, character sheets.
- **CX intent:** logged out, communicate the two ways to use HeistMind above the fold (not "play the
  whole game here"); signed in, open to _your_ campaigns + characters, not marketing.

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
  `?ruleset=<id>` to preselect. **Zero rulesets → the built-in catalog renders inline**
  (`StarterCatalogInline`, F37): one click creates an owned copy and the form appears with it
  preselected — no `/rulesets` detour.
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
    **Crew advancement (XP round, F85):** the 8-box track is the same clickable `XpTrack` a
    character sheet uses (GM marks; players see it read-only); marks and the "Take advance
    (reset XP)" spend run through engine `markCrewXp`/`takeCrewAdvance` so both land in the
    campaign log, the advance refuses a non-full track, and a post-advance notice points the GM
    at the crew-ability list.
  - `ClocksPanel` (`apps/web/src/features/clocks/components/ClocksPanel.tsx`) — standalone progress
    clocks (filters out faction-linked clocks); create / tick / untick / delete. GM-editable.
    _(Clocks/Factions/Score panels all show a "Loading …" placeholder before their empty state —
    F74; CrewSheet always did.)_
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
    - timestamp tooltip), annotates resistance ("resisted — N stress"; zero-dice resists ride the
      persisted `zero_dice` flag since audit P2, so the displayed cost matches the sheet), and
      renders non-dice events (downtime / loadout / score / **crew** / **faction** / **clock** /
      **xp** / **harm** / note) with a neutral kind badge. **Every mechanical change reaches the
      feed** (round-3 PR-3 + bot phase-3, via engine use-cases): crew heat/tier/incarceration,
      faction status shifts, a clock **filling** (routine ticks stay panel-only), XP marks/advances,
      and harm taken/cleared — alongside rolls, downtime, loadout, and score lifecycle. _The old
      web exception (F70c — silent track-XP marks) closed in the XP round (F85): every sheet XP
      mark now logs an `xp` event ("Marked N XP — <track>"), and crew XP marks/advances log
      `crew` events._
      Entries are **grouped by score** (newest operation first, under its name); with no scores in
      play it falls back to a flat feed.
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
  loadout**, chosen _per operation as you go_ (BitD: load is not a build/advancement choice, so it
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
  **XP (XP round, F85):** the Experience card's tracks are gold `XpTrack` boxes with accessible
  per-box names; every mark goes through engine `markXp` (feed-logged, "Marked N XP — <track>"),
  and a FULL track grows a **"Take advance"** CTA that opens the editor directly on its
  Advancement tab (scrolled into view) — the spend is one click from where the XP was earned.
- **Role-gating (F42, 2026-07-01):** write affordances mirror the RLS policy — the **owner or the
  campaign's GM** sees the edit controls (rename, edit build, stress tracker, indulge vice, XP
  marking, loadout save); any other member gets a **read-only sheet** (values + trackers visible,
  no dead buttons). Internally the sheet/editor are now thin compositions over shared concept cards
  (`cards/XpTracksCard|GearCard|HarmCard` — one implementation each for view + edit — plus
  `useCharacterAdvancement`); `CrewSheet` got the same card split (`crews/components/cards/`).
- **CX intent:** the common in-play taps (stress, harm, XP, roll, resist, indulge vice) are one-tap on
  the sheet, not buried behind "Edit build"; edits persist across reload. Indulge vice is the
  stress-release half of the FitD pressure loop (MVP downtime).
  **Harm (F65/F43, 2026-07-11):** the Condition card's harm track is live for the owner/GM — a
  "Take harm" row (description + level; RAW escalation past full tracks, with an inline
  "escalated" notice) and click-the-wound-to-clear, both through engine `takeHarm`/`clearHarm`
  (feed-logged, bot parity). The roll panel surfaces the wound's RAW consequences: moderate harm
  auto-applies **−1d** (waivable, noted in the feed), lesser hints reduced effect, severe warns
  "needs help or a push". **Error split (F73, 2026-07-11):**
  a failed inline save (stress, rename, XP, indulge vice) raises a dismissible alert at the top of
  the sheet and leaves it interactive; only a load failure / not-found swaps the page for
  `ErrorDisplay`.
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
  catalog as the no-JSON path. **IP attestation (2026-07-05):** a required checkbox ("I have the
  right to upload this content…") gates the Upload button — the ToS §2 warranty restated at the
  moment it matters — with a muted line linking `/legal/terms` and `/legal/dmca`. (The e2e
  `uploadRuleset` helper checks it for every spec.)
- **Nav:** → `/rulesets` on success.
- _Last verified:_ 2026-07-05 (attestation gate added)

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
  **The built-in catalog is inline** (`StarterCatalogInline`, F37): with zero rulesets it IS the
  page (one click → straight into the wizard, no `/rulesets` detour); with rulesets present it sits
  below the picker as "Add another system". A secondary link offers the JSON upload
  (`/rulesets/new`).
- **Nav:** → `/characters/[id]` on create; → `/rulesets/new` (bring your own).

### `/characters/[characterId]` — Standalone character sheet

- **File:** `apps/web/src/app/characters/[characterId]/page.tsx` — reuses `CharacterSheet`. With no
  campaign, the active-score + shared dice/roll-log sections hide. The **`AttachToCampaign`** card is
  the **owner's campaign-membership control** (shown on both standalone _and_ in-campaign sheets):
  standalone → **"Bring to a campaign"**; in-campaign (Phase 5b) → **"Move to another campaign"**
  (excludes the current one) + **"Return to My Characters"** (detach). Attach/move use
  `attach_character_to_game`, detach uses `detach_character`; both are owner-only, RPC-enforced.

### `/legal/*` — Legal documents (public, six routes)

- **Files:** `apps/web/src/app/legal/{page,terms/page,privacy/page,dmca/page,acceptable-use/page,licenses/page}.tsx`
  — **server components** each exporting per-route `metadata`; prose lives in client components in
  `apps/web/src/features/legal/components/` (`LegalPageLayout` + one `*Content` per document).
- **Purpose:** `/legal` is the hub (five doc cards); `/legal/terms` (UGC ownership + license grant,
  repeat-infringer §512(i) hook, disclaimers/liability cap, governing law); `/legal/privacy` (the
  honest collection list: Discord OAuth profile, game content, Sentry errors; deletion →
  `/settings` + email); `/legal/dmca` (§512(c)(3) notice checklist, designated agent, counter-notice
  - 10–14 day restore, §512(f) warning); `/legal/acceptable-use` (IP rules, decency, no probing);
    `/legal/licenses` (renders `BUILTIN_RULESETS` live — name/license/attribution can't drift — plus
    the CC BY 3.0 attribution paragraph, CC0/CC BY 4.0 notes, not-affiliated disclaimer, MIT note).
- **Copy:** deliberately **not** i18n'd (canonical English legal text behind file-level
  eslint-disable; governing-language clause in the terms). Filled 2026-07-05: effective date
  July 5, 2026; governing law California; contact `legal@heistmind.com`; DMCA agent Trent Jones
  (postal/phone via the Copyright Office directory listing). **Prod promote still requires the
  copyright.gov agent registration to actually exist** (the page claims it).
- **Nav:** public, no auth gate; AppShell chrome is automatic (paths aren't `/` or `/auth/*`).
  Footer links (separate PR) are the discovery path.
- _Last verified:_ 2026-07-05 (placeholders filled; previously feature introduction)

### `/discord` — The bot guide (public, F67)

- **Files:** `apps/web/src/app/discord/page.tsx` (server component + `metadata`) →
  `DiscordGuideContent` (`apps/web/src/features/marketing/components/`) — the legal-page pattern;
  command names/syntax are deliberately literal (they must match the registered commands).
- **Purpose:** the page a GM sends players — what the bot is, a 3-step getting-started (try the
  dice with no account → one web Discord sign-in IS the account link → `/character use` and roll
  from the sheet in a linked channel), and the full command reference (mirrors `/heist help` and
  `packages/discord/README.md`'s table — update the three together).
- **Nav:** public, no auth gate; linked from the landing's play-by-post track ("How the bot
  works →"). On gated prod the route redirects home (only `/` + `/legal/*` stay reachable).
- _Last verified:_ 2026-07-11 (feature introduction — bot-parity round, F67)

### `/settings` — Account settings (self-service deletion)

- **File:** `apps/web/src/app/settings/page.tsx` → `AccountSettings`
  (`apps/web/src/features/profiles/components/AccountSettings.tsx`). Signed-out → `SignInGate`.
- **Purpose:** the account surface: who you're signed in as (Discord), and the **danger zone** —
  permanent account deletion (GDPR/CCPA deletion path; the Privacy Policy points here).
- **Actions:** type-to-confirm deletion — typing the exact confirm word (`DELETE`) arms the
  destructive button. Deletion calls `deleteAccount()` (profiles data seam) → `POST
/api/account/delete` with the session access token as a bearer; the route verifies the token
  server-side (`auth.getUser`), then service-role `auth.admin.deleteUser(callerId)` — the auth
  user cascades through profiles → games/characters/rulesets/rolls. On success: local sign-out +
  redirect `/`. Failures surface inline; the route is creds-guarded (503 without the service key).
- **Nav:** header nav gains a persistent **Settings** link (`navigation.settings`); → `/` after
  deletion.
- **CX intent:** deletion is discoverable but hard to trigger accidentally (confirm word +
  destructive styling); copy states exactly what is removed and that it's unrecoverable.
- _Last verified:_ 2026-07-05 (feature introduction)

### Error & 404 surfaces (every route)

- **Files:** `apps/web/src/app/{error,global-error,not-found}.tsx`.
- **Route errors** (`error.tsx`): a render/data throw below the root layout lands on an i18n'd,
  DS-styled card (_"errors.boundary.title"_ + fallback copy) with a **Try again** button (Next
  re-renders the segment); the error is reported through the telemetry seam. `global-error.tsx` is
  the provider-free last resort for root-layout throws (own `<html>/<body>`, inline-styled, same
  copy via the bare i18n instance).
- **404** (`not-found.tsx`): _"Lost in the shadows"_ + **Back to the lair** → `/`
  (`errors.notFoundTitle` / `errors.backHome`).

_Last verified:_ 2026-07-11 (bot-parity round (F86/F43/F65/F67): harm quick actions + roll
penalties on the sheet, the `/discord` guide page + landing link, and same day the XP round
(F85): sheet XP marks feed-logged via engine markXp, shared
gold `XpTrack` boxes on character + crew tracks, "Take advance" CTA → editor Advancement tab,
crew XP mark/advance through new engine `markCrewXp`/`takeCrewAdvance` (feed-logged, guarded) +
post-advance notice; same day, CX round: F72 SignInGate on all six secondary routes; F73 sheet
error split; F74 hub-panel loading guards; F79 dashboard loading affordances + seeded e2e; F81
Characters nav link; F80 Select/Textarea/Clock/HarmTracker stories + tests; new spec
`signin-gates.spec.ts`; previously 2026-07-05 IP-audit copy reskin (F82): sign-in "First time in the shadows?", scoundrel feature line, game/score name placeholders now Brackwater-flavored — no Duskwall setting names in product copy; same day: full CX audit: RollLog gains the `harm` kind badge + persisted zero-dice resist display, audit P2/P3; web setXp feed exception noted (F70); previously 2026-07-04 landing pbp copy)

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

## Discord surface (the second client)

The bot (`packages/discord`, served by `/api/discord`) is a full gameplay client — creation flows
(characters, campaigns, rulesets) stay web-only. Full command table:
`packages/discord/README.md`; in Discord, `/heist help`. The tiers, by what they need:

- **No account (works in any server/DM via user-install):** `/roll dice:` · `/resist` · `/fortune`
  · `/dice` · `/heist about|help`. Pure compute, nothing stored.
- **Linked account (web sign-in IS the link — `profiles.discord_id`):** `/character use|show|unset`
  (one ACTIVE character, `discord_players` pointer), sheet-rated `/roll action:` (autocomplete over
  the character's own ruleset, `extra`/`push`; **moderate harm auto-applies −1d** — the title shows
  the malus, the note names it, severe adds a needs-help warning — F43), `/stress add|clear`,
  `/harm take|clear` (RAW escalation), `/vice indulge`, `/xp mark|advance` — the sheet commands
  feed-log via the same engine use-cases the web calls.
- **Linked campaign (GM: `/heist link`, scope channel/category/server; precedence in that order):**
  `/roll action:`+`/resist` PERSIST when the roller is a member and their active character crews
  that campaign (embed footer says "Logged to …" or exactly why not); `/log` (attributed,
  score-tagged); `/heist status` (member snapshot).
- **GM, in the linked channel:** `/score start|end` · `/crew heat|tier|incarcerate|xp|advance`
  (advancement XP on the 8-box track — `xp` adds/unmarks clamped marks, `advance` spends a FULL
  track and refuses otherwise, both feed-logged; F86) · `/clock tick` (filling announces "It comes
  to a head!") · `/faction status`. GM-gated INCLUDING autocompletes — campaign state never leaks
  through suggestions.

Failure posture everywhere: public defers that fail authz become delete + ephemeral; non-members
learn nothing (not even the campaign's name). Known gaps: F66 (threads under a category link) is
the last bot gap — F65 (web harm parity) and F67 (docs page: **`/discord`**) closed 2026-07-11.

_Last verified:_ 2026-07-11 (bot-parity round F86: `/crew xp|advance`, harm −1d on `/roll action:`,
help/README updated; previously 2026-07-05 go-live smoke fixed F68 discord_id trigger-link + F69
rulesetActions resolution; residue tracked as F70/F71; phases 0–3 complete #121–#132)

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
   from their sheets (`RollPanel`: action → rating → roll → logged, auto-tagged with the active score). 4. When a consequence lands, the player **resists** (`RollPanel` resistance mode → `6 − highest die`
   stress applied live). 5. GM makes fortune/GM rolls from the hub `RollPanel`. 6. Anything settled **in
   person or on Discord** gets recorded via `AddResultForm` so the log stays complete. 7. All events
   land in `RollLog`, grouped under the score, with who + when (every player sees on reload). 8. GM
   ticks clocks; adjusts crew heat/rep. 9. Players **indulge vice** (downtime) to clear stress. 10. GM
   **ends the score** (`ScorePanel`); award XP on character sheets.

### J4 — Player: level up

1. On the character sheet, mark XP (tracks fill). 2. When the playbook track fills, spend an advance
   (action dot or ability). 3. Sheet updates; track resets.

_Last verified:_ 2026-06-28 @ 78123c1 (J3 updated for score start/end, per-score loadout, off-app result recording)
