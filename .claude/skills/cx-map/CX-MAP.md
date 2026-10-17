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
"© {year} HeistMind, operated by Trent Jones"). **The header is one compact row at every width
(F93, ≈60px):** the brand is a link home (not an h1 — each page owns its h1); signed in, the nav
(`<nav aria-label="Main">`) shows from `lg`, and below `lg` a **menu button** (disclosure:
`aria-expanded`, focus into the panel, Escape / outside click / navigation close) opens a panel
with Campaigns/Characters/Rulesets/Settings, the welcome line, language and Sign out. Signed out,
phones get one short "Sign In" button; the **clickwrap** line (`ClickwrapNotice`, `sm:`+ only —
page-level notices cover phones) sits just under the header, outside the sticky row. The shell is
a full-height column (`min-h-dvh`): `main` grows so the footer sits at the bottom of short pages,
with a consistent `pt-6 sm:pt-10` under the header; breadcrumbs align to each route's own column.
The theme class is set on `<html>` by an inline pre-paint script (no dark flash for light users). The shell steps aside on `/`
(marketing hero owns its header) and `/auth/*` (transient callback), which render their own
full-screen layouts — so `HomePage` and `Dashboard` mount the same `Footer` themselves.

**Signed-out gate (F39/F72, complete as of 2026-07-11):** every auth-required route — primary
(`/games`, `/rulesets`, `/characters`, `/settings`, `/games/[id]`) **and** secondary (`/games/new`,
`/games/[id]/characters/new`, `/games/[id]/characters/[id]`, `/characters/new`,
`/characters/[id]`, `/rulesets/new`) — renders `SignInGate` (heading + prompt + a working Discord
sign-in button + clickwrap) instead of a dead-end text prompt. Pinned by
`e2e/specs/signin-gates.spec.ts`. Until the persisted auth hint has been read (post-mount — see
below) the gate shows a neutral spinner, so a returning signed-in user never sees a sign-in flash.

**Server rendering + hydration (F90, 2026-10-17):** every route server-renders its real content.
i18next initializes **synchronously** with the bundled English catalog (`lib/i18n/index.ts`,
`initAsync: false`), so `I18nProvider` renders children immediately — there is no client
"preparing the shadows" gate any more (it used to hold every page, so the HTML of `/`, `/discord`,
`/legal/*` and the 404 was just a raw `common.loading.preparingShadows` key). A saved non-English
language is applied after hydration. The persisted auth store (`auth-store`) hydrates **after
mount** (`skipHydration` + `rehydrateAuthStore()` in `AuthListener`'s layout effect): server HTML
and the first client render are always signed-out (no hydration mismatch); the persisted slice is
only a display hint (`sessionChecked` is no longer persisted, so every boot re-validates the
session). Auth + repositories share **one** Supabase client (`lib/auth`, no more "Multiple
GoTrueClient instances"), and sign-out clears the React Query cache. Pinned by
`e2e/specs/ssr-hydration.spec.ts` (raw-HTML copy checks + no React hydration error, anonymous and
for a returning signed-in GM).

**Metadata, indexing, headers (F90):** root `layout.tsx` sets the brand title/description, a
`%s · HeistMind` title template, `summary_large_image` Twitter card, and `metadataBase` from the
deployment's own `SITE_URL` (`lib/site.ts`); there is **no root canonical** (it used to point every
page at `/`). Public pages (`/`, `/discord`, `/legal/*`) set their own title/description/canonical
and OG/Twitter text via `publicPageMetadata`; app sections get titles from per-segment server
`layout.tsx` files (Campaigns, Characters, Rulesets, Settings, …) and are `noindex`. The link-preview
card is `app/opengraph-image.tsx` / `app/twitter-image.tsx` (next/og, ember/crimson/gold on noir).
`app/robots.ts` + `app/sitemap.ts`: production on its canonical host (`www.heistmind.com`) allows
the public pages and lists them in the sitemap; **beta, previews, local and non-canonical prod
hosts are `noindex`** (root `robots` metadata + `X-Robots-Tag` from middleware + disallow-all
robots.txt, empty sitemap). `next.config.ts` sends nosniff, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a minimal `Permissions-Policy`, and (prod
builds) a CSP built from the env (self + Supabase https/wss + the Sentry ingest host; vercel.live on
previews; `frame-ancestors 'none'`; `script-src` keeps `'unsafe-inline'` for Next's inline
bootstrap).

---

## Routes

### `/` — Home (marketing when logged out, dashboard when signed in)

- **Coming-soon gate (prod holding page):** `COMING_SOON` (`apps/web/src/lib/coming-soon.ts`,
  ships on **both** `development` and `main`) resolves `NEXT_PUBLIC_COMING_SOON` first (`1`/`true`/
  `on` forces it on anywhere, `0`/`false`/`off` forces it off), else defaults to
  `VERCEL_ENV === 'production'` — so with no flag set (today's infra) only the prod deployment is
  gated and beta (a Vercel preview), previews, local and CI are un-gated. **Launch = set
  `NEXT_PUBLIC_COMING_SOON=0` on the Vercel production target** (`RTrentJones.dev`
  `infra/heistmind.tf`) and redeploy — no code revert, nothing for a later promote to undo. When
  gated: `page.tsx` renders `<ComingSoon/>` at `/`, `middleware.ts` redirects every route except
  `/`, `/legal/*` and `/__version` (the deploy-identity JSON the Greenlight verify gate reads,
  rewritten to `app/api/version`) back to `/`, and `AuthHeader` omits its signed-out sign-in buttons — so there
  is no login anywhere on prod. Discord/API routes and the static/metadata files (icons, webmanifest,
  OG/Twitter images, robots/sitemap) are excluded from the matcher and keep working;
  legal pages stay live (registered DMCA agent page). `NEXT_PUBLIC_VERCEL_ENV` is mapped from
  `VERCEL_ENV` in `next.config.ts` so the client bundle agrees with the server/edge. The public
  specs (home, auth-discord, auth-callback) are gate-tolerant via `e2e/support/coming-soon.ts` so
  the prod post-deploy verify stays green.
- **File:** `apps/web/src/app/page.tsx` — a **server component** (exports the per-route `metadata` —
  the real `<title>`/description for the one public URL) that renders
  `<HomeSwitch marketing={<HomePage/>}/>`; `HomeSwitch`
  (`features/marketing/components/HomeSwitch.tsx`, client) does the auth branch:
  `isAuthenticated ? <Dashboard/> : marketing`. Signed-out is the prerender state, so the marketing
  page arrives as server-rendered HTML (true since F90 — before, the i18n gate meant the HTML was
  only a loading key). `AppShell` steps aside on `/`, so each side renders its own `AuthHeader` +
  `<main>`. Metadata: absolute brand title + description, canonical `/`, OG/Twitter card.
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
- **Dashboard states (F91, 2026-10-17):** each section (campaigns / characters / recent activity)
  has its own loading → error (Try again) → empty; Recent activity stays loading across the
  per-campaign fan-out, so "No recent activity" never flashes before the rows (the F79 residue);
  activity titles and playbooks are translated/named.
- _Last verified:_ 2026-10-17 (F91)

### `/auth/callback` — OAuth return

- **File:** `apps/web/src/app/auth/callback/page.tsx`
- **Purpose:** handles the Discord OAuth redirect; waits for auth state, then redirects.
- **Actions:** none (automatic). Shows a loading state, or an error on failure/timeout. The
  `useSearchParams` reader sits in a `<Suspense>` whose fallback is the same "completing sign-in"
  card, so the route prerenders (title "Signing in · HeistMind", noindex).
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
    heat, wanted, hold, crew abilities, claims, cohorts, coin/vault. GM-editable. **Development is
    RAW (F92, correcting F17):** Rep caps at the tracker length (12 − held turf, no carry); with a
    full tracker the GM button reads **"Strengthen hold (spend full Rep)"** on weak hold (→ strong,
    free) or **"Advance to Tier N (pay X coin)"** on strong hold (new Tier × 8 coin, halved by a
    Patron-style crew ability, paid from coin then vault; → Tier +1, Rep 0, hold weak) — disabled
    with a "needs X coin" hint when the crew can't pay. The hold tooltip states the RAW. Also renders any
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
    status (−3..+3, labelled per the SRD: War · Hostile · Interfering · Neutral · Helpful · Friendly
    · Allies — F92) and their project clocks. GM-editable.
  - `ScorePanel` (`apps/web/src/features/scores/components/ScorePanel.tsx`) — the **score / operation
    lifecycle**. A campaign runs as a series of scores (the per-operation unit per-score loadout hangs
    off); the GM **starts** one (at most one active at a time) and **ends** it, with the most recent
    completed scores listed. Start/end are logged to the campaign feed as `score` events. Sessions are
    real-life and not modelled. Players see the active score read-only.
  - `RollPanel` + `AddResultForm` + `RollLog` (`apps/web/src/features/rolls/components/`). `RollPanel`:
    action / fortune / GM **and resistance** rolls — resistance mode picks the resisted attribute,
    rolls, and deducts `6 − highest die` stress from the character. The action roll's **Push** and
    **Devil's bargain** boxes are one-or-the-other (ticking one clears the other — RAW "you can't get
    dice for both"); an assist is a separate +1d, so the pool tops out at +2d (F92). **`AddResultForm`**: record a
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
- **Launch-review round (F91, 2026-10-17):** the roster, invite codes and campaign log each show
  **loading → error (Try again) → empty** distinctly (no "No characters yet"/"No codes" flash, no
  vanishing log); "game not found" links back to `/games`; the GM state select is translated and
  toasts on failure, and a draft/recruiting campaign flips to **Active** when its first score
  starts. **Two-click confirms** on remove clock, delete faction and end score. Clock/faction/crew
  steppers stay disabled until the written row is in the cache (no swallowed double-click ticks).
  Join-code, new clock, add faction, start score and "What happened" are real forms (Enter
  submits). The log translates outcomes / kinds / position-effect, puts the meta line
  (who · dice · position/effect) on its own line without a leading "·", and roster playbooks show
  their names, not ids.
- _Last verified:_ 2026-10-17 (F91 launch-review frontend round)
- **Role:** GM edits campaign objects; players read them.
- **CX intent:** read-only state should be visibly read-only for players; the hub should be
  scannable, not an undifferentiated wall of panels.

### `/games/[gameId]/characters/new` — Character creation wizard

- **File:** `apps/web/src/app/games/[gameId]/characters/new/page.tsx`
- **Components:** `CharacterCreationWizard`
  (`apps/web/src/features/characters/components/CharacterCreationWizard.tsx`) → `WizardStep`
  dispatcher → step components (see **Wizard** below). Layouts: `?layout=single` (default) or
  `?layout=rail` (step rail + live summary).
- **Actions:** name; step through Back/Next or step badges; Create on the final step. **Stepper
  (F93):** an ordered list (`<nav aria-label="Creation steps"><ol>`, `aria-current="step"`) of
  pills — current (brand), complete (green ✓, only steps already passed that validate), needs
  attention (amber !, passed but invalid), not started (outline); each carries an sr-only status.
  The step title is the page h1. Back is disabled (visibly — 50% + not-allowed) on step 1; a
  blocked Next/Create is visibly disabled too. A disabled
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
  "needs help or a push". **Spend armor (F44, backlog round E):** while the current-score loadout
  carries unspent armor, the harm quick-row shows an armed **"Spend armor (n left)"** toggle — the
  next take lands ONE level lighter (lesser is absorbed outright, with an "glanced off" notice),
  the armor box is consumed for the score (refreshed by a fresh loadout), and the feed carries
  the lightened level. Bot parity: `/harm take` has an `armor` boolean. **Derived attributes
  (F23, backlog round E):** on action-rating rulesets the header card's attributes are DERIVED
  live from action dots (all shown, 0 included, with a "derived from action ratings" note), the
  editor shows them locked (raise via Advancement), and **resistance rolls the attribute** (RAW)
  — the roll panel's resist select lists the attributes, not actions. **Phone-first (F57):**
  below `sm` the sheet reorders (flex `order-*`) to name → Condition → Dice/log →
  XP/loadout/gear → abilities → campaign controls (editor pinned last), a fixed **thumb bar**
  (nav "Sheet sections": Condition · Dice · XP & gear) jumps to the section anchors, and the
  stress pips / action dots grow to thumb size (32px / 24px). Covered by
  `e2e/specs/mobile-sheet.spec.ts` at 390×844. **Error split (F73,
  2026-07-11):**
  a failed inline save (stress, rename, XP, indulge vice) raises a dismissible alert at the top of
  the sheet and leaves it interactive; only a load failure / not-found swaps the page for
  `ErrorDisplay`.
  **Stress → trauma (F92, RAW):** marking the LAST stress box — from the tracker, a push, an
  assist, a resist, or a flashback — resets stress to 0 and owes a trauma condition (never a
  silent clamp); the feed logs "<name> marked their last stress box — trauma!". The sheet shows a
  **"choose the trauma condition"** prompt (`cards/TraumaPrompt.tsx`: a select over the ruleset's
  unmarked conditions + "Mark trauma", feed-logged). At the trauma limit a **must-retire banner**
  shows (retire, or take the fall) and the feed logs it; status is never changed automatically.
  The tracker lengthens with ability stress boxes (BitD Survivor). **Advancement (F92):** the
  editor's ability list offers your playbook's roster plus other playbooks' abilities only while a
  Veteran slot is free (own Veteran, or a crew grant — F62); the rest are summarised as "N more
  need a free Veteran slot". The repository refuses the same picks server-side.
- **Launch-review round (F91, 2026-10-17):** the character name is the page **h1**; status and
  playbook render translated/named. Stress clicks and XP marks patch only their own field onto the
  LIVE row (engine `setStress` / `markXp`); the build editor saves a **field-level patch** of what
  the player changed and refuses with a "changed elsewhere — reloaded" notice if a field it edited
  also changed underneath (no more reverting the GM's harm/XP). Trackers disable while a save is in
  flight. Clearing a wound (sheet box or editor ×) is a **two-click confirm**. The **Roll panel is
  only offered to someone who can edit** the character (owner/GM); read-only viewers keep the log.
  The newest roll result is announced via an `aria-live` region; the rename row is a real form.
- _Last verified:_ 2026-10-17 (rules-accuracy round F92: stress→trauma prompt + retire banner,
  Veteran-gated advances; F91 launch-review frontend round; previously 2026-07-11 backlog rounds E+F)
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
- **360px (F91, 2026-10-17):** the long "Add … to my rulesets" CTAs and the list rows wrap instead
  of running past a phone viewport (also on `/characters/new` and `/games/new`, which embed the
  catalog); a load error offers Try again. `e2e/specs/mobile-overflow.spec.ts` checks every route at 360px.
- _Last verified:_ 2026-10-17 (F91)

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
- **Metadata (F90):** titles render as "Terms of Service · HeistMind" etc. (template), each with
  its own canonical + OG/Twitter text + the shared card image; the document text is in the
  server-rendered HTML.
- _Last verified:_ 2026-10-17 (F90: server-rendered copy, per-page canonical/OG; previously
  2026-07-05 placeholders filled)

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
- **Metadata (F90):** "The Discord play-by-post bot · HeistMind", own canonical + OG/Twitter text;
  the guide is in the server-rendered HTML (link unfurls and crawlers see it).
- **Layout (F93):** the command reference is a single `<dl>` — stacked cards (command, then
  labelled Needs / Does) below `md`, a 3-column table-like grid from `md`; nothing scrolls sideways.
- _Last verified:_ 2026-10-17 (F90 SSR + metadata; F93 responsive command reference; previously
  2026-07-11 feature introduction — bot-parity round, F67)

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
  (`errors.notFoundTitle` / `errors.backHome`) — server-rendered with a 404 status and `noindex`
  since F90 (it used to SSR the raw loading key under the stale root title).
- **F91 (2026-10-17):** the 404, route-error, sign-in-gate, auth-callback and wizard-step titles
  are the page's `<h1>` (kept visually at h2 size); in-page `Alert`s use `role="alert"` only for
  errors (hints/warnings are polite `status`).

_Last verified:_ 2026-10-17 (F90: every route server-renders real content — i18n gate removed,
post-mount auth-store hydration, per-page metadata + OG card, robots/sitemap, security headers,
env-flag coming-soon gate). Previously 2026-07-11 (backlog rounds A+B: GM campaign-state Select on the hub (F32); home
surfaces auth errors as a dismissible banner (F40); faction WAR callout at −3 (F47); zero-dice
rolls annotated in the log (F7 closed); wizard playbook-switch + cancel are two-click with
draft-saved reassurance (F27/F28); catalog flags owned copies, picker blurbs, standalone-sheet
banner, vice two-click confirm, duplicate toast, friendly panel errors (F60); badge/width polish
(F53/F54); stale F49/F50/F51 closed on verification. Same day, bot-parity round
(F86/F43/F65/F67): harm quick actions + roll
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

1. **Playbook** — `steps/PlaybookStep.tsx`. Card grid of playbooks (the selected card gets a brand
   ring + a green "✓ Selected" badge, F93); selecting one seeds skills,
   starting abilities, and attributes (or derives them in action-rating mode). _Valid when a
   playbook is chosen._
2. **Attributes** _(point-buy rulesets)_ — `steps/AttributesStep.tsx` — allocate dots per attribute
   within a budget. **or** **Action ratings** _(action-rating rulesets, e.g. Brackwater)_ —
   `steps/ActionRatingsStep.tsx` — allocate dots per action; the attribute rating is **derived**
   (count of actions ≥1) and shown live; per-action + total-dot caps enforced, and **the playbook's
   pre-placed dots are a floor** (RAW: "three action dots already placed" — they can't be clicked
   below their seed; the validator refuses `ACTION_BELOW_PLAYBOOK`). _Valid when the allocation
   respects caps/budget._
3. **Special abilities** — `steps/AbilitiesStep.tsx`. Cards leading with the chosen playbook's
   roster, hiding other playbooks' behind a "show more" toggle; abilities can be locked (prerequisite
   / limit reached / **"Needs a free Veteran slot"**); shows name + rules text (+ tier where a
   custom ruleset defines one — the BitD builtin has none). **Other playbooks' abilities are
   non-selectable unless a Veteran slot is free (rules-accuracy round, F92):** pick the playbook's
   own **Veteran** ability and exactly ONE other-playbook ability opens beside it (swapping Veteran
   back out drops it). When the choice **limit is 1** (BitD canon — the playbook seeds the suggested
   pick) the roster picker is **radio-style**: clicking a different unlocked roster ability _swaps_
   to it, the current pick can't be unclicked to zero. With limit > 1 it's a multi-select that
   disables the rest once full. _Valid at or under the choice limit (+1 per Veteran, cross-playbook
   only)._
4. **Identity** — `steps/IdentityStep.tsx`. Either a card picker (if the step defines options for
   heritage/background/vice) or free-text inputs. _Always valid (optional)._
5. **Review** — `steps/ReviewStep.tsx`. Read-only summary via `use-character-summary.ts`. _Valid
   only if name is non-empty, a playbook is chosen, and `validateCharacter(mode:'creation')`
   passes._ "Create character" submits via
   `getRepositories().characterManagement.createCharacterWithValidation`.

_Last verified:_ 2026-10-17 (rules-accuracy round F92: Veteran-gated other-playbook abilities,
pre-placed dot floor; F93 stepper statuses + selected-playbook / derived-attribute badges; previously
2026-06-27 @ 2535b31)

---

## Discord surface (the second client)

The bot (`packages/discord`, served by `/api/discord`) is a full gameplay client — creation flows
(characters, campaigns, rulesets) stay web-only. Full command table:
`packages/discord/README.md`; in Discord, `/heist help`. The tiers, by what they need:

- **No account (works in any server/DM via user-install):** `/roll dice:` · `/resist` · `/fortune`
  · `/dice` · `/heist about|help`. Pure compute, nothing stored.
- **Linked account (web sign-in IS the link — `profiles.discord_id`):** `/character use|show|unset`
  (one ACTIVE character, `discord_players` pointer), sheet-rated `/roll action:` (autocomplete over
  the character's own ruleset, `push` **or** `bargain` (never both — RAW) plus `assist`, so at most
  +2d (F92, replacing the old 0–3 `extra`); **moderate harm auto-applies −1d** — the title shows
  the malus, the note names it, severe adds a needs-help warning — F43), `/stress add|clear`,
  `/harm take|clear` (RAW escalation; `armor:true` spends a carried armor box so the harm lands
  one level lighter — lesser is absorbed outright, no armor phrases the refusal — F44),
  `/vice indulge`, `/xp mark|advance` (the `advance` autocomplete offers only LEGAL picks —
  roster, or other playbooks' while a Veteran slot is free — F92) — the sheet commands
  feed-log via the same engine use-cases the web calls. A stress cost that marks the last box
  (`/stress add`, a pushed `/roll`, a persisted `/resist`) replies with the trauma prompt and a
  link to the web sheet to pick the condition (+ "must retire" at the limit).
- **Linking (F89):** `/heist link` needs the campaign's GM (creator) AND the Discord member's own
  **Manage Channels** (channel/category scope) or **Manage Server** (server scope) — otherwise an
  ephemeral "needs the … permission" refusal. `/heist unlink` needs the same permission for the
  link's scope, plus GM — or Manage Server, so a server admin can clear a campaign squatting their
  server. Link columns are bot-only (not writable from the web/REST).
- **Linked campaign (GM: `/heist link`, scope channel/category/server; precedence in that order):**
  `/roll action:`+`/resist` PERSIST when the roller is a member and their active character crews
  that campaign (embed footer says "Logged to …" or exactly why not); a persisted `/resist` rolls
  the named attribute's rating **from the sheet** (`attribute:` required there; a typed `dice:` only
  drives the display-only form — F92); `/log` (attributed,
  score-tagged); `/heist status` (member snapshot).
- **GM, in the linked channel:** `/score start|end` · `/crew heat|tier|incarcerate|xp|advance`
  (`heat` takes −9..+9 — negative reduces heat; `tier` develops RAW: weak hold → strong, or pay
  new Tier × 8 coin with refusals phrased — F92)
  (advancement XP on the 8-box track — `xp` adds/unmarks clamped marks, `advance` spends a FULL
  track and refuses otherwise, both feed-logged; F86) · `/clock tick` (filling announces "It comes
  to a head!") · `/faction status`. GM-gated INCLUDING autocompletes — campaign state never leaks
  through suggestions.

Failure posture everywhere: public defers that fail authz become delete + ephemeral; non-members
learn nothing (not even the campaign's name). **No bot known-gaps remain:** F66 (threads under a
category link) closed via the app's first bot-token fetch — a thread whose parent channel is only
CATEGORY-linked now resolves (best-effort; no `DISCORD_BOT_TOKEN` → the old "not linked"); F65
(web harm parity) and F67 (docs page: **`/discord`**) closed 2026-07-11.

_Last verified:_ 2026-10-17 (F89 security round: link/unlink Discord-permission gates, GM = campaign
creator; rules-accuracy round F92: `/roll` push|bargain + assist, sheet-rated `/resist`, legal-only
`/xp advance`, RAW `/crew tier`, negative `/crew heat`, trauma replies);
previously 2026-07-11 (rerun round: F66 thread-category link retry + signed `/crew xp|advance`
e2e (Act 3.7); same day bot-parity round F86: `/crew xp|advance`, harm −1d on `/roll action:`,
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
   stress applied live). 5. **Anyone** rolls fortune from the hub `RollPanel` (deliberately
   member-open — F77 decided for bot parity: `/fortune` is open to everyone while `/log` stays
   member-gated; the section copy now says so). 6. Anything settled **in
   person or on Discord** gets recorded via `AddResultForm` so the log stays complete. 7. All events
   land in `RollLog`, grouped under the score, with who + when (every player sees on reload). 8. GM
   ticks clocks; adjusts crew heat/rep. 9. Players **indulge vice** (downtime) to clear stress. 10. GM
   **ends the score** (`ScorePanel`); award XP on character sheets.

### J4 — Player: level up

1. On the character sheet, mark XP (tracks fill). 2. When the playbook track fills, spend an advance
   (action dot or ability). 3. Sheet updates; track resets.

_Last verified:_ 2026-06-28 @ 78123c1 (J3 updated for score start/end, per-score loadout, off-app result recording)
