# HeistMind — CX & FitD Findings

Flaw + FitD-gap log, per the `cx-map` skill. Severity: **S1** blocker · **S2** major · **S3** minor
· **S4** polish. Type: **CX-flaw** (experience) · **FitD-gap** (rules fidelity). When a fix ships,
flip `status` to `fixed @<sha>` and update the affected `CX-MAP.md` section.

**Audit 1 — 2026-06-25 @ 01594f7.** Exhaustive sweep across all 9 routes, the 5 wizard steps, and
the campaign panels (crew/clocks/factions/rolls), through the UX + FitD lenses in `SKILL.md`.
Findings the maintainer personally re-checked against source are tagged **(verified)**; the rest are
from the audit pass with a cited location and should be re-confirmed before fixing.

Counts: 3 fixed · S1 ×2 · S2 ×16 · S3 ×22 · S4 ×2.

---

## Fixed

### F1 — Empty rating pips become invisible on card hover

- **severity:** S2 · **type:** CX-flaw
- **where:** `packages/ui/src/components/StressTracker.tsx` (`ActionDots` variants) +
  `packages/ui/src/components/Card.tsx:20`
- **root cause:** Empty pips filled with `bg-background-tertiary`; the Card `default` hover was
  `hover:bg-background-tertiary` (and the `character` variant's idle gradient bakes in
  `via-background-tertiary/90`) — same token, so the pip dissolved into the card. Compounding it,
  the pip border `border-primary` shares the exact lightness of `background-tertiary` in both
  themes, so the outline never delineated the pip. Hits every screen with pips in a default/
  character card: `AttributesStep`, `ActionRatingsStep`, `CharacterEditor`, `CharacterSheet`.
- **fix:** Made the empty pip self-delineating — recessed `bg-background-primary` fill + contrasting
  `border-border-secondary` ring (the ring is the load-bearing cue in light mode, the recessed
  fill in dark) — and moved the Card `default` hover off the pip token to `hover:bg-background-elevated`.
- **status:** fixed @24aaa96

### F36 — Ambiguous "Load … starter ruleset" label

- **severity:** S3 · **type:** CX-flaw
- **where:** the ruleset load button + `/rulesets` page
- **root cause:** "Load the Brackwater starter ruleset" didn't say it creates an editable copy you
  own; "load" reads as download/open.
- **fix:** Generalized `LoadDefaultRulesetButton` → `LoadBuiltinRulesetButton({ builtin })` driving a
  built-in catalog; label is now "Add &lt;name&gt; to my rulesets" with a clarifying tooltip.
- **status:** fixed @69180e1

### F35 — Ruleset upload lacked schema/example guidance

- **severity:** S3 · **type:** CX-flaw
- **where:** `apps/web/src/features/rulesets/components/RulesetUpload.tsx`
- **root cause:** The upload form assumed JSON fluency; no outline of the expected shape, no easier
  path for non-authors.
- **fix:** Added a guidance card describing the required/optional `RulesetContent` fields and steering
  users to add a starter from the catalog and edit their copy (no JSON required).
- **status:** fixed @69180e1

---

## S1 — blockers

### F2 — No way for a player to discover or join a campaign

- **severity:** S1 · **type:** CX-flaw · **(verified)**
- **where:** `apps/web/src/app/games/page.tsx:30` (`games.findByCreator(userId)` only); no join /
  browse / invite UI in any `/games` route.
- **root cause:** The campaigns list only queries games you _created_. A `GamePlayer` membership
  model exists in the DB but is never surfaced in the web app, and there's no invite link / join
  code. A player can reach a campaign only via a direct `/games/[gameId]` URL someone hands them,
  and it never appears in their own list — so the core async-multiplayer loop has no front door.
- **fix:** Add an "Invite players" affordance for the GM (shareable link / join code) and a player
  join + "campaigns I'm in" path (query `GamePlayer` memberships, not just `findByCreator`).
- **status:** resolved (PR #59) — `SupabaseInvitationRepository` + `redeem_invite_code` RPC; the
  `/games` hub now lists created **and** joined campaigns with a join-via-code box, and GMs get an
  `InviteCodeSection` code generator. Targeted + public codes. (First-class targeted-invite inbox
  still thin — see F-followups.)

### F3 — Resistance rolls (spend stress to resist a consequence) not implemented

- **severity:** S1 · **type:** FitD-gap
- **where:** `apps/web/src/features/rolls/components/RollPanel.tsx` (only `action`/`fortune`); the
  `RollKind` type already includes `resistance` (`packages/database/src/domain-types.ts`).
- **root cause:** The single most-used non-action move in Blades has no UI and no stress-cost
  (`6 − highest die`) logic; nothing to resist against is captured on a roll.
- **fix:** Resistance mode in `RollPanel` (pick attribute → roll → auto-cost `6 − high` → deduct
  stress); store the consequence + attribute on the `Roll`.
- **status:** resolved (PR #59) — `dice.resistanceStress` (`6 − highest die`, empty ⇒ 6, floored at
  0; unit-tested to 100%); `RollPanel` Resistance mode picks the attribute, rolls, deducts stress via
  `updateCharacterWithValidation`, persists `kind='resistance'`; the log annotates "resisted — N
  stress". (Free-text consequence capture not yet stored — minor follow-up.)

---

## S2 — major

### F4 — Wizard never says _why_ "Next"/"Create" is disabled

- **severity:** S2 · **type:** CX-flaw
- **where:** `CharacterCreationWizard.tsx` footer + `AttributesStep.tsx:36–42` /
  `ActionRatingsStep.tsx:37–42` (over-budget turns a badge red but shows no message).
- **root cause:** Step validity drives the disabled button, but the underlying validation
  error/code (`POINTBUY_OVER`, `ACTION_POINTS_OVER`, incomplete step) is never surfaced as copy.
- **fix:** Render the first blocking validation message inline near the footer / step
  ("You've spent 8/7 action dots — reduce one to continue").
- **status:** resolved (PR #59) — a `stepError(index)` store selector returns the first blocking
  validation message for the current step (whole-build for review); the wizard footer shows it next
  to a disabled Next/Create in `text-semantic-warning` with an i18n'd "Can't continue yet —" lead-in
  (e.g. "Can't continue yet — Assigned 8 of 7 action dots.").

### F5 — Roll log doesn't say who rolled

- **severity:** S2 · **type:** CX-flaw · **(verified)**
- **where:** `apps/web/src/features/rolls/components/RollLog.tsx:42–56` — shows `label ?? kind`,
  results, position/effect, outcome; never resolves `characterId`/`userId`.
- **root cause:** In an async shared feed, "who acted" is essential context and it's simply absent.
- **fix:** Resolve and show the character name (or player/"GM" for fortune rolls) per entry.
- **status:** resolved (PR #59) — `RollLog` resolves `characterId → name` via `characters.findByGame`
  and shows it per entry (fortune → "Fortune", GM otherwise).

### F6 — Roll log has no timestamps

- **severity:** S2 · **type:** CX-flaw · **(verified)**
- **where:** `RollLog.tsx:42–56` — `Roll.createdAt` exists but is never displayed.
- **root cause:** A play-by-post log spanning days/weeks needs chronological anchors.
- **fix:** Show `createdAt` (relative or short absolute) on each entry.
- **status:** resolved (PR #59) — each entry shows a relative time ("just now / 5m / 3h / 2d ago")
  with the absolute timestamp in a `Tooltip` on a `<time>` element.

### F7 — Zero-dice rolls (rating 0) aren't explained

- **severity:** S2 · **type:** CX-flaw
- **where:** `RollPanel.tsx:61–65` computes `zeroDice` (2d, take lowest) but the UI never shows it;
  `RollLog` shows bare results; `Roll` has no `zeroDice` field to persist it.
- **root cause:** A rating-0 roll shows two dice with no "take lowest" note — reads as a bug.
- **fix:** Annotate zero-dice rolls in panel + log ("2d, take lowest"); persist `zeroDice` on `Roll`.
- **status:** partially resolved (PR #59) — the panel now shows a hint when a rating-0 action is
  selected ("No rating in this action — roll 2 dice and take the lowest."). Persisting `zeroDice` on
  the `Roll` + annotating it in the log is still open.

### F8 — Position/effect dropdowns are unexplained jargon

- **severity:** S2 · **type:** CX-flaw
- **where:** `RollPanel.tsx:110–129` — controlled/risky/desperate and limited/standard/great with no
  help text.
- **root cause:** New FitD players can't choose meaningfully without the definitions.
- **fix:** Inline tooltip/legend defining position (safety) and effect (impact).
- **status:** resolved (PR #59) — an ⓘ `Tooltip` beside the effect select defines position
  (Controlled → Risky → Desperate) and effect (Limited → Standard → Great).

### F9 — Push-yourself & Devil's Bargain (+1d) not modeled

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollPanel.tsx` — no pre-roll modifiers; `CreateRollData` has no `stressSpent`.
- **root cause:** Two of the most common dice boosters are unavailable.
- **fix:** Toggles "Push yourself (+1d, 2 stress)" / "Devil's Bargain (+1d)"; add dice, deduct/record
  stress on save.
- **status:** open

### F10 — Teamwork absent (assist / lead group action / set up / protect)

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollPanel.tsx` is single-character only; no roll linking.
- **root cause:** Group play — central to a crew game — has no scaffolding (assist = 1 stress, group
  action, etc.).
- **fix:** Group-action mode linking a lead roll + assist rolls; assisters take stress; mark linked.
- **status:** open

### F11 — Starting abilities can be unchecked

- **severity:** S2 · **type:** FitD-gap
- **where:** `AbilitiesStep.tsx` + `character-creation-store.ts` `toggleAbility` (~207–233).
- **root cause:** Abilities seeded from `playbook.startingAbilities` are removable like any other, so
  a character can be created missing its guaranteed ability.
- **fix:** Lock starting abilities (disable removal, badge them "Starting").
- **status:** open

### F12 — Wizard never collects contacts (friends/rivals)

- **severity:** S2 · **type:** FitD-gap
- **where:** `DEFAULT_STEPS` (`creation-steps.ts`) — `contacts: []` is initialized but no step
  populates it; only editable later in `CharacterEditor`.
- **root cause:** Close friend / rival is part of Blades character identity and is skipped at
  creation.
- **fix:** A contacts step (or extend Identity) picking from the playbook's contacts.
- **status:** open

### F13 — Wizard never sets loadout / starting items

- **severity:** S2 · **type:** FitD-gap
- **where:** loadout is only set in `CharacterEditor`; `emptyDraft` doesn't initialize it.
- **root cause:** Items/load level — needed to actually play a score — aren't part of creation.
- **fix:** A loadout step (choose load level + starting items, show capacity).
- **status:** open

### F14 — Trauma is free text, not the named conditions

- **severity:** S2 · **type:** FitD-gap
- **where:** `CharacterData.trauma: string[]` (`domain-types.ts`); shown as badges
  (`CharacterSheet.tsx:271–281`); not validated against the 8 conditions.
- **root cause:** Blades trauma is a fixed set (Cold, Haunted, Obsessed, Paranoid, Reckless, Soft,
  Unstable, Vicious) chosen, not typed; free text loses meaning + uniqueness.
- **fix:** Enum the conditions; pick from a checklist (unique, up to `traumaMax`).
- **status:** open

### F15 — Downtime actions entirely absent

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollKind` includes `downtime` but no UI/model; no recover / acquire asset / long-term
  project / reduce heat / train / indulge-vice.
- **root cause:** The post-score downtime phase — half the FitD loop, and the only way to clear
  stress (indulge vice) — doesn't exist.
- **fix:** A downtime panel; start with the highest-value actions (indulge vice → clear stress;
  recover → healing clock; reduce heat).
- **status:** partially resolved (PR #59, MVP) — "Indulge vice" on the character sheet clears stress
  to 0 and logs a `kind='downtime'` feed entry (rendered with a neutral badge, no dice). The rest of
  the downtime menu (recover/acquire/long-term project/reduce heat/train) is still open.

### F16 — Flashbacks not modeled

- **severity:** S2 · **type:** FitD-gap
- **where:** no `flashback` roll kind / UI.
- **root cause:** Spend-stress-to-retro-establish is a core player-agency move, especially valuable
  in async play where forward planning is hard.
- **fix:** A flashback action: narrate + stress cost → logged roll linked to the triggering moment.
- **status:** open

### F17 — Crew rep hard-caps at 12 with no rep→tier advancement

- **severity:** S2 · **type:** FitD-gap · **(verified)**
- **where:** `CrewSheet.tsx:187` (`stat('Rep','rep',crew.rep,12)`); the `+` disables at `>= max`
  (`:144`). `CREW_LIMITS` (`crews.ts`) deliberately omits rep.
- **root cause:** Rep should accrue and convert (12 rep → +1 tier, reset rep), not stop at 12. There
  is no conversion path, so crews can't advance tier through play.
- **fix:** Uncap rep; add rep→tier conversion (auto at ≥12 or a GM "Advance tier" button); show the
  rule.
- **status:** open

### F18 — Crew XP / advancement absent

- **severity:** S2 · **type:** FitD-gap
- **where:** `Crew` tracks `crewAbilities` but no XP/triggers/advancement (`crews.ts`,
  `domain-types.ts`).
- **root cause:** Crews don't earn XP or buy upgrades — the crew-sheet progression half of Blades.
- **fix:** Crew XP track + triggers mirroring character XP; spend to unlock crew abilities/upgrades.
- **status:** open

### F19 — Heat→Wanted cascade and reduce-heat unmodeled

- **severity:** S2 · **type:** FitD-gap
- **where:** `Crew.heat`/`Crew.wanted` are bare numbers; no threshold logic; no "lay low".
- **root cause:** Heat filling → +1 wanted, and spending to reduce heat, are core consequences with
  no engine.
- **fix:** Heat-threshold + wanted helpers in `crews.ts`; a reduce-heat downtime action.
- **status:** open

### F20 — Theme system not wired; app is effectively dark-only

- **severity:** S2 · **type:** CX-flaw
- **where:** `apps/web/src/app/layout.tsx` (wraps only `I18nProvider`/`TooltipProvider`);
  `ThemeProvider`/`ThemeToggle` exist in `packages/ui` but are never mounted.
- **root cause:** Without a provider toggling the `.light`/`.dark` class, the light palette in
  `globals.css` is unreachable and there's no user control. _(Note: F1 was fixed to be robust in
  both themes regardless.)_
- **fix:** Mount `ThemeProvider` in the root layout; add `ThemeToggle` to the header. Re-confirm the
  wiring before fixing.
- **status:** open

### F21 — Header/nav overflows on mobile

- **severity:** S2 · **type:** CX-flaw
- **where:** `apps/web/src/features/auth/components/AuthHeader.tsx:36–59` — `Stack direction='row'`
  with no responsive collapse.
- **root cause:** Campaigns / Rulesets / username / sign-out wrap awkwardly under ~640px.
- **fix:** Responsive collapse to a menu under a breakpoint.
- **status:** open

### F22 — No breadcrumbs / secondary nav across deep routes

- **severity:** S2 · **type:** CX-flaw
- **where:** app shell — only top-level links in `AuthHeader`.
- **root cause:** games → campaign → character → sheet has no in-app way back up a level; users lean
  on the browser back button.
- **fix:** Breadcrumb (or campaign-context sub-nav linking Crew/Clocks/Factions/Characters).
- **status:** open

---

## S3 — minor

- **F23** · CX · Sheet attributes are a creation-time snapshot, not re-derived from current action
  ratings; the editor still exposes them as directly editable (dead data, since the validator skips
  attribute caps in action mode). `CharacterSheet.tsx:146`, `CharacterEditor.tsx` (~231–250),
  `character-rules.ts` (~337). **(verified)** → derive on the sheet; hide/lock attributes in
  action-rating mode. **open**
- **F24** · CX · ActionRatingsStep doesn't explain attributes are _derived_ (count of actions ≥1).
  `ActionRatingsStep.tsx:34,50–52` → one-line helper text. **open**
- **F25** · CX · Playbook cards show only name+description — no stat/ability preview to choose on.
  `PlaybookStep.tsx:42–56` → show starting abilities/actions on the card. **open**
- **F26** · CX · Starting vs optional abilities aren't visually distinguished. `AbilitiesStep.tsx`
  (`roster` vs `others` rendered identically) → a "Starting"/section header. **open**
- **F27** · CX · Re-selecting a playbook silently resets abilities/attributes.
  `character-creation-store.ts:135–154` `setPlaybook` → warn/confirm before reset. **open**
- **F28** · CX · Cancelling the wizard gives no "draft saved" reassurance (it _is_ persisted).
  `CharacterCreationWizard.tsx:123–124` → confirm + reassure copy. **open**
- **F29** · CX · Required name field has no visual required indicator.
  `CharacterCreationWizard.tsx:83` → asterisk/marker. **open**
- **F30** · FitD · Clock completion isn't visually indicated; 4/4 looks like 3/4. `clockComplete()`
  in `clocks.ts` is never called by `ClocksPanel.tsx` → render a complete state. **fixed @4b7343e
  (PR #59)** — full clocks show a "Complete" badge + glow.
- **F31** · CX · Roll-log shows `risky/` (trailing slash, empty effect) when position is set but
  effect isn't. `RollLog.tsx:49`. **(verified)** → only join when both exist. **fixed @4b7343e
  (PR #59)** — position/effect now joined with a slash only when both are present.
- **F32** · CX · Game `state` (draft/recruiting/active/paused/completed) is shown as a badge with no
  legend and no way to change it. `games/page.tsx:81` → lifecycle control + tooltip. **open**
- **F33** · CX · Crew `hold` (strong/weak) shown + toggle with no explanation. `CrewSheet.tsx:172–182`
  → tooltip. **fixed @4b7343e (PR #59)** — hold has an explanatory tooltip (strong = stable, weak =
  one setback from breaking up).
- **F34** · CX · Faction tier (0–6) and status (−3..+3) caps aren't labelled; buttons just disable at
  the ends. `FactionsPanel.tsx:190–246` → show "Tier x/6", a status legend. **fixed @4b7343e
  (PR #59)** — tier now labelled "Tier n/6" and status carries a −3..+3 legend tooltip.
- **F35** · CX · Ruleset upload gave no schema/example guidance; validation errors assumed JSON
  fluency. Added a guidance card outlining the required/optional shape + pointing to the starter
  catalog as the no-JSON path. `RulesetUpload.tsx`. **fixed @69180e1**
- **F36** · CX · "Load the Brackwater starter ruleset" label was ambiguous (load? download? copy?).
  Now "Add &lt;name&gt; to my rulesets" with a clarifying tooltip, across the whole built-in catalog.
  `LoadBuiltinRulesetButton.tsx`. **fixed @69180e1**
- **F37** · CX · No first-run onboarding: a new signed-in user with no rulesets/games gets no guided
  next step. `app/page.tsx`, `/rulesets` empty state → an authed CTA / 1-2-3 path. **open**
- **F38** · CX · Landing doesn't convey the async play-by-post value prop or FitD specifics.
  `app/page.tsx:28–34` → messaging + an "async play" feature. **fixed (PR #59)** — hero + the three
  feature cards + CTA now lead with async, Discord-style play-by-post (rulesets, shared rolls/clocks/
  crews, join codes, downtime); copy stays in the existing `pages.landing.*` keys.
- **F39** · CX · Auth-gated pages show sparse "Please sign in" text with no CTA. `games/page.tsx`,
  `rulesets/page.tsx`, `games/new` → styled empty state + Sign-in button. **fixed @PR59 (games +
  rulesets)** — the auth gate is now a `Card` with a heading, a value-prop line, and a "Sign in with
  Discord" button (`signInWithProvider('discord')`); `games/new` still bare.
- **F40** · CX · Auth-callback errors auto-redirect after ~2s (hard to read) and home doesn't surface
  `?error=auth_failed`. `auth/callback/page.tsx:29–46` → longer/explicit retry + a home banner.
  **open**
- **F41** · CX · No skip-to-main link; sticky header makes keyboard users tab through all nav.
  `packages/ui/src/components/Header.tsx` → skip link + `id="main-content"`. **open**
- **F42** · CX · Sheet doesn't distinguish GM vs player edit affordances (controls shown regardless;
  RLS blocks server-side, but the UI invites dead actions). `CharacterSheet.tsx`, `CharacterEditor.tsx`
  → gate interactive controls by role/ownership. **open**
- **F43** · FitD · Harm penalties (−1d / reduced effect at moderate, incapacitated at severe) aren't
  applied or surfaced on rolls. `RollPanel.tsx` has no harm input → show harm + default
  effect/limit. **open**
- **F44** · FitD · Armor has no mechanical effect (harm reduction / heavy −1d). loadout carries armor
  but rolls/harm ignore it → "spend armor" to reduce harm; heavy-armor note. **open**
- **F45** · FitD · Load level is character-static, not chosen per score. `CharacterLoadout.level` is
  baked in → allow per-score load choice when a score/heist entity exists. **open**
- **F46** · FitD · Fortune rolls lack structured types (engagement / gather-info / situation) and
  tiered readouts. `RollPanel.tsx:131–143` → a fortune-type selector + interpretation. **open**
- **F47** · FitD · Faction projects/clocks and the war state (status −3) aren't surfaced; `Clock`
  already supports `linked*`. `FactionsPanel.tsx` → link faction clocks; show "at war". **open**
- **F48** · FitD · Contacts have no mechanical tie-in (bonds/leverage/"call on a contact").
  `domain-types.ts` contacts + `CharacterSheet.tsx:369–407` display only → optional contact-aid hook.
  **open**
- **F49** · FitD · Indulge-vice (clear stress) has no affordance even though vice is captured.
  `CharacterEditor.tsx:220–223` vice input only → an "Indulge" action (ties into F15 downtime).
  **open**
- **F50** · FitD · Ability tier-gating has no advancement path (creation gates tier ≥2; a TODO notes
  crew-tier gating is unimplemented). `character-rules.ts:~154` → re-evaluate unlocks at play time.
  **open**
- **F51** · FitD · No score/heist entity grouping a job's rolls/clocks/downtime; rolls append to one
  global game log. → an optional Heist/Score aggregate (planning → active → downtime). Larger future
  work; noted so it isn't mistaken for "covered". **open**
- **F52** · CX · No post-roll consequence scaffolding (a partial/bad result doesn't prompt the GM to
  tick a clock / add heat / harm). `RollPanel.tsx:149–155` → a "consequences" quick-action card
  linked to the roll. **open**
- **F55** · scope · Popular FitD games not yet offered as built-ins because the engine can't model
  their distinctive mechanics. The built-in catalog (`packages/shared/src/builtin-rulesets/`) ships
  Brackwater + Blades in the Dark (drop-in) + Wicked Ones (dungeon-as-crew + `crew.resourcePools`).
  Deferred, each needing real engine work: **Scum & Villainy / Beam Saber** (ship/mech as crew type
  works, but they're Evil Hat-protected content → need original reskins + the gambit pool, already
  enabled by `resourcePools`); **Band of Blades** (a Legion _roster_ of many soldiers — breaks the
  one-crew/one-PC model); **Girl by Moonlight** (transformation/eclipse + promises — no
  `CharacterData`/roll-loop home); **The Wildsea** (non-FitD dice: count 6s, no position/effect);
  **Slugblaster** (Style/Stuff/Bull token economy). The major-gap items co-require open roll-loop
  findings (F3, F9, F10, F14, F15). Treat each as its own future epic, not a data-only add. **open**

---

## S4 — polish

- **F53** · CX · ActionRatingsStep badge repeats the attribute name ("Insight" header + "Insight 2"
  badge). `ActionRatingsStep.tsx:51` → show just the number. **open**
- **F54** · CX · Wizard name/identity inputs use fixed pixel `maxWidth` (460/480) rather than a
  responsive max. `CharacterCreationWizard.tsx:80`, `IdentityStep.tsx:87` → `w-full max-w-[...]`.
  **open**

---

## Themes worth a dedicated pass

- **Async play-by-post is the product, but the shared feed is thin** (F2, F5, F6, F7) — joining,
  attribution, and timing are exactly what async multiplayer needs first.
- **The roll loop is a single basic action roll** (F3, F8, F9, F10, F16, F43, F52) — resistance,
  modifiers, teamwork, and consequences are the substance of Blades play.
- **Progression is half-built** (F17, F18, F19, F50) — characters advance; crews/factions largely
  don't.
- **Explainability** (F8, F24, F30, F32, F33, F34) — many mechanics are present but opaque to a
  newcomer; targeted help text is cheap and high-leverage.
